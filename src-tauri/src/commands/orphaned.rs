use crate::commands::cleaner::calculate_dir_size;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use std::time::SystemTime;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrphanedLeftoverItem {
    pub id: String,
    pub path: String,
    pub name: String,
    #[serde(rename = "inferredApp")]
    pub inferred_app: String,
    pub kind: String, // "Application Support", "Caches", "Saved State", "Preferences", "Containers"
    pub size: u64,
    #[serde(rename = "lastModified")]
    pub last_modified: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrphanedScanResult {
    pub items: Vec<OrphanedLeftoverItem>,
    #[serde(rename = "totalSize")]
    pub total_size: u64,
    #[serde(rename = "totalCount")]
    pub total_count: usize,
}

fn dirs_home() -> String {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "/Users/Shared".to_string())
}

/// Helper to get all installed application names and bundle IDs
fn get_installed_app_identifiers() -> (HashSet<String>, HashSet<String>) {
    let mut names = HashSet::new();
    let mut bundle_ids = HashSet::new();

    let app_dirs = [
        PathBuf::from("/Applications"),
        PathBuf::from("/System/Applications"),
        PathBuf::from(dirs_home()).join("Applications"),
    ];

    for dir in &app_dirs {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("app") {
                    if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                        names.insert(stem.to_lowercase());
                    }
                    let plist_path = path.join("Contents/Info.plist");
                    if let Ok(content) = fs::read_to_string(&plist_path) {
                        if let Some(id) = extract_bundle_id(&content) {
                            bundle_ids.insert(id.to_lowercase());
                        }
                    }
                }
            }
        }
    }

    (names, bundle_ids)
}

fn extract_bundle_id(xml: &str) -> Option<String> {
    let pattern = "<key>CFBundleIdentifier</key>";
    if let Some(pos) = xml.find(pattern) {
        let after_key = &xml[pos + pattern.len()..];
        if let Some(str_start) = after_key.find("<string>") {
            let after_str = &after_key[str_start + 8..];
            if let Some(str_end) = after_str.find("</string>") {
                let val = after_str[..str_end].trim();
                if !val.is_empty() {
                    return Some(val.to_string());
                }
            }
        }
    }
    None
}

/// Returns true if an identifier is a standard Apple macOS system component
fn is_system_apple_identifier(name: &str) -> bool {
    let n = name.to_lowercase();
    n.starts_with("com.apple.")
        || n.starts_with("apple")
        || n == "clouddocs"
        || n == "mobilesync"
        || n == "addressbook"
        || n == "accounts"
        || n == "callhistorydb"
        || n == "identityservices"
        || n == "quick look"
        || n == "messages"
        || n == "mail"
        || n == "siri"
        || n == "safari"
        || n == "photos"
        || n == "finder"
        || n == "dock"
        || n == "system preferences"
        || n == "system settings"
        || n == "keychain"
        || n == "containers"
        || n == "preferences"
        || n == "caches"
}

fn format_modified(time: SystemTime) -> String {
    let duration = SystemTime::now()
        .duration_since(time)
        .unwrap_or_default();
    let days = duration.as_secs() / 86400;
    if days == 0 {
        "Today".to_string()
    } else if days == 1 {
        "Yesterday".to_string()
    } else if days < 30 {
        format!("{} days ago", days)
    } else if days < 365 {
        format!("{} months ago", days / 30)
    } else {
        format!("{} years ago", days / 365)
    }
}

