use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartRulesStats {
    pub old_downloads_count: usize,
    pub old_downloads_size: u64,
    pub screenshots_count: usize,
    pub screenshots_size: u64,
}

fn dirs_home() -> String {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "/Users/Shared".to_string())
}

fn is_screenshot_file(path: &Path) -> bool {
    let name = path
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();

    let ext = path
        .extension()
        .map(|s| s.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    let is_img = ext == "png" || ext == "jpg" || ext == "jpeg" || ext == "heic" || ext == "webp";

    if !is_img {
        return false;
    }

    name.starts_with("Screen Shot ")
        || name.starts_with("Screenshot ")
        || name.starts_with("Tangkapan Layar ")
}

#[tauri::command]
pub fn get_smart_rules_stats() -> Result<SmartRulesStats, String> {
    let home = dirs_home();
    let downloads = PathBuf::from(&home).join("Downloads");
    let desktop = PathBuf::from(&home).join("Desktop");

    let now = SystemTime::now();
    let thirty_days_sec = 30 * 86400;

    let mut old_downloads_count = 0;
    let mut old_downloads_size = 0;

    if let Ok(entries) = fs::read_dir(&downloads) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_file() {
                if let Ok(meta) = path.metadata() {
                    if let Ok(modified) = meta.modified() {
                        if let Ok(dur) = now.duration_since(modified) {
                            if dur.as_secs() > thirty_days_sec {
                                old_downloads_count += 1;
                                old_downloads_size += meta.len();
                            }
                        }
                    }
                }
            }
        }
    }

    let mut screenshots_count = 0;
    let mut screenshots_size = 0;

    if let Ok(entries) = fs::read_dir(&desktop) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_file() && is_screenshot_file(&path) {
                if let Ok(meta) = path.metadata() {
                    screenshots_count += 1;
                    screenshots_size += meta.len();
                }
            }
        }
    }

    Ok(SmartRulesStats {
        old_downloads_count,
        old_downloads_size,
        screenshots_count,
        screenshots_size,
    })
}

#[tauri::command]
pub fn archive_old_downloads(days: Option<u32>) -> Result<usize, String> {
    let home = dirs_home();
    let downloads = PathBuf::from(&home).join("Downloads");
    let archive_base = PathBuf::from(&home).join("Archive/Downloads");

    let now = SystemTime::now();
    let limit_days = days.unwrap_or(30) as u64;
    let limit_sec = limit_days * 86400;

    let mut moved_count = 0;

    if !downloads.exists() {
        return Ok(0);
    }

    let entries = fs::read_dir(&downloads).map_err(|e| e.to_string())?;

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() {
            let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
            if name.starts_with('.') {
                continue;
            }

            if let Ok(meta) = path.metadata() {
                if let Ok(modified) = meta.modified() {
                    if let Ok(dur) = now.duration_since(modified) {
                        if dur.as_secs() > limit_sec {
                            // Determine month folder e.g. Archive/Downloads/2026-08
                            let days_ago = dur.as_secs() / 86400;
                            let subfolder = if days_ago > 90 {
                                "Older"
                            } else {
                                "Recent_Archive"
                            };

                            let target_dir = archive_base.join(subfolder);
                            let _ = fs::create_dir_all(&target_dir);

                            let target_path = target_dir.join(&name);
                            if fs::rename(&path, &target_path).is_ok() {
                                moved_count += 1;
                            } else if fs::copy(&path, &target_path).is_ok() {
                                let _ = fs::remove_file(&path);
                                moved_count += 1;
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(moved_count)
}

#[tauri::command]
pub fn consolidate_desktop_screenshots() -> Result<usize, String> {
    let home = dirs_home();
    let desktop = PathBuf::from(&home).join("Desktop");
    let target_dir = PathBuf::from(&home).join("Pictures/Screenshots");

    if !desktop.exists() {
        return Ok(0);
    }

    let _ = fs::create_dir_all(&target_dir);
    let mut moved_count = 0;

    let entries = fs::read_dir(&desktop).map_err(|e| e.to_string())?;

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() && is_screenshot_file(&path) {
            let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
            let dest_path = target_dir.join(&name);

            if fs::rename(&path, &dest_path).is_ok() {
                moved_count += 1;
            } else if fs::copy(&path, &dest_path).is_ok() {
                let _ = fs::remove_file(&path);
                moved_count += 1;
            }
        }
    }

    Ok(moved_count)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_screenshot_file_matching() {
        assert!(is_screenshot_file(Path::new("/Desktop/Screen Shot 2026-09-18 at 10.00.png")));
        assert!(is_screenshot_file(Path::new("/Desktop/Screenshot 2026-09-18.jpg")));
        assert!(is_screenshot_file(Path::new("/Desktop/Tangkapan Layar 2026-09-18.heic")));
        assert!(!is_screenshot_file(Path::new("/Desktop/document.pdf")));
        assert!(!is_screenshot_file(Path::new("/Desktop/screenshot_notes.txt")));
    }
}
