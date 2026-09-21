use std::fs;
use std::os::unix::fs::symlink;
use std::path::{Path, PathBuf};

#[tauri::command]
pub fn check_cli_installed() -> bool {
    let usr_local = Path::new("/usr/local/bin/beberes");
    if usr_local.exists() {
        return true;
    }
    if let Ok(home) = std::env::var("HOME") {
        let local_bin = PathBuf::from(home).join(".local/bin/beberes");
        if local_bin.exists() {
            return true;
        }
    }
    false
}

#[tauri::command]
pub fn install_cli_symlink() -> Result<String, String> {
    // 1. Determine target binary path
    let app_binary = PathBuf::from("/Applications/Beberes.app/Contents/MacOS/beberes-app");
    let current_binary = std::env::current_exe().map_err(|e| e.to_string())?;

    let source_path = if app_binary.exists() {
        app_binary
    } else {
        current_binary
    };

    // 2. Try /usr/local/bin first
    let usr_local_dir = Path::new("/usr/local/bin");
    let target_symlink = usr_local_dir.join("beberes");

    if usr_local_dir.exists() {
        let _ = fs::remove_file(&target_symlink);
        if symlink(&source_path, &target_symlink).is_ok() {
            return Ok(format!("Installed CLI at {}", target_symlink.display()));
        }
    }

    // 3. Fallback to ~/.local/bin
    if let Ok(home) = std::env::var("HOME") {
        let local_bin_dir = PathBuf::from(home).join(".local/bin");
        let _ = fs::create_dir_all(&local_bin_dir);
        let local_symlink = local_bin_dir.join("beberes");
        let _ = fs::remove_file(&local_symlink);
        if symlink(&source_path, &local_symlink).is_ok() {
            return Ok(format!("Installed CLI at {}", local_symlink.display()));
        }
    }

    Err("Could not link to /usr/local/bin or ~/.local/bin. You may manually run: sudo ln -sf /Applications/Beberes.app/Contents/MacOS/beberes-app /usr/local/bin/beberes".to_string())
}
