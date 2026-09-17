use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileMetadataItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub extension: String,
    pub kind: String,
    pub last_modified: String,
    pub days_old: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DuplicateGroup {
    pub id: String,
    pub file_size: u64,
    pub total_wasted_size: u64,
    pub items: Vec<FileMetadataItem>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FinderScanResult {
    pub large_files: Vec<FileMetadataItem>,
    pub duplicate_groups: Vec<DuplicateGroup>,
    pub old_files: Vec<FileMetadataItem>,
    pub total_large_size: u64,
    pub total_duplicate_wasted_size: u64,
    pub total_old_size: u64,
}

fn get_home_dir() -> PathBuf {
    PathBuf::from(std::env::var("HOME").unwrap_or_else(|_| "/Users/Shared".to_string()))
}

fn classify_kind(ext: &str) -> &'static str {
    match ext {
        "png" | "jpg" | "jpeg" | "webp" | "gif" | "heic" | "heif" | "svg" | "tiff" | "bmp" | "ico" => "image",
        "mp4" | "mov" | "mkv" | "avi" | "webm" | "m4v" | "flv" => "video",
        "mp3" | "wav" | "aac" | "flac" | "m4a" | "ogg" => "audio",
        "pdf" | "docx" | "doc" | "xlsx" | "pptx" | "txt" | "md" | "rtf" | "pages" | "numbers" => "document",
        "zip" | "tar" | "gz" | "bz2" | "7z" | "rar" | "xz" => "archive",
        "dmg" | "pkg" | "app" | "iso" => "installer",
        "rs" | "ts" | "tsx" | "js" | "jsx" | "py" | "go" | "json" | "html" | "css" => "code",
        _ => "other",
    }
}

// Compute a fast signature for duplicate detection using file size + chunk hashes
fn compute_quick_hash(path: &Path, size: u64) -> Option<String> {
    let mut file = File::open(path).ok()?;
    use std::collections::hash_map::DefaultHasher;
    use std::hash::Hasher;

    let mut hasher = DefaultHasher::new();
    hasher.write_u64(size);

    if size <= 65536 {
        // For small-medium files, read entire content
        let mut buffer = Vec::new();
        if file.read_to_end(&mut buffer).is_ok() {
            hasher.write(&buffer);
        }
    } else {
        // For large files, read first 32KB and middle 32KB
        let mut start_buf = [0u8; 32768];
        if let Ok(n) = file.read(&mut start_buf) {
            hasher.write(&start_buf[..n]);
        }
        use std::io::Seek;
        if file.seek(std::io::SeekFrom::Start(size / 2)).is_ok() {
            let mut mid_buf = [0u8; 32768];
            if let Ok(n) = file.read(&mut mid_buf) {
                hasher.write(&mid_buf[..n]);
            }
        }
        if file.seek(std::io::SeekFrom::End(-16384)).is_ok() {
            let mut end_buf = [0u8; 16384];
            if let Ok(n) = file.read(&mut end_buf) {
                hasher.write(&end_buf[..n]);
            }
        }
    }

    Some(format!("{:x}", hasher.finish()))
}

