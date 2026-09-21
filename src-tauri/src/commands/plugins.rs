use rayon::prelude::*;
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
    pub icon_data_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginScanReport {
    pub items: Vec<ExtensionItem>,
    pub total_count: usize,
    pub total_size_bytes: u64,
    pub permission_denied: bool,
}

fn calculate_dir_size(path: &Path) -> u64 {
    WalkDir::new(path)
        .into_iter()
        .par_bridge()
        .filter_map(|e| e.ok())
        .filter_map(|e| e.metadata().ok())
        .filter(|m| m.is_file())
        .map(|m| m.len())
        .sum()
}

fn resolve_i18n_message(v_path: &Path, key: &str, default_locale: &str) -> Option<String> {
    let locales_dir = v_path.join("_locales");
    if !locales_dir.exists() {
        return None;
    }

    let mut candidate_locales = Vec::new();
    if !default_locale.is_empty() {
        candidate_locales.push(default_locale.to_string());
    }
    candidate_locales.push("en".to_string());
    candidate_locales.push("en_US".to_string());
    candidate_locales.push("en_GB".to_string());

    if let Ok(entries) = fs::read_dir(&locales_dir) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                if let Some(name) = entry.file_name().to_str() {
                    let name_str = name.to_string();
                    if !candidate_locales.contains(&name_str) {
                        candidate_locales.push(name_str);
                    }
                }
            }
        }
    }

    let search_key = key.to_lowercase();

    for loc in candidate_locales {
        let msg_path = locales_dir.join(loc).join("messages.json");
        if let Ok(content) = fs::read_to_string(&msg_path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(obj) = json.as_object() {
                    for (k, v) in obj {
                        if k.to_lowercase() == search_key {
                            if let Some(msg) = v.get("message").and_then(|m| m.as_str()) {
                                if !msg.is_empty() {
                                    return Some(msg.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

fn extract_extension_icon(manifest_json: &serde_json::Value, version_dir: &Path) -> Option<String> {
    use base64::engine::general_purpose::STANDARD as BASE64;
    use base64::Engine;

    let mut candidate_rel_paths: Vec<&str> = Vec::new();

    // 1. Check "icons" in manifest
    if let Some(icons_obj) = manifest_json.get("icons").and_then(|i| i.as_object()) {
        for size_key in &["128", "96", "64", "48", "32", "16"] {
            if let Some(path_str) = icons_obj.get(*size_key).and_then(|p| p.as_str()) {
                candidate_rel_paths.push(path_str);
            }
        }
        for (_k, v) in icons_obj {
            if let Some(path_str) = v.as_str() {
                if !candidate_rel_paths.contains(&path_str) {
                    candidate_rel_paths.push(path_str);
                }
            }
        }
    } else if let Some(single_icon) = manifest_json.get("icons").and_then(|i| i.as_str()) {
        candidate_rel_paths.push(single_icon);
    }

    // 2. Check "action" or "browser_action" default_icon
    for action_key in &["action", "browser_action", "page_action"] {
        if let Some(action_obj) = manifest_json.get(action_key) {
            if let Some(default_icon) = action_obj.get("default_icon") {
                if let Some(single) = default_icon.as_str() {
                    candidate_rel_paths.push(single);
                } else if let Some(obj) = default_icon.as_object() {
                    for size_key in &["128", "48", "32", "16"] {
                        if let Some(p) = obj.get(*size_key).and_then(|s| s.as_str()) {
                            candidate_rel_paths.push(p);
                        }
                    }
                }
            }
        }
    }

    // Try manifest candidates
    for rel_path in candidate_rel_paths {
        let clean_rel = rel_path.trim_start_matches('/').trim_start_matches("./");
        let full_path = version_dir.join(clean_rel);
        if full_path.is_file() {
            if let Ok(bytes) = fs::read(&full_path) {
                if !bytes.is_empty() {
                    let mime = if clean_rel.ends_with(".svg") {
                        "image/svg+xml"
                    } else if clean_rel.ends_with(".webp") {
                        "image/webp"
                    } else if clean_rel.ends_with(".jpg") || clean_rel.ends_with(".jpeg") {
                        "image/jpeg"
                    } else {
                        "image/png"
                    };
                    return Some(format!("data:{};base64,{}", mime, BASE64.encode(&bytes)));
                }
            }
        }
    }

    // 3. Common fallback filenames
    let common_names = [
        "icon128.png", "icon-128.png", "icon_128.png",
        "icon48.png", "icon-48.png", "icon_48.png",
        "icon32.png", "icon.png", "logo.png",
        "icons/icon128.png", "icons/icon-128.png", "icons/icon48.png", "icons/icon.png",
        "images/icon128.png", "images/icon-128.png", "images/icon48.png", "images/icon.png",
        "assets/icon128.png", "assets/icon.png"
    ];

    for name in &common_names {
        let p = version_dir.join(name);
        if p.is_file() {
            if let Ok(bytes) = fs::read(&p) {
                if !bytes.is_empty() {
                    return Some(format!("data:image/png;base64,{}", BASE64.encode(&bytes)));
                }
            }
        }
    }

    None
}

fn parse_manifest_name(manifest_path: &Path, version_dir: &Path, default_name: &str) -> (String, String, String, Option<String>) {
    if let Ok(content) = fs::read_to_string(manifest_path) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            let mut name = json["name"].as_str().unwrap_or(default_name).to_string();
            let version = json["version"].as_str().unwrap_or("1.0.0").to_string();
            let mut desc = json["description"].as_str().unwrap_or("").to_string();
            let default_locale = json["default_locale"].as_str().unwrap_or("en");

            // Handle localized extension name
            if name.starts_with("__MSG_") && name.ends_with("__") && name.len() > 8 {
                let key = &name[6..name.len() - 2];
                if let Some(resolved) = resolve_i18n_message(version_dir, key, default_locale) {
                    name = resolved;
                } else if let Some(short_name) = json["short_name"].as_str() {
                    if !short_name.starts_with("__MSG_") {
                        name = short_name.to_string();
                    } else {
                        name = default_name.to_string();
                    }
                } else {
                    name = default_name.to_string();
                }
            }

            // Handle localized description
            if desc.starts_with("__MSG_") && desc.ends_with("__") && desc.len() > 8 {
                let key = &desc[6..desc.len() - 2];
                if let Some(resolved) = resolve_i18n_message(version_dir, key, default_locale) {
                    desc = resolved;
                } else {
                    desc = String::new();
                }
            }

            let icon_data_url = extract_extension_icon(&json, version_dir);

            return (name, version, desc, icon_data_url);
        }
    }
    (default_name.to_string(), "1.0.0".to_string(), String::new(), None)
}

#[tauri::command]
pub fn scan_browser_and_system_plugins() -> PluginScanReport {
    let mut items = Vec::new();
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/Users/Shared"));
    let mut permission_denied = false;

    // 1. Chromium-based browsers
    let chromium_roots = [
        ("Google Chrome", home.join("Library/Application Support/Google/Chrome")),
        ("Google Chrome Canary", home.join("Library/Application Support/Google/Chrome Canary")),
        ("Brave Browser", home.join("Library/Application Support/BraveSoftware/Brave-Browser")),
        ("Arc Browser", home.join("Library/Application Support/Arc/User Data")),
        ("Microsoft Edge", home.join("Library/Application Support/Microsoft Edge")),
        ("Vivaldi", home.join("Library/Application Support/Vivaldi")),
        ("Chromium", home.join("Library/Application Support/Chromium")),
    ];

    for (browser_name, browser_root) in chromium_roots {
        match fs::metadata(&browser_root) {
            Ok(_) => {},
            Err(err) => {
                if err.kind() == std::io::ErrorKind::PermissionDenied || err.raw_os_error() == Some(1) {
                    permission_denied = true;
                }
                continue;
            }
        }

        let mut ext_dirs = Vec::new();

        // Check if root has direct Extensions folder
        let direct_ext = browser_root.join("Extensions");
        if direct_ext.exists() {
            ext_dirs.push((browser_name.to_string(), direct_ext));
        }

        // Iterate profiles inside browser user data directory
        match fs::read_dir(&browser_root) {
            Ok(entries) => {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_dir() {
                        let name = entry.file_name().to_string_lossy().to_string();
                        if name == "Default" || name.starts_with("Profile ") || name == "Guest Profile" {
                            let ext_dir = path.join("Extensions");
                            if ext_dir.exists() {
                                let label = if name == "Default" {
                                    browser_name.to_string()
                                } else {
                                    format!("{} ({})", browser_name, name)
                                };
                                ext_dirs.push((label, ext_dir));
                            }
                        }
                    }
                }
            }
            Err(err) => {
                if err.kind() == std::io::ErrorKind::PermissionDenied || err.raw_os_error() == Some(1) {
                    permission_denied = true;
                }
            }
        }

        for (profile_label, ext_dir) in ext_dirs {
            if let Ok(ext_entries) = fs::read_dir(&ext_dir) {
                for ext_entry in ext_entries.flatten() {
                    let ext_path = ext_entry.path();
                    if ext_path.is_dir() {
                        let ext_id = ext_path.file_name().unwrap_or_default().to_string_lossy().to_string();
                        // Each extension directory contains version subfolders
                        if let Ok(version_entries) = fs::read_dir(&ext_path) {
                            for v_entry in version_entries.flatten() {
                                let v_path = v_entry.path();
                                if v_path.is_dir() {
                                    let manifest = v_path.join("manifest.json");
                                    if manifest.exists() {
                                        let (name, ver, desc, icon_url) = parse_manifest_name(&manifest, &v_path, &ext_id);
                                        let size = calculate_dir_size(&ext_path);
                                        items.push(ExtensionItem {
                                            id: format!("{}_{}", profile_label, ext_id),
                                            name,
                                            version: ver,
                                            description: desc,
                                            browser_or_type: profile_label.clone(),
                                            path: ext_path.to_string_lossy().to_string(),
                                            size_bytes: size,
                                            is_system_plugin: false,
                                            icon_data_url: icon_url,
                                        });
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                permission_denied = true;
            }
        }
    }

    // 2. Gecko-based browsers (Firefox, Zen)
    let firefox_roots = [
        ("Firefox", home.join("Library/Application Support/Firefox/Profiles")),
        ("Zen Browser", home.join("Library/Application Support/zen/Profiles")),
    ];

    for (browser_name, profiles_dir) in firefox_roots {
        if let Ok(entries) = fs::read_dir(&profiles_dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_dir() {
                    let ext_dir = p.join("extensions");
                    if ext_dir.exists() {
                        if let Ok(ext_entries) = fs::read_dir(&ext_dir) {
                            for ext_entry in ext_entries.flatten() {
                                let ext_path = ext_entry.path();
                                let file_name = ext_path.file_name().unwrap_or_default().to_string_lossy().to_string();
                                if ext_path.is_dir() {
                                    let manifest = ext_path.join("manifest.json");
                                    if manifest.exists() {
                                        let (name, ver, desc, icon_url) = parse_manifest_name(&manifest, &ext_path, &file_name);
                                        let size = calculate_dir_size(&ext_path);
                                        items.push(ExtensionItem {
                                            id: format!("{}_{}", browser_name, file_name),
                                            name,
                                            version: ver,
                                            description: desc,
                                            browser_or_type: browser_name.to_string(),
                                            path: ext_path.to_string_lossy().to_string(),
                                            size_bytes: size,
                                            is_system_plugin: false,
                                            icon_data_url: icon_url,
                                        });
                                    }
                                } else if file_name.ends_with(".xpi") {
                                    let size = ext_entry.metadata().map(|m| m.len()).unwrap_or(0);
                                    let clean_name = file_name.trim_end_matches(".xpi").to_string();
                                    items.push(ExtensionItem {
                                        id: format!("{}_{}", browser_name, file_name),
                                        name: clean_name,
                                        version: "XPI Package".to_string(),
                                        description: format!("Firefox packaged add-on: {}", file_name),
                                        browser_or_type: browser_name.to_string(),
                                        path: ext_path.to_string_lossy().to_string(),
                                        size_bytes: size,
                                        is_system_plugin: false,
                                        icon_data_url: None,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. macOS System Plugins
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
                        icon_data_url: None,
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
        permission_denied,
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
