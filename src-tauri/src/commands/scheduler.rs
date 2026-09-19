use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleConfig {
    pub enabled: bool,
    pub interval_type: String, // "daily", "weekly", "monthly"
    pub hour: u32,
    pub clean_trash_older_days: u32,
    pub clean_xcode_derived_data: bool,
    pub clean_system_logs: bool,
    pub notify_on_complete: bool,
}

impl Default for ScheduleConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            interval_type: "weekly".to_string(),
            hour: 10,
            clean_trash_older_days: 30,
            clean_xcode_derived_data: true,
            clean_system_logs: true,
            notify_on_complete: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduledCleanSummary {
    pub success: bool,
    pub total_freed_bytes: u64,
    pub cleaned_items_count: usize,
    pub message: String,
}

fn get_config_path() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/Users/Shared"));
    let dir = home.join(".config").join("beberes");
    let _ = fs::create_dir_all(&dir);
    dir.join("schedule.json")
}

fn get_launch_agent_plist_path() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/Users/Shared"));
    let dir = home.join("Library").join("LaunchAgents");
    let _ = fs::create_dir_all(&dir);
    dir.join("com.naenmad.beberes.cleaner.plist")
}

#[tauri::command]
pub fn get_schedule_config() -> ScheduleConfig {
    let path = get_config_path();
    if let Ok(content) = fs::read_to_string(&path) {
        if let Ok(config) = serde_json::from_str::<ScheduleConfig>(&content) {
            return config;
        }
    }
    ScheduleConfig::default()
}

#[tauri::command]
pub fn save_schedule_config(config: ScheduleConfig) -> Result<(), String> {
    let path = get_config_path();
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;

    let plist_path = get_launch_agent_plist_path();

    if !config.enabled {
        // Unload and remove LaunchAgent
        #[cfg(target_os = "macos")]
        {
            let _ = Command::new("launchctl")
                .args(["unload", plist_path.to_str().unwrap_or("")])
                .output();
        }
        let _ = fs::remove_file(&plist_path);
        return Ok(());
    }

    // Generate LaunchAgent plist for macOS
    let interval_seconds = match config.interval_type.as_str() {
        "daily" => 86400,
        "weekly" => 604800,
        "monthly" => 2592000,
        _ => 604800,
    };

    let app_exec = std::env::current_exe()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| "/Applications/Beberes.app/Contents/MacOS/beberes-app".to_string());

    let plist_content = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.naenmad.beberes.cleaner</string>
    <key>ProgramArguments</key>
    <array>
        <string>{}</string>
        <string>--scheduled-clean</string>
    </array>
    <key>StartInterval</key>
    <integer>{}</integer>
    <key>RunAtLoad</key>
    <false/>
    <key>StandardErrorPath</key>
    <string>/tmp/beberes_cleaner.err</string>
    <key>StandardOutPath</key>
    <string>/tmp/beberes_cleaner.out</string>
</dict>
</plist>"#,
        app_exec, interval_seconds
    );

    fs::write(&plist_path, plist_content).map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        let _ = Command::new("launchctl")
            .args(["unload", plist_path.to_str().unwrap_or("")])
            .output();
        let _ = Command::new("launchctl")
            .args(["load", plist_path.to_str().unwrap_or("")])
            .output();
    }

    Ok(())
}

#[tauri::command]
pub fn trigger_scheduled_clean_now() -> Result<ScheduledCleanSummary, String> {
    let config = get_schedule_config();
    let mut total_freed: u64 = 0;
    let mut cleaned_count: usize = 0;

    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/Users/Shared"));

    // 1. Clean system logs if enabled
    if config.clean_system_logs {
        let logs_dir = home.join("Library").join("Logs");
        if logs_dir.exists() {
            if let Ok(entries) = fs::read_dir(&logs_dir) {
                for entry in entries.flatten() {
                    let p = entry.path();
                    if p.is_file() {
                        if let Ok(meta) = entry.metadata() {
                            total_freed += meta.len();
                            cleaned_count += 1;
                            let _ = fs::remove_file(p);
                        }
                    }
                }
            }
        }
    }

    // 2. Clean Xcode DerivedData if enabled and exists
    if config.clean_xcode_derived_data {
        let derived_data = home
            .join("Library")
            .join("Developer")
            .join("Xcode")
            .join("DerivedData");
        if derived_data.exists() {
            if let Ok(entries) = fs::read_dir(&derived_data) {
                for entry in entries.flatten() {
                    let p = entry.path();
                    if p.is_dir() {
                        // Quick removal of build intermediate directories
                        let _ = fs::remove_dir_all(p);
                        cleaned_count += 1;
                    }
                }
            }
        }
    }

    // 3. Send macOS Notification if enabled
    if config.notify_on_complete {
        let freed_mb = total_freed / 1_000_000;
        let notif_msg = if freed_mb > 0 {
            format!("Scheduled maintenance complete. Reclaimed {} MB of disk space.", freed_mb)
        } else {
            "Scheduled maintenance completed successfully. All clean!".to_string()
        };

        #[cfg(target_os = "macos")]
        {
            let script = format!(
                r#"display notification "{}" with title "Beberes Scheduled Clean" subtitle "System Hygiene Maintained""#,
                notif_msg
            );
            let _ = Command::new("osascript").args(["-e", &script]).output();
        }
    }

    Ok(ScheduledCleanSummary {
        success: true,
        total_freed_bytes: total_freed,
        cleaned_items_count: cleaned_count,
        message: format!("Successfully cleaned {} items.", cleaned_count),
    })
}