#[tauri::command]
pub async fn scan_finder_items(
    min_large_size_mb: Option<u64>,
    scan_folders: Option<Vec<String>>,
) -> Result<FinderScanResult, String> {
    let home = get_home_dir();
    let min_large_bytes = min_large_size_mb.unwrap_or(50) * 1024 * 1024;

    // Resolve directories to scan
    let target_dirs: Vec<PathBuf> = match scan_folders {
        Some(folders) if !folders.is_empty() => folders
            .into_iter()
            .map(|f| {
                let p = PathBuf::from(&f);
                if p.is_relative() {
                    home.join(p)
                } else {
                    p
                }
            })
            .filter(|p| p.exists())
            .collect(),
        _ => {
            vec![
                home.join("Downloads"),
                home.join("Desktop"),
                home.join("Documents"),
                home.join("Pictures"),
                home.join("Movies"),
            ]
            .into_iter()
            .filter(|p| p.exists())
            .collect()
        }
    };

    let mut all_files: Vec<FileMetadataItem> = Vec::new();
    let mut size_map: HashMap<u64, Vec<FileMetadataItem>> = HashMap::new();

    let now = SystemTime::now();

    for dir in target_dirs {
        for entry in WalkDir::new(&dir)
            .max_depth(5)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }

            // Skip hidden files or files inside hidden/cache folders
            let path_str = path.to_string_lossy();
            if path_str.contains("/.") || path_str.contains("/Library/") || path_str.contains("/node_modules/") {
                continue;
            }

            if let Ok(meta) = entry.metadata() {
                let size = meta.len();
                if size < 1024 {
                    // Ignore negligible 0-byte or <1KB files
                    continue;
                }

                let ext = path
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("")
                    .to_lowercase();
                let file_name = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("Unknown")
                    .to_string();

                let modified_time = meta.modified().unwrap_or(UNIX_EPOCH);
                let days_old = now
                    .duration_since(modified_time)
                    .map(|d| d.as_secs() / 86400)
                    .unwrap_or(0);

                let formatted_date = match modified_time.duration_since(UNIX_EPOCH) {
                    Ok(dur) => {
                        let secs = dur.as_secs();
                        let days = secs / 86400;
                        let year = 1970 + days / 365;
                        let month = (days % 365) / 30 + 1;
                        let day = (days % 30) + 1;
                        format!("{:04}-{:02}-{:02}", year, month, day)
                    }
                    Err(_) => "Unknown".to_string(),
                };

                let item = FileMetadataItem {
                    id: format!("{:x}", md5_hash(&path_str)),
                    name: file_name,
                    path: path_str.to_string(),
                    size,
                    extension: ext.clone(),
                    kind: classify_kind(&ext).to_string(),
                    last_modified: formatted_date,
                    days_old,
                };

                // Group by size for duplicate detection candidates (only if size >= 100KB to keep fast)
                if size >= 100 * 1024 {
                    size_map.entry(size).or_default().push(item.clone());
                }

                all_files.push(item);
            }
        }
    }

    // 1. Large files
    let mut large_files: Vec<FileMetadataItem> = all_files
        .iter()
        .filter(|f| f.size >= min_large_bytes)
        .cloned()
        .collect();
    large_files.sort_by(|a, b| b.size.cmp(&a.size));
    let total_large_size: u64 = large_files.iter().map(|f| f.size).sum();

    // 2. Duplicate groups
    let mut duplicate_groups: Vec<DuplicateGroup> = Vec::new();
    let mut total_duplicate_wasted_size: u64 = 0;

    for (size, candidates) in size_map {
        if candidates.len() < 2 {
            continue;
        }

        // Group by quick hash
        let mut hash_map: HashMap<String, Vec<FileMetadataItem>> = HashMap::new();
        for item in candidates {
            if let Some(hash) = compute_quick_hash(Path::new(&item.path), size) {
                hash_map.entry(hash).or_default().push(item);
            }
        }

        for (hash, matched_items) in hash_map {
            if matched_items.len() >= 2 {
                let wasted = size * (matched_items.len() as u64 - 1);
                total_duplicate_wasted_size += wasted;
                duplicate_groups.push(DuplicateGroup {
                    id: hash,
                    file_size: size,
                    total_wasted_size: wasted,
                    items: matched_items,
                });
            }
        }
    }
    duplicate_groups.sort_by(|a, b| b.total_wasted_size.cmp(&a.total_wasted_size));

    // 3. Old untouched files (>180 days)
    let mut old_files: Vec<FileMetadataItem> = all_files
        .iter()
        .filter(|f| f.days_old >= 180 && f.size >= 1024 * 1024) // >180 days and >=1MB
        .cloned()
        .collect();
    old_files.sort_by(|a, b| b.size.cmp(&a.size));
    let total_old_size: u64 = old_files.iter().map(|f| f.size).sum();

    Ok(FinderScanResult {
        large_files,
        duplicate_groups,
        old_files,
        total_large_size,
        total_duplicate_wasted_size,
        total_old_size,
    })
}

fn md5_hash(input: &str) -> u64 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::Hasher;
    let mut s = DefaultHasher::new();
    s.write(input.as_bytes());
    s.finish()
}
