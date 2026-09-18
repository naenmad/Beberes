use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaintenanceItem {
    pub id: String,
    pub path: String,
    pub name: String,
    pub kind: String, // "empty_folder" or "broken_symlink"
    pub details: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaintenanceScanResult {
    pub scanned_path: String,
    pub empty_folders: Vec<MaintenanceItem>,
    pub broken_symlinks: Vec<MaintenanceItem>,
}

fn is_folder_effectively_empty(path: &Path) -> bool {
    if let Ok(entries) = fs::read_dir(path) {
        let mut count = 0;
        for entry in entries.filter_map(|e| e.ok()) {
            let name = entry.file_name().to_string_lossy().to_string();
            // Ignore macOS metadata file .DS_Store
            if name != ".DS_Store" {
                count += 1;
            }
        }
        return count == 0;
    }
    false
}

#[tauri::command]
pub fn scan_maintenance_items(path: String) -> Result<MaintenanceScanResult, String> {
    let root = if path.is_empty() || path == "~" {
        PathBuf::from(std::env::var("HOME").unwrap_or_else(|_| "/Users/Shared".to_string()))
    } else if path.starts_with("~/") {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/Shared".to_string());
        PathBuf::from(format!("{}{}", home, &path[1..]))
    } else {
        PathBuf::from(&path)
    };

    if !root.exists() {
        return Err(format!("Directory not found: {}", path));
    }

    let mut empty_folders = Vec::new();
    let mut broken_symlinks = Vec::new();

    for entry in WalkDir::new(&root)
        .max_depth(4)
        .min_depth(1)
        .same_file_system(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let p = entry.path();

        // 1. Check for broken symbolic links
        if let Ok(sym_meta) = fs::symlink_metadata(p) {
            if sym_meta.file_type().is_symlink() {
                // If symlink target cannot be resolved/does not exist
                if !p.exists() {
                    let target = fs::read_link(p)
                        .map(|t| t.to_string_lossy().to_string())
                        .unwrap_or_else(|_| "Unknown broken target".to_string());

                    broken_symlinks.push(MaintenanceItem {
                        id: p.to_string_lossy().to_string(),
                        path: p.to_string_lossy().to_string(),
                        name: p.file_name().unwrap_or_default().to_string_lossy().to_string(),
                        kind: "broken_symlink".to_string(),
                        details: format!("Points to missing: {}", target),
                    });
                    continue;
                }
            }
        }

        // 2. Check for empty directories
        if entry.file_type().is_dir() {
            let name = entry.file_name().to_string_lossy();
            // Skip git and system folders
            if name == ".git" || name == "node_modules" || name.starts_with('.') {
                continue;
            }

            if is_folder_effectively_empty(p) {
                empty_folders.push(MaintenanceItem {
                    id: p.to_string_lossy().to_string(),
                    path: p.to_string_lossy().to_string(),
                    name: name.to_string(),
                    kind: "empty_folder".to_string(),
                    details: "Contains 0 items".to_string(),
                });
            }
        }
    }

    Ok(MaintenanceScanResult {
        scanned_path: root.to_string_lossy().to_string(),
        empty_folders,
        broken_symlinks,
    })
}

#[tauri::command]
pub fn clean_maintenance_items(paths: Vec<String>) -> Result<usize, String> {
    let mut cleaned = 0;
    for path_str in paths {
        let p = Path::new(&path_str);
        if !p.exists() {
            // Might be broken symlink which returns false for exists()
            if let Ok(sym_meta) = fs::symlink_metadata(p) {
                if sym_meta.file_type().is_symlink() {
                    if fs::remove_file(p).is_ok() {
                        cleaned += 1;
                    }
                    continue;
                }
            }
        }

        if p.is_dir() {
            // Delete .DS_Store first if present
            let ds = p.join(".DS_Store");
            if ds.exists() {
                let _ = fs::remove_file(ds);
            }
            if fs::remove_dir(p).is_ok() {
                cleaned += 1;
            }
        } else if p.is_file() {
            if fs::remove_file(p).is_ok() {
                cleaned += 1;
            }
        }
    }

    Ok(cleaned)
}
