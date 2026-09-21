use crate::commands::cleaner::{calculate_dir_size, get_allocated_size};
use crate::utils::is_whitelisted;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppLeftoverItem {
    pub path: String,
    pub name: String,
    pub kind: String, // "app_support", "cache", "preferences", "saved_state", "container"
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppItem {
    pub id: String,
    pub name: String,
    #[serde(rename = "bundleId")]
    pub bundle_id: String,
    pub version: String,
    pub path: String,
    #[serde(rename = "appSize")]
    pub app_size: u64,
    #[serde(rename = "leftoversSize")]
    pub leftovers_size: u64,
    #[serde(rename = "totalSize")]
    pub total_size: u64,
    #[serde(rename = "lastModified")]
    pub last_modified: String,
    #[serde(rename = "isSystemApp")]
    pub is_system_app: bool,
    pub icon: Option<String>,
    pub leftovers: Vec<AppLeftoverItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UninstallResult {
    #[serde(rename = "freedBytes")]
    pub freed_bytes: u64,
    #[serde(rename = "deletedCount")]
    pub deleted_count: usize,
    #[serde(rename = "isSimulation")]
    pub is_simulation: bool,
    pub errors: Vec<String>,
}

/// Helper to parse XML Info.plist for app metadata
fn parse_info_plist(plist_path: &Path) -> (Option<String>, Option<String>, Option<String>) {
    if let Ok(content) = fs::read_to_string(plist_path) {
        let bundle_id = extract_plist_string(&content, "CFBundleIdentifier");
        let version = extract_plist_string(&content, "CFBundleShortVersionString")
            .or_else(|| extract_plist_string(&content, "CFBundleVersion"));
        let name = extract_plist_string(&content, "CFBundleDisplayName")
            .or_else(|| extract_plist_string(&content, "CFBundleName"));
        (name, bundle_id, version)
    } else {
        (None, None, None)
    }
}

fn extract_plist_string(xml: &str, key: &str) -> Option<String> {
    let pattern = format!("<key>{}</key>", key);
    if let Some(pos) = xml.find(&pattern) {
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

/// Find residual leftover files in user's ~/Library
fn find_app_leftovers(home: &str, app_name: &str, bundle_id: &str) -> Vec<AppLeftoverItem> {
    let mut leftovers = vec![];
    let mut seen_paths = HashSet::new();

    let lib = PathBuf::from(home).join("Library");

    // 1. Application Support
    let app_support = lib.join("Application Support");
    if !bundle_id.is_empty() {
        let p = app_support.join(bundle_id);
        add_leftover_if_exists(&p, "Application Support", "app_support", &mut leftovers, &mut seen_paths);
    }
    if !app_name.is_empty() {
        let p = app_support.join(app_name);
        add_leftover_if_exists(&p, "Application Support", "app_support", &mut leftovers, &mut seen_paths);
    }

    // 2. Caches
    let caches = lib.join("Caches");
    if !bundle_id.is_empty() {
        let p = caches.join(bundle_id);
        add_leftover_if_exists(&p, "Caches", "cache", &mut leftovers, &mut seen_paths);
    }
    if !app_name.is_empty() {
        let p = caches.join(app_name);
        add_leftover_if_exists(&p, "Caches", "cache", &mut leftovers, &mut seen_paths);
    }

    // 3. Preferences (.plist)
    let prefs = lib.join("Preferences");
    if !bundle_id.is_empty() {
        let p = prefs.join(format!("{}.plist", bundle_id));
        add_leftover_if_exists(&p, "Preferences", "preferences", &mut leftovers, &mut seen_paths);
    }

    // 4. Saved Application State
    let state = lib.join("Saved Application State");
    if !bundle_id.is_empty() {
        let p = state.join(format!("{}.savedState", bundle_id));
        add_leftover_if_exists(&p, "Saved State", "saved_state", &mut leftovers, &mut seen_paths);
    }

    // 5. Containers
    let containers = lib.join("Containers");
    if !bundle_id.is_empty() {
        let p = containers.join(bundle_id);
        add_leftover_if_exists(&p, "Sandbox Container", "container", &mut leftovers, &mut seen_paths);
    }

    leftovers
}

fn add_leftover_if_exists(
    path: &Path,
    category_name: &str,
    kind: &str,
    leftovers: &mut Vec<AppLeftoverItem>,
    seen_paths: &mut HashSet<String>,
) {
    if !path.exists() {
        return;
    }
    let path_str = path.to_string_lossy().to_string();
    if seen_paths.contains(&path_str) {
        return;
    }
    seen_paths.insert(path_str.clone());

    let size = if path.is_dir() {
        calculate_dir_size(path)
    } else if let Ok(m) = path.metadata() {
        get_allocated_size(&m)
    } else {
        0
    };

    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(category_name)
        .to_string();

    leftovers.push(AppLeftoverItem {
        path: path_str,
        name,
        kind: kind.to_string(),
        size,
    });
}

/// Extract app icon from Resources and convert to 64x64 PNG base64
fn get_app_icon_base64(app_path: &Path, bundle_id: &str, cache_dir: &Path) -> Option<String> {
    use base64::Engine;

    let safe_id = if bundle_id.is_empty() {
        app_path.file_stem().and_then(|s| s.to_str()).unwrap_or("app")
    } else {
        bundle_id
    };
    let cache_file = cache_dir.join(format!("{}.png", safe_id));

    // 1. Check if already cached
    if cache_file.exists() {
        if let Ok(bytes) = fs::read(&cache_file) {
            let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
            return Some(format!("data:image/png;base64,{}", b64));
        }
    }

    // 2. Find .icns file
    let resources_dir = app_path.join("Contents").join("Resources");
    if !resources_dir.exists() {
        return None;
    }

    let mut icns_path: Option<PathBuf> = None;
    let plist_path = app_path.join("Contents").join("Info.plist");
    if let Ok(content) = fs::read_to_string(&plist_path) {
        if let Some(icon_name) = extract_plist_string(&content, "CFBundleIconFile") {
            let file_name = if icon_name.ends_with(".icns") {
                icon_name
            } else {
                format!("{}.icns", icon_name)
            };
            let candidate = resources_dir.join(&file_name);
            if candidate.exists() {
                icns_path = Some(candidate);
            }
        }
    }

    if icns_path.is_none() {
        if let Ok(entries) = fs::read_dir(&resources_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let p = entry.path();
                if p.extension().and_then(|s| s.to_str()) == Some("icns") {
                    icns_path = Some(p);
                    break;
                }
            }
        }
    }

    let icns = icns_path?;

    // 3. Convert with macOS native sips
    let _ = fs::create_dir_all(cache_dir);
    let output = std::process::Command::new("/usr/bin/sips")
        .arg("-s")
        .arg("format")
        .arg("png")
        .arg("--resampleWidth")
        .arg("64")
        .arg(&icns)
        .arg("--out")
        .arg(&cache_file)
        .output();

    if let Ok(out) = output {
        if out.status.success() && cache_file.exists() {
            if let Ok(bytes) = fs::read(&cache_file) {
                let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
                return Some(format!("data:image/png;base64,{}", b64));
            }
        }
    }

    None
}

/// Check if an app is a protected system application
fn is_system_application(path: &str, bundle_id: &str) -> bool {
    if path.starts_with("/System") {
        return true;
    }
    // Apple core apps in /Applications
    let protected_bundle_prefixes = [
        "com.apple.Safari",
        "com.apple.finder",
        "com.apple.systempreferences",
        "com.apple.Music",
        "com.apple.TV",
        "com.apple.podcasts",
        "com.apple.AppStore",
        "com.apple.Preview",
        "com.apple.QuickTimePlayerX",
        "com.apple.TextEdit",
        "com.apple.Photos",
        "com.apple.Notes",
        "com.apple.reminders",
        "com.apple.mail",
        "com.apple.iCal",
        "com.apple.AddressBook",
    ];

    for prefix in &protected_bundle_prefixes {
        if bundle_id.starts_with(prefix) {
            return true;
        }
    }

    false
}

/// Scan all installed applications on the system
#[tauri::command]
pub fn scan_installed_apps() -> Result<Vec<AppItem>, String> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/Shared".to_string());
    let cache_dir = PathBuf::from(&home).join(".cache").join("beberes").join("icons");

    let mut search_dirs = vec![
        PathBuf::from("/Applications"),
        PathBuf::from(&home).join("Applications"),
    ];

    // Also include /System/Applications for inspection
    let system_apps = PathBuf::from("/System/Applications");
    if system_apps.exists() {
        search_dirs.push(system_apps);
    }

    let mut app_paths = vec![];

    for dir in search_dirs {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let p = entry.path();
                if p.is_dir() && p.extension().and_then(|s| s.to_str()) == Some("app") {
                    app_paths.push(p);
                }
            }
        }
    }

    // Process apps in parallel with Rayon
    let mut apps: Vec<AppItem> = app_paths
        .par_iter()
        .filter_map(|app_path| {
            let path_str = app_path.to_string_lossy().to_string();
            let default_name = app_path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Unknown App")
                .to_string();

            let plist_path = app_path.join("Contents").join("Info.plist");
            let (parsed_name, bundle_id_opt, version_opt) = parse_info_plist(&plist_path);

            let name = parsed_name.unwrap_or(default_name);
            let bundle_id = bundle_id_opt.unwrap_or_default();
            let version = version_opt.unwrap_or_else(|| "1.0".to_string());

            let is_system = is_system_application(&path_str, &bundle_id);

            let app_size = calculate_dir_size(app_path);
            let leftovers = if !is_system {
                find_app_leftovers(&home, &name, &bundle_id)
            } else {
                vec![]
            };

            let leftovers_size: u64 = leftovers.iter().map(|l| l.size).sum();
            let total_size = app_size + leftovers_size;

            let last_modified = app_path
                .metadata()
                .ok()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.elapsed().ok())
                .map(|dur| {
                    let days = dur.as_secs() / 86400;
                    if days == 0 {
                        "Today".to_string()
                    } else if days == 1 {
                        "Yesterday".to_string()
                    } else {
                        format!("{} days ago", days)
                    }
                })
                .unwrap_or_else(|| "Unknown".to_string());

            let icon = get_app_icon_base64(app_path, &bundle_id, &cache_dir);

            Some(AppItem {
                id: format!("{}_{}", name, bundle_id),
                name,
                bundle_id,
                version,
                path: path_str,
                app_size,
                leftovers_size,
                total_size,
                last_modified,
                is_system_app: is_system,
                icon,
                leftovers,
            })
        })
        .collect();

    // Sort by total size descending
    apps.sort_by_key(|a| std::cmp::Reverse(a.total_size));

    Ok(apps)
}

