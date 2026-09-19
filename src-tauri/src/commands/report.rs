use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[tauri::command]
pub fn export_report_markdown(
    save_path: Option<String>,
    content: String,
) -> Result<String, String> {
    let target_path: PathBuf = match save_path {
        Some(p) if !p.trim().is_empty() => PathBuf::from(p),
        _ => {
            let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/Users/Shared"));
            let desktop = home.join("Desktop");
            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);
            desktop.join(format!("Beberes-System-Audit-{}.md", timestamp))
        }
    };

    fs::write(&target_path, content).map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let _ = Command::new("open")
            .args(["-R", target_path.to_str().unwrap_or("")])
            .spawn();
    }

    Ok(target_path.to_string_lossy().to_string())
}
