use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::UNIX_EPOCH;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TrashItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub kind: String,
    pub is_dir: bool,
    pub date_deleted: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TrashScanResult {
    pub total_items: usize,
    pub total_size: u64,
    pub items: Vec<TrashItem>,
    pub category_sizes: std::collections::HashMap<String, u64>,
}

fn get_home_dir() -> PathBuf {
    PathBuf::from(std::env::var("HOME").unwrap_or_else(|_| "/Users/Shared".to_string()))
}

fn calculate_path_size(path: &std::path::Path) -> u64 {
    if path.is_file() {
        return path.metadata().map(|m| m.len()).unwrap_or(0);
    }
    WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter_map(|e| e.metadata().ok())
        .filter(|m| m.is_file())
        .map(|m| m.len())
        .sum()
}

fn classify_kind(name: &str, is_dir: bool) -> &'static str {
    let lower = name.to_lowercase();
    if is_dir {
        if lower.ends_with(".app") {
            return "app";
        }
        return "folder";
    }

    let ext = lower.split('.').last().unwrap_or("");
    match ext {
        "png" | "jpg" | "jpeg" | "webp" | "gif" | "heic" | "svg" | "tiff" => "image",
        "mp4" | "mov" | "mkv" | "avi" | "webm" | "m4v" => "video",
        "mp3" | "wav" | "aac" | "flac" | "m4a" => "audio",
        "pdf" | "docx" | "doc" | "xlsx" | "pptx" | "txt" | "md" => "document",
        "zip" | "tar" | "gz" | "7z" | "rar" => "archive",
        "dmg" | "pkg" | "iso" => "installer",
        _ => "other",
    }
}

#[tauri::command]
pub async fn scan_trash_contents() -> Result<TrashScanResult, String> {
    let trash_dir = get_home_dir().join(".Trash");
    if !trash_dir.exists() {
        return Ok(TrashScanResult {
            total_items: 0,
            total_size: 0,
            items: Vec::new(),
            category_sizes: std::collections::HashMap::new(),
        });
    }

    let entries = match fs::read_dir(&trash_dir) {
        Ok(e) => e,
        Err(err) => {
            eprintln!("Notice: Unable to directly read ~/.Trash: {}. Full Disk Access may be needed.", err);
            return Ok(TrashScanResult {
                total_items: 0,
                total_size: 0,
                items: Vec::new(),
                category_sizes: std::collections::HashMap::new(),
            });
        }
    };
    let mut items = Vec::new();
    let mut total_size = 0u64;
    let mut category_sizes: std::collections::HashMap<String, u64> = std::collections::HashMap::new();

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown")
            .to_string();

        let is_dir = path.is_dir();
        let size = calculate_path_size(&path);
        let kind = classify_kind(&name, is_dir).to_string();

        let formatted_date = match entry.metadata().and_then(|m| m.modified()) {
            Ok(modified) => {
                if let Ok(dur) = modified.duration_since(UNIX_EPOCH) {
                    let secs = dur.as_secs();
                    let days = secs / 86400;
                    let year = 1970 + days / 365;
                    let month = (days % 365) / 30 + 1;
                    let day = (days % 30) + 1;
                    format!("{:04}-{:02}-{:02}", year, month, day)
                } else {
                    "Unknown".to_string()
                }
            }
            Err(_) => "Unknown".to_string(),
        };

        total_size += size;
        *category_sizes.entry(kind.clone()).or_insert(0) += size;

        items.push(TrashItem {
            id: format!("{:x}", md5_hash(&path.to_string_lossy())),
            name,
            path: path.to_string_lossy().to_string(),
            size,
            kind,
            is_dir,
            date_deleted: formatted_date,
        });
    }

    items.sort_by(|a, b| b.size.cmp(&a.size));

    Ok(TrashScanResult {
        total_items: items.len(),
        total_size,
        items,
        category_sizes,
    })
}

#[tauri::command]
pub async fn empty_mac_trash() -> Result<u64, String> {
    let trash_dir = get_home_dir().join(".Trash");
    let mut freed = 0u64;

    if trash_dir.exists() {
        if let Ok(entries) = fs::read_dir(&trash_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let p = entry.path();
                let size = calculate_path_size(&p);
                let res = if p.is_dir() {
                    fs::remove_dir_all(&p)
                } else {
                    fs::remove_file(&p)
                };
                if res.is_ok() {
                    freed += size;
                }
            }
        }
    }

    // Also trigger AppleScript Finder empty trash as safety confirmation
    let _ = Command::new("osascript")
        .args(["-e", "tell application \"Finder\" to empty trash"])
        .output();

    Ok(freed)
}

#[tauri::command]
pub async fn delete_specific_trash_items(paths: Vec<String>) -> Result<u64, String> {
    let mut freed = 0u64;
    for path_str in paths {
        let path = std::path::Path::new(&path_str);
        if !path.exists() {
            continue;
        }
        let size = calculate_path_size(path);
        let res = if path.is_dir() {
            fs::remove_dir_all(path)
        } else {
            fs::remove_file(path)
        };
        if res.is_ok() {
            freed += size;
        }
    }
    Ok(freed)
}

fn md5_hash(input: &str) -> u64 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::Hasher;
    let mut s = DefaultHasher::new();
    s.write(input.as_bytes());
    s.finish()
}
