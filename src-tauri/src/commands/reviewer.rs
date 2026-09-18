use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReviewFileItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub extension: String,
    pub kind: String,
    pub dimensions: Option<String>,
    pub last_modified: String,
    pub created: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReviewScanResult {
    pub directory_path: String,
    pub directory_name: String,
    pub total_files: usize,
    pub total_size: u64,
    pub items: Vec<ReviewFileItem>,
}

fn get_home_dir() -> PathBuf {
    PathBuf::from(std::env::var("HOME").unwrap_or_else(|_| "/Users/Shared".to_string()))
}

fn resolve_target_dir(dir_name_or_path: &str) -> PathBuf {
    let home = get_home_dir();
    match dir_name_or_path.to_lowercase().as_str() {
        "downloads" => home.join("Downloads"),
        "desktop" => home.join("Desktop"),
        "pictures" => home.join("Pictures"),
        "screenshots" => {
            let direct = home.join("Pictures").join("Screenshots");
            if direct.exists() {
                direct
            } else {
                home.join("Desktop")
            }
        }
        _ => {
            let p = PathBuf::from(dir_name_or_path);
            if p.is_relative() {
                home.join(p)
            } else {
                p
            }
        }
    }
}

fn classify_kind(ext: &str) -> &'static str {
    match ext {
        "png" | "jpg" | "jpeg" | "webp" | "gif" | "heic" | "heif" | "svg" | "tiff" | "bmp" | "ico" => "image",
        "mp4" | "mov" | "m4v" | "mkv" | "avi" | "webm" => "video",
        "mp3" | "wav" | "aac" | "flac" | "m4a" | "ogg" => "audio",
        "pdf" | "doc" | "docx" | "xls" | "xlsx" | "ppt" | "pptx" | "txt" | "md" | "rtf" | "csv" => "document",
        "zip" | "tar" | "gz" | "bz2" | "xz" | "7z" | "rar" => "archive",
        "dmg" | "pkg" | "iso" => "installer",
        "js" | "ts" | "jsx" | "tsx" | "rs" | "go" | "py" | "c" | "cpp" | "html" | "css" | "json" => "code",
        _ => "other",
    }
}

fn format_system_time(time: std::time::SystemTime) -> String {
    if let Ok(duration) = time.duration_since(UNIX_EPOCH) {
        let secs = duration.as_secs();
        let days = secs / 86400;
        let rem_secs = secs % 86400;
        let hours = rem_secs / 3600;
        let mins = (rem_secs % 3600) / 60;
        format!("{}d {:02}:{:02} ago", days % 365, hours, mins)
    } else {
        "Unknown".to_string()
    }
}

#[tauri::command]
pub fn scan_review_files(directory: String, filter_type: Option<String>) -> Result<ReviewScanResult, String> {
    let target = resolve_target_dir(&directory);

    if !target.exists() || !target.is_dir() {
        return Err(format!("Directory not found: {}", target.display()));
    }

    let filter = filter_type.unwrap_or_else(|| "all".to_string()).to_lowercase();
    let is_screenshots_only = directory.to_lowercase() == "screenshots";

    let entries = fs::read_dir(&target).map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut items = Vec::new();
    let mut total_size = 0u64;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            continue; // Review loose files
        }

        let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
        if name.starts_with('.') {
            continue; // Skip hidden / system files
        }

        // If target is screenshots mode, filter files that look like screenshots
        if is_screenshots_only && !name.to_lowercase().contains("screenshot") && !name.to_lowercase().contains("tangkapan") {
            continue;
        }

        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
        let kind = classify_kind(&ext);

        // Apply filter
        if filter != "all" {
            match filter.as_str() {
                "images" if kind != "image" => continue,
                "media" if kind != "image" && kind != "video" && kind != "audio" => continue,
                "documents" if kind != "document" => continue,
                "installers" if kind != "installer" => continue,
                "large" => {
                    if let Ok(meta) = entry.metadata() {
                        if meta.len() < 50 * 1024 * 1024 {
                            continue; // < 50 MB
                        }
                    }
                }
                _ => {}
            }
        }

        let metadata = entry.metadata().ok();
        let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
        let modified = metadata
            .as_ref()
            .and_then(|m| m.modified().ok())
            .map(format_system_time)
            .unwrap_or_else(|| "Recently".to_string());

        let created = metadata
            .as_ref()
            .and_then(|m| m.created().ok())
            .map(format_system_time)
            .unwrap_or_else(|| "Recently".to_string());

        total_size += size;

        items.push(ReviewFileItem {
            id: path.to_string_lossy().to_string(),
            name,
            path: path.to_string_lossy().to_string(),
            size,
            extension: ext,
            kind: kind.to_string(),
            dimensions: None,
            last_modified: modified,
            created,
        });
    }

    // Sort by modified date / size descending
    items.sort_by_key(|a| std::cmp::Reverse(a.size));

    let total_files = items.len();
    let dir_name = target
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Directory")
        .to_string();

    Ok(ReviewScanResult {
        directory_path: target.to_string_lossy().to_string(),
        directory_name: dir_name,
        total_files,
        total_size,
        items,
    })
}

#[tauri::command]
pub fn read_file_thumbnail(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    if !p.exists() || !p.is_file() {
        return Err("File not found".to_string());
    }

    let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        _ => return Err("Not a supported image format".to_string()),
    };

    // Read file bytes with a reasonable limit for thumbnails (15 MB)
    let meta = fs::metadata(p).map_err(|e| e.to_string())?;
    if meta.len() > 20 * 1024 * 1024 {
        return Err("File too large for direct inline thumbnail".to_string());
    }

    let bytes = fs::read(p).map_err(|e| format!("Failed to read file: {}", e))?;
    let encoded = BASE64.encode(bytes);

    Ok(format!("data:{};base64,{}", mime, encoded))
}

#[tauri::command]
pub fn rename_file(old_path: String, new_name: String) -> Result<String, String> {
    let trimmed_name = new_name.trim();
    if trimmed_name.is_empty() {
        return Err("New file name cannot be empty".to_string());
    }

    if trimmed_name.contains('/') || trimmed_name.contains('\\') || trimmed_name.contains(':') {
        return Err("Invalid characters in file name".to_string());
    }

    let source = PathBuf::from(&old_path);
    if !source.exists() {
        return Err("Original file does not exist".to_string());
    }

    let parent = source.parent().ok_or("Cannot determine parent directory")?;
    let target = parent.join(trimmed_name);

    if target.exists() {
        return Err(format!("A file named '{}' already exists in this folder", trimmed_name));
    }

    fs::rename(&source, &target).map_err(|e| format!("Failed to rename file: {}", e))?;

    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
pub fn read_text_preview(path: String, max_bytes: Option<usize>) -> Result<String, String> {
    use std::io::Read;
    let p = Path::new(&path);
    if !p.exists() || !p.is_file() {
        return Err("File not found".to_string());
    }
    let limit = max_bytes.unwrap_or(32 * 1024);
    let mut file = fs::File::open(p).map_err(|e| e.to_string())?;
    let mut buffer = vec![0u8; limit];
    let n = file.read(&mut buffer).map_err(|e| e.to_string())?;
    buffer.truncate(n);
    let s = String::from_utf8_lossy(&buffer).to_string();
    Ok(s)
}
