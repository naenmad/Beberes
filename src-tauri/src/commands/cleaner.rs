use crate::utils::is_whitelisted;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[cfg(unix)]
use std::os::unix::fs::MetadataExt;

/// Get actual physical allocated disk space (handles APFS sparse files).
pub fn get_allocated_size(m: &fs::Metadata) -> u64 {
    #[cfg(unix)]
    {
        m.blocks() * 512
    }
    #[cfg(not(unix))]
    {
        m.len()
    }
}

/// Result of a clean operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanResult {
    pub cleaned: u64,
    #[serde(rename = "freedBytes")]
    pub freed_bytes: u64,
    #[serde(rename = "isSimulation")]
    pub is_simulation: bool,
}

/// Reveal a file or directory in macOS Finder / system file manager.
#[tauri::command]
pub fn reveal_in_finder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to reveal path in Finder: {}", e))?;
        Ok(())
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(format!("/select,{}", path))
            .spawn()
            .map_err(|e| format!("Failed to reveal path in Explorer: {}", e))?;
        Ok(())
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let parent = Path::new(&path).parent().unwrap_or(Path::new(&path));
        std::process::Command::new("xdg-open")
            .arg(parent)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
        Ok(())
    }
}

/// Open native system folder picker and return the selected directory path.
#[tauri::command]
pub fn pick_folder() -> Result<Option<String>, String> {
    #[cfg(target_os = "macos")]
    {
        let output = std::process::Command::new("osascript")
            .arg("-e")
            .arg("POSIX path of (choose folder with prompt \"Select Directory\")")
            .output()
            .map_err(|e| format!("Failed to open folder picker: {}", e))?;

        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let clean_path = path.trim_end_matches('/').to_string();
            if clean_path.is_empty() {
                Ok(None)
            } else {
                Ok(Some(clean_path))
            }
        } else {
            // User cancelled
            Ok(None)
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(None)
    }
}

/// Open native system file picker allowing multiple selection.
#[tauri::command]
pub fn pick_files() -> Result<Vec<String>, String> {
    #[cfg(target_os = "macos")]
    {
        let script = r#"
            set selectedFiles to choose file with prompt "Select Files to Shred" with multiple selections allowed
            set output to ""
            repeat with aFile in selectedFiles
                set output to output & (POSIX path of aFile) & linefeed
            end repeat
            return output
        "#;
        let output = std::process::Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| format!("Failed to open file picker: {}", e))?;

        if output.status.success() {
            let out_str = String::from_utf8_lossy(&output.stdout);
            let paths: Vec<String> = out_str
                .lines()
                .map(|l| l.trim().to_string())
                .filter(|l| !l.is_empty())
                .collect();
            Ok(paths)
        } else {
            Ok(vec![])
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(vec![])
    }
}

/// Clean selected items by their file paths (supports dry_run simulation).
///
/// Performs safety checks:
/// 1. Rejects whitelisted paths
/// 2. Verifies path exists before deletion
/// 3. Calculates total freed space (using allocated disk space)
#[tauri::command]
pub fn clean_selected_items(
    paths: Vec<String>,
    dry_run: Option<bool>,
    use_trash: Option<bool>,
) -> Result<CleanResult, String> {
    let mut cleaned: u64 = 0;
    let mut freed_bytes: u64 = 0;
    let is_dry_run = dry_run.unwrap_or(false);
    let to_trash = use_trash.unwrap_or(false);

    for path_str in &paths {
        let path = Path::new(path_str);

        // Safety: check whitelist
        if is_whitelisted(path_str) {
            eprintln!("Skipping whitelisted path: {}", path_str);
            continue;
        }

        if !path.exists() {
            continue;
        }

        // Calculate actual physical size before deletion
        let size = if path.is_dir() {
            calculate_dir_size(path)
        } else {
            path.metadata().map(|m| get_allocated_size(&m)).unwrap_or(0)
        };

        if is_dry_run {
            cleaned += 1;
            freed_bytes += size;
            continue;
        }

        // Perform deletion (Move to macOS Trash or Permanent Delete)
        let mut deleted_success = false;

        if to_trash {
            let trash_cmd = std::process::Command::new("osascript")
                .arg("-e")
                .arg(format!("tell application \"Finder\" to delete POSIX file \"{}\"", path_str))
                .output();

            if let Ok(out) = trash_cmd {
                if out.status.success() {
                    deleted_success = true;
                }
            }
        }

        if !deleted_success {
            let result = if path.is_dir() {
                fs::remove_dir_all(path)
            } else {
                fs::remove_file(path)
            };

            if result.is_ok() {
                deleted_success = true;
            } else if let Err(e) = result {
                eprintln!("Failed to delete {}: {}", path_str, e);
            }
        }

        if deleted_success {
            cleaned += 1;
            freed_bytes += size;
        }
    }

    Ok(CleanResult {
        cleaned,
        freed_bytes,
        is_simulation: is_dry_run,
    })
}

/// Calculate directory physical size recursively.
pub fn calculate_dir_size(path: &Path) -> u64 {
    walkdir::WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .map(|e| e.metadata().map(|m| get_allocated_size(&m)).unwrap_or(0))
        .sum()
}
