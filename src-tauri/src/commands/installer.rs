use std::path::{Path, PathBuf};
use std::process::Command;

fn get_app_bundle_path() -> Option<PathBuf> {
    let current_exe = std::env::current_exe().ok()?;
    let mut current = current_exe.as_path();
    while let Some(parent) = current.parent() {
        if parent.extension().and_then(|ext| ext.to_str()) == Some("app") {
            return Some(parent.to_path_buf());
        }
        current = parent;
    }
    None
}

#[tauri::command]
pub fn check_is_in_applications_dir() -> Result<bool, String> {
    #[cfg(not(target_os = "macos"))]
    {
        Ok(true)
    }

    #[cfg(target_os = "macos")]
    {
        let bundle_path = match get_app_bundle_path() {
            Some(path) => path,
            None => {
                // If not running from inside a .app bundle (e.g. dev mode), assume true
                return Ok(true);
            }
        };

        let bundle_str = bundle_path.to_string_lossy();

        // System Applications directory
        if bundle_str.starts_with("/Applications/") || bundle_str == "/Applications" {
            return Ok(true);
        }

        // User Applications directory (~/Applications)
        if let Some(home) = dirs::home_dir() {
            let user_apps = home.join("Applications");
            if bundle_path.starts_with(&user_apps) {
                return Ok(true);
            }
        }

        Ok(false)
    }
}

#[tauri::command]
pub fn move_to_applications_and_relaunch() -> Result<(), String> {
    #[cfg(not(target_os = "macos"))]
    {
        Ok(())
    }

    #[cfg(target_os = "macos")]
    {
        let source_bundle = get_app_bundle_path()
            .ok_or_else(|| "Could not locate the current application bundle.".to_string())?;

        let app_file_name = source_bundle
            .file_name()
            .ok_or_else(|| "Invalid application bundle name.".to_string())?
            .to_string_lossy();

        let target_path = Path::new("/Applications").join(app_file_name.as_ref());
        let source_str = source_bundle.to_string_lossy().to_string();
        let target_str = target_path.to_string_lossy().to_string();

        // If source is already in target, do nothing
        if source_bundle == target_path {
            return Ok(());
        }

        // First attempt: direct ditto copy
        let ditto_status = Command::new("/usr/bin/ditto")
            .arg(&source_str)
            .arg(&target_str)
            .status();

        let copy_success = match ditto_status {
            Ok(status) if status.success() => true,
            _ => false,
        };

        // If direct copy failed (e.g., permission required for /Applications), try with admin privileges via osascript
        if !copy_success {
            let script = format!(
                "do shell script \"/usr/bin/ditto '{}' '{}'\" with administrator privileges",
                source_str.replace('\'', "'\\''"),
                target_str.replace('\'', "'\\''")
            );

            let admin_status = Command::new("osascript")
                .arg("-e")
                .arg(&script)
                .status()
                .map_err(|e| format!("Failed to request administrator privileges: {}", e))?;

            if !admin_status.success() {
                return Err("Failed to copy application to /Applications folder.".to_string());
            }
        }

        // Launch the newly copied app from /Applications
        let open_status = Command::new("/usr/bin/open")
            .arg("-n")
            .arg(&target_str)
            .spawn();

        if let Err(e) = open_status {
            return Err(format!("Copied successfully, but failed to relaunch: {}", e));
        }

        // Exit the current process cleanly
        std::process::exit(0);
    }
}
