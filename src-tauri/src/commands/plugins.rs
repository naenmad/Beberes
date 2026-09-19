use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionItem {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub browser_or_type: String,
    pub path: String,
    pub size_bytes: u64,
    pub is_system_plugin: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginScanReport {
    pub items: Vec<ExtensionItem>,
    pub total_count: usize,
    pub total_size_bytes: u64,
}

fn calculate_dir_size(path: &Path) -> u64 {
    WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter_map(|e| e.metadata().ok())
        .filter(|m| m.is_file())
        .map(|m| m.len())
        .sum()
}

fn parse_manifest_name(manifest_path: &Path, default_name: &str) -> (String, String, String) {
    if let Ok(content) = fs::read_to_string(manifest_path) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            let mut name = json["name"].as_str().unwrap_or(default_name).to_string();
            let version = json["version"].as_str().unwrap_or("1.0.0").to_string();
            let desc = json["description"].as_str().unwrap_or("").to_string();

            // If name is an i18n key like __MSG_appName__, attempt to fallback or use default
            if name.starts_with("__MSG_") {
                name = default_name.to_string();
            }

            return (name, version, desc);
        }
    }
    (default_name.to_string(), "1.0.0".to_string(), String::new())
}

#[tauri::command]
pub fn scan_browser_and_system_plugins() -> PluginScanReport {
    let mut items = Vec::new();
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/Users/Shared"));

    // 1. Chromium-based browsers
    let browser_dirs = [
        ("Google Chrome", home.join("Library/Application Support/Google/Chrome/Default/Extensions")),
        ("Brave Browser", home.join("Library/Application Support/BraveSoftware/Brave-Browser/Default/Extensions")),
        ("Arc Browser", home.join("Library/Application Support/Arc/User Data/Default/Extensions")),
        ("Microsoft Edge", home.join("Library/Application Support/Microsoft Edge/Default/Extensions")),
    ];

    for (browser_name, ext_dir) in browser_dirs {
        if !ext_dir.exists() {
            continue;
        }
        if let Ok(ext_entries) = fs::read_dir(&ext_dir) {
            for ext_entry in ext_entries.flatten() {
                let ext_path = ext_entry.path();
                if ext_path.is_dir() {
                    let ext_id = ext_path.file_name().unwrap_or_default().to_string_lossy().to_string();
                    // Each extension directory has version folders
                    if let Ok(version_entries) = fs::read_dir(&ext_path) {
                        for v_entry in version_entries.flatten() {
                            let v_path = v_entry.path();
                            if v_path.is_dir() {
                                let manifest = v_path.join("manifest.json");
                                if manifest.exists() {
                                    let (name, ver, desc) = parse_manifest_name(&manifest, &ext_id);
                                    let size = calculate_dir_size(&ext_path);
                                    items.push(ExtensionItem {
                                        id: format!("{}_{}", browser_name, ext_id),
                                        name,
                                        version: ver,
                                        description: desc,
                                        browser_or_type: browser_name.to_string(),
                                        path: ext_path.to_string_lossy().to_string(),
                                        size_bytes: size,
                                        is_system_plugin: false,
                                    });
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 2. macOS System Plugins
    let system_plugin_locations = [
        ("QuickLook Generator", PathBuf::from("/Library/QuickLook")),
        ("QuickLook Generator (User)", home.join("Library/QuickLook")),
        ("Spotlight Importer", PathBuf::from("/Library/Spotlight")),
        ("Spotlight Importer (User)", home.join("Library/Spotlight")),
        ("Audio Plug-in (VST3)", PathBuf::from("/Library/Audio/Plug-Ins/VST3")),
        ("Audio Plug-in (Components)", PathBuf::from("/Library/Audio/Plug-Ins/Components")),
    ];

    for (plugin_type, dir) in system_plugin_locations {
        if !dir.exists() {
            continue;
        }
        if let Ok(entries) = fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                let name = p.file_name().unwrap_or_default().to_string_lossy().to_string();
                if name.ends_with(".qlgenerator") || name.ends_with(".mdimporter") || name.ends_with(".vst3") || name.ends_with(".component") {
                    let size = if p.is_dir() { calculate_dir_size(&p) } else { entry.metadata().map(|m| m.len()).unwrap_or(0) };
                    items.push(ExtensionItem {
                        id: format!("sys_{}", name),
                        name: name.clone(),
                        version: "macOS Bundle".to_string(),
                        description: format!("System level plugin in {}", dir.to_string_lossy()),
                        browser_or_type: plugin_type.to_string(),
                        path: p.to_string_lossy().to_string(),
                        size_bytes: size,
                        is_system_plugin: true,
                    });
                }
            }
        }
    }

    let total_count = items.len();
    let total_size_bytes = items.iter().map(|i| i.size_bytes).sum();

    PluginScanReport {
        items,
        total_count,
        total_size_bytes,
    }
}

#[tauri::command]
pub fn remove_plugin_or_extension(path: String) -> Result<bool, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err("Path does not exist".to_string());
    }

    // Move to Trash using Finder AppleScript for user safety
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let script = format!(
            r#"tell application "Finder" to delete POSIX file "{}""#,
            p.to_str().unwrap_or("")
        );
        if Command::new("osascript").args(["-e", &script]).status().is_ok() {
            return Ok(true);
        }
    }

    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| e.to_string())?;
    } else {
        fs::remove_file(p).map_err(|e| e.to_string())?;
    }

    Ok(true)
}