/// Safely uninstall an application and its chosen residual leftover files
#[tauri::command]
pub fn uninstall_app(
    app_path: String,
    leftover_paths: Vec<String>,
    dry_run: Option<bool>,
    use_trash: Option<bool>,
) -> Result<UninstallResult, String> {
    let is_simulation = dry_run.unwrap_or(false);
    let to_trash = use_trash.unwrap_or(true);
    let app = Path::new(&app_path);

    if !app.exists() {
        return Err(format!("Application does not exist: {}", app_path));
    }

    if is_system_application(&app_path, "") || app_path.starts_with("/System") {
        return Err("Cannot uninstall macOS system-protected application".to_string());
    }

    if is_whitelisted(&app_path) {
        return Err(format!("Cannot uninstall whitelisted path: {}", app_path));
    }

    let mut freed_bytes: u64 = 0;
    let mut deleted_count: usize = 0;
    let mut errors: Vec<String> = vec![];

    // Calculate app size
    let app_size = calculate_dir_size(app);
    freed_bytes += app_size;
    deleted_count += 1;

    // Calculate leftovers size
    for p_str in &leftover_paths {
        let p = Path::new(p_str);
        if p.exists() && !is_whitelisted(p_str) {
            let size = if p.is_dir() {
                calculate_dir_size(p)
            } else if let Ok(m) = p.metadata() {
                get_allocated_size(&m)
            } else {
                0
            };
            freed_bytes += size;
            deleted_count += 1;
        }
    }

    if is_simulation {
        return Ok(UninstallResult {
            freed_bytes,
            deleted_count,
            is_simulation: true,
            errors,
        });
    }

    // 1. Delete or Trash the main .app bundle
    if to_trash {
        let trash_cmd = std::process::Command::new("osascript")
            .arg("-e")
            .arg(format!("tell application \"Finder\" to delete POSIX file \"{}\"", app_path))
            .output();

        let app_trashed = matches!(trash_cmd, Ok(out) if out.status.success());

        if !app_trashed {
            // Fallback to permanent directory removal if trash fails
            if let Err(e) = fs::remove_dir_all(app) {
                errors.push(format!("Failed to remove app bundle: {}", e));
            }
        }
    } else {
        // Direct permanent delete
        if let Err(e) = fs::remove_dir_all(app) {
            errors.push(format!("Failed to remove app bundle: {}", e));
        }
    }

    // 2. Remove selected leftovers
    for p_str in leftover_paths {
        if is_whitelisted(&p_str) {
            continue;
        }
        let p = Path::new(&p_str);
        if !p.exists() {
            continue;
        }

        if to_trash {
            let trash_cmd = std::process::Command::new("osascript")
                .arg("-e")
                .arg(format!("tell application \"Finder\" to delete POSIX file \"{}\"", p_str))
                .output();

            let trashed = matches!(trash_cmd, Ok(out) if out.status.success());

            if !trashed {
                let res = if p.is_dir() {
                    fs::remove_dir_all(p)
                } else {
                    fs::remove_file(p)
                };
                if let Err(e) = res {
                    errors.push(format!("Failed to remove leftover {}: {}", p_str, e));
                }
            }
        } else {
            let res = if p.is_dir() {
                fs::remove_dir_all(p)
            } else {
                fs::remove_file(p)
            };

            if let Err(e) = res {
                errors.push(format!("Failed to remove leftover {}: {}", p_str, e));
            }
        }
    }

    Ok(UninstallResult {
        freed_bytes,
        deleted_count,
        is_simulation: false,
        errors,
    })
}
