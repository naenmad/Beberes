use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartupItem {
    pub id: String,
    pub name: String,
    pub label: String,
    pub path: String,
    pub program: Option<String>,
    #[serde(rename = "isUser")]
    pub is_user: bool,
    #[serde(rename = "isEnabled")]
    pub is_enabled: bool,
    #[serde(rename = "fileSize")]
    pub file_size: u64,
    #[serde(rename = "kindLabel")]
    pub kind_label: String,
}

fn parse_plist_simple(content: &str) -> (String, Option<String>) {
    let mut label = String::new();
    let mut program = None;

    let lines: Vec<&str> = content.lines().collect();
    for i in 0..lines.len() {
        let line = lines[i].trim();
        if line.contains("<key>Label</key>") && i + 1 < lines.len() {
            let next = lines[i + 1].trim();
            if next.starts_with("<string>") && next.ends_with("</string>") {
                label = next
                    .trim_start_matches("<string>")
                    .trim_end_matches("</string>")
                    .to_string();
            }
        }
        if (line.contains("<key>Program</key>") || line.contains("<key>ProgramArguments</key>")) && program.is_none() && i + 1 < lines.len() {
            let next = lines[i + 1].trim();
            if next.starts_with("<string>") && next.ends_with("</string>") {
                program = Some(
                    next.trim_start_matches("<string>")
                        .trim_end_matches("</string>")
                        .to_string(),
                );
            }
        }
    }

    (label, program)
}

fn scan_folder(dir: &Path, is_user: bool, kind: &str) -> Vec<StartupItem> {
    if !dir.exists() {
        return Vec::new();
    }

    let mut items = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            let file_name = path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            if !file_name.ends_with(".plist") && !file_name.ends_with(".plist.disabled") {
                continue;
            }

            let is_enabled = !file_name.ends_with(".disabled");
            let file_size = entry.metadata().map(|m| m.len()).unwrap_or(0);

            let content = fs::read_to_string(&path).unwrap_or_default();
            let (label, program) = parse_plist_simple(&content);

            let display_name = if !label.is_empty() {
                label.clone()
            } else {
                file_name.trim_end_matches(".disabled").trim_end_matches(".plist").to_string()
            };

            items.push(StartupItem {
                id: path.to_string_lossy().to_string(),
                name: display_name,
                label: if label.is_empty() { file_name.clone() } else { label },
                path: path.to_string_lossy().to_string(),
                program,
                is_user,
                is_enabled,
                file_size,
                kind_label: kind.to_string(),
            });
        }
    }

    items
}

#[tauri::command]
pub fn scan_startup_items() -> Result<Vec<StartupItem>, String> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/Shared".to_string());
    let mut all = Vec::new();

    // 1. User Launch Agents
    let user_agents = PathBuf::from(&home).join("Library/LaunchAgents");
    all.extend(scan_folder(&user_agents, true, "User Launch Agent"));

    // 2. Global Launch Agents
    let global_agents = PathBuf::from("/Library/LaunchAgents");
    all.extend(scan_folder(&global_agents, false, "Global Launch Agent"));

    // 3. Global Launch Daemons
    let global_daemons = PathBuf::from("/Library/LaunchDaemons");
    all.extend(scan_folder(&global_daemons, false, "System Launch Daemon"));

    Ok(all)
}

#[tauri::command]
pub fn toggle_startup_item(path: String, enable: bool) -> Result<bool, String> {
    let file_path = PathBuf::from(&path);
    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    let file_str = file_path.to_string_lossy().to_string();
    if enable && file_str.ends_with(".disabled") {
        let new_path = file_str.trim_end_matches(".disabled").to_string();
        fs::rename(&file_path, &new_path).map_err(|e| e.to_string())?;
        // Try launchctl load
        let _ = Command::new("launchctl").arg("load").arg(&new_path).output();
        return Ok(true);
    } else if !enable && !file_str.ends_with(".disabled") {
        // Try launchctl unload
        let _ = Command::new("launchctl").arg("unload").arg(&file_str).output();
        let new_path = format!("{}.disabled", file_str);
        fs::rename(&file_path, &new_path).map_err(|e| e.to_string())?;
        return Ok(true);
    }

    Ok(true)
}

#[tauri::command]
pub fn delete_startup_item(path: String) -> Result<bool, String> {
    let file_path = PathBuf::from(&path);
    if file_path.exists() {
        let _ = Command::new("launchctl").arg("unload").arg(&path).output();
        fs::remove_file(&file_path).map_err(|e| e.to_string())?;
        return Ok(true);
    }
    Err(format!("File does not exist: {}", path))
}