#[tauri::command]
pub fn scan_orphaned_leftovers() -> Result<OrphanedScanResult, String> {
    let home = dirs_home();
    let lib = PathBuf::from(&home).join("Library");
    let (installed_names, installed_bundle_ids) = get_installed_app_identifiers();

    // Scan locations
    let targets: Vec<(PathBuf, &str)> = vec![
        (lib.join("Application Support"), "Application Support"),
        (lib.join("Caches"), "Caches"),
        (lib.join("Saved Application State"), "Saved State"),
        (lib.join("Preferences"), "Preferences"),
        (lib.join("Containers"), "Containers"),
    ];

    let mut potential_items: Vec<(PathBuf, String, String)> = vec![];

    for (dir, kind) in targets {
        if !dir.exists() {
            continue;
        }

        if let Ok(entries) = fs::read_dir(&dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                let file_name = entry.file_name().to_string_lossy().to_string();

                // Skip hidden files
                if file_name.starts_with('.') {
                    continue;
                }

                // Check against system components
                if is_system_apple_identifier(&file_name) {
                    continue;
                }

                // Clean name for bundle ID or normal folder
                let clean_name = if file_name.ends_with(".savedState") {
                    file_name.trim_end_matches(".savedState").to_string()
                } else if file_name.ends_with(".plist") {
                    file_name.trim_end_matches(".plist").to_string()
                } else {
                    file_name.clone()
                };

                let lower_clean = clean_name.to_lowercase();

                // Check if belongs to an installed app
                let matches_installed = installed_bundle_ids.contains(&lower_clean)
                    || installed_names.iter().any(|n| {
                        lower_clean == *n
                            || lower_clean.starts_with(&format!("{}.", n))
                            || lower_clean.ends_with(&format!(".{}", n))
                            || lower_clean.contains(&format!("-{}", n))
                    });

                if !matches_installed {
                    // Inferred app name from bundle ID (e.g. "com.spotify.client" -> "Spotify")
                    let inferred = if clean_name.contains('.') {
                        clean_name
                            .split('.')
                            .nth(1)
                            .unwrap_or(&clean_name)
                            .to_string()
                    } else {
                        clean_name.clone()
                    };

                    potential_items.push((path, kind.to_string(), inferred));
                }
            }
        }
    }

    // Parallel size calculation and metadata collection
    let items: Vec<OrphanedLeftoverItem> = potential_items
        .into_par_iter()
        .filter_map(|(path, kind, inferred_app)| {
            let size = if path.is_dir() {
                calculate_dir_size(&path)
            } else if let Ok(meta) = path.metadata() {
                meta.len()
            } else {
                0
            };

            // Only report items with non-trivial size (> 100 KB)
            if size < 100_000 {
                return None;
            }

            let last_modified = path
                .metadata()
                .and_then(|m| m.modified())
                .map(format_modified)
                .unwrap_or_else(|_| "Unknown".to_string());

            let name = path
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_default();

            Some(OrphanedLeftoverItem {
                id: path.to_string_lossy().to_string(),
                path: path.to_string_lossy().to_string(),
                name,
                inferred_app,
                kind,
                size,
                last_modified,
            })
        })
        .collect();

    let total_size = items.iter().map(|i| i.size).sum();
    let total_count = items.len();

    Ok(OrphanedScanResult {
        items,
        total_size,
        total_count,
    })
}

#[tauri::command]
pub fn clean_orphaned_leftovers(paths: Vec<String>) -> Result<usize, String> {
    let mut cleaned = 0;
    for p_str in paths {
        let path = PathBuf::from(&p_str);
        if !path.exists() {
            continue;
        }

        // Extra safety check: never delete roots or system folders
        if is_system_apple_identifier(&path.file_name().unwrap_or_default().to_string_lossy()) {
            continue;
        }

        if path.is_dir() {
            if fs::remove_dir_all(&path).is_ok() {
                cleaned += 1;
            }
        } else if fs::remove_file(&path).is_ok() {
            cleaned += 1;
        }
    }
    Ok(cleaned)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_apple_identifier_whitelisting() {
        assert!(is_system_apple_identifier("com.apple.finder"));
        assert!(is_system_apple_identifier("com.apple.Safari"));
        assert!(is_system_apple_identifier("MobileSync"));
        assert!(is_system_apple_identifier("CloudDocs"));
        assert!(!is_system_apple_identifier("Slack"));
        assert!(!is_system_apple_identifier("Postman"));
        assert!(!is_system_apple_identifier("com.spotify.client"));
    }
}
