use crate::commands::scanner::{ScanCategory, ScanItem};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use walkdir::WalkDir;

fn gen_id() -> String {
    use std::time::UNIX_EPOCH;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{:x}", now)
}

fn last_modified_str(path: &Path) -> String {
    if let Ok(meta) = fs::metadata(path) {
        if let Ok(time) = meta.modified() {
            if let Ok(dur) = SystemTime::now().duration_since(time) {
                let secs = dur.as_secs();
                let days = secs / 86400;
                if days > 0 {
                    return format!("{}d ago", days);
                }
                let hours = secs / 3600;
                if hours > 0 {
                    return format!("{}h ago", hours);
                }
                return "Just now".to_string();
            }
        }
    }
    "Unknown".to_string()
}

fn dir_size(path: &Path) -> u64 {
    if !path.exists() {
        return 0;
    }
    if path.is_file() {
        return path.metadata().map(|m| m.len()).unwrap_or(0);
    }
    WalkDir::new(path)
        .max_depth(5)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .map(|e| e.metadata().map(|m| m.len()).unwrap_or(0))
        .sum()
}

/// Scan deep browser caches for Safari, Chrome, Arc, Brave, Firefox, and Edge.
#[tauri::command]
pub fn scan_browser_caches() -> Vec<ScanCategory> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/Shared".to_string());
    let mut categories = Vec::new();

    // 1. Apple Safari
    let safari_targets = [
        (PathBuf::from(&home).join("Library/Caches/com.apple.Safari"), "Safari Network & App Cache"),
        (PathBuf::from(&home).join("Library/Containers/com.apple.Safari/Data/Library/Caches"), "Safari Container Cache"),
        (PathBuf::from(&home).join("Library/Caches/com.apple.WebKit.WebContent"), "WebKit WebContent Cache"),
    ];
    let mut safari_items = Vec::new();
    for (path, label) in &safari_targets {
        if path.exists() {
            let size = dir_size(path);
            if size > 1_000_000 {
                safari_items.push(ScanItem {
                    id: gen_id(),
                    path: path.to_string_lossy().to_string(),
                    name: label.to_string(),
                    size,
                    last_modified: last_modified_str(path),
                    category: "browser_safari".to_string(),
                    selected: false,
                });
            }
        }
    }
    if !safari_items.is_empty() {
        let size: u64 = safari_items.iter().map(|i| i.size).sum();
        categories.push(ScanCategory {
            id: "browser_safari".to_string(),
            name: "Apple Safari Cache".to_string(),
            icon: "compass".to_string(),
            size,
            items: safari_items,
            selected: false,
        });
    }

    // 2. Google Chrome
    let chrome_targets = [
        (PathBuf::from(&home).join("Library/Caches/Google/Chrome/Default/Cache"), "Chrome Network Cache"),
        (PathBuf::from(&home).join("Library/Application Support/Google/Chrome/Default/GPUCache"), "Chrome GPU Shader Cache"),
        (PathBuf::from(&home).join("Library/Application Support/Google/Chrome/Default/Service Worker/CacheStorage"), "Chrome Service Worker Cache"),
        (PathBuf::from(&home).join("Library/Application Support/Google/Chrome/ShaderCache"), "Chrome Driver Shaders"),
        (PathBuf::from(&home).join("Library/Application Support/Google/Chrome/Crashpad"), "Chrome Crashpad Logs"),
    ];
    let mut chrome_items = Vec::new();
    for (path, label) in &chrome_targets {
        if path.exists() {
            let size = dir_size(path);
            if size > 1_000_000 {
                chrome_items.push(ScanItem {
                    id: gen_id(),
                    path: path.to_string_lossy().to_string(),
                    name: label.to_string(),
                    size,
                    last_modified: last_modified_str(path),
                    category: "browser_chrome".to_string(),
                    selected: false,
                });
            }
        }
    }
    if !chrome_items.is_empty() {
        let size: u64 = chrome_items.iter().map(|i| i.size).sum();
        categories.push(ScanCategory {
            id: "browser_chrome".to_string(),
            name: "Google Chrome Cache".to_string(),
            icon: "chrome".to_string(),
            size,
            items: chrome_items,
            selected: false,
        });
    }

    // 3. Arc Browser
    let arc_targets = [
        (PathBuf::from(&home).join("Library/Caches/company.thebrowser.Browser"), "Arc App Cache"),
        (PathBuf::from(&home).join("Library/Application Support/Arc/User Data/Default/Cache"), "Arc Network Cache"),
        (PathBuf::from(&home).join("Library/Application Support/Arc/User Data/Default/GPUCache"), "Arc GPU Cache"),
        (PathBuf::from(&home).join("Library/Application Support/Arc/User Data/Default/Service Worker/CacheStorage"), "Arc Service Worker Cache"),
        (PathBuf::from(&home).join("Library/Application Support/Arc/User Data/ShaderCache"), "Arc Shader Cache"),
    ];
    let mut arc_items = Vec::new();
    for (path, label) in &arc_targets {
        if path.exists() {
            let size = dir_size(path);
            if size > 1_000_000 {
                arc_items.push(ScanItem {
                    id: gen_id(),
                    path: path.to_string_lossy().to_string(),
                    name: label.to_string(),
                    size,
                    last_modified: last_modified_str(path),
                    category: "browser_arc".to_string(),
                    selected: false,
                });
            }
        }
    }
    if !arc_items.is_empty() {
        let size: u64 = arc_items.iter().map(|i| i.size).sum();
        categories.push(ScanCategory {
            id: "browser_arc".to_string(),
            name: "Arc Browser Cache".to_string(),
            icon: "arc".to_string(),
            size,
            items: arc_items,
            selected: false,
        });
    }

    // 4. Brave Browser
    let brave_targets = [
        (PathBuf::from(&home).join("Library/Caches/BraveSoftware/Brave-Browser"), "Brave App Cache"),
        (PathBuf::from(&home).join("Library/Application Support/BraveSoftware/Brave-Browser/Default/Cache"), "Brave Network Cache"),
        (PathBuf::from(&home).join("Library/Application Support/BraveSoftware/Brave-Browser/Default/GPUCache"), "Brave GPU Cache"),
        (PathBuf::from(&home).join("Library/Application Support/BraveSoftware/Brave-Browser/Default/Service Worker/CacheStorage"), "Brave Service Worker Cache"),
    ];
    let mut brave_items = Vec::new();
    for (path, label) in &brave_targets {
        if path.exists() {
            let size = dir_size(path);
            if size > 1_000_000 {
                brave_items.push(ScanItem {
                    id: gen_id(),
                    path: path.to_string_lossy().to_string(),
                    name: label.to_string(),
                    size,
                    last_modified: last_modified_str(path),
                    category: "browser_brave".to_string(),
                    selected: false,
                });
            }
        }
    }
    if !brave_items.is_empty() {
        let size: u64 = brave_items.iter().map(|i| i.size).sum();
        categories.push(ScanCategory {
            id: "browser_brave".to_string(),
            name: "Brave Browser Cache".to_string(),
            icon: "shield".to_string(),
            size,
            items: brave_items,
            selected: false,
        });
    }

    // 5. Mozilla Firefox
    let firefox_profiles = PathBuf::from(&home).join("Library/Caches/Firefox/Profiles");
    let mut firefox_items = Vec::new();
    if firefox_profiles.exists() {
        if let Ok(entries) = fs::read_dir(&firefox_profiles) {
            for entry in entries.filter_map(|e| e.ok()) {
                let cache2 = entry.path().join("cache2");
                if cache2.exists() {
                    let size = dir_size(&cache2);
                    if size > 1_000_000 {
                        firefox_items.push(ScanItem {
                            id: gen_id(),
                            path: cache2.to_string_lossy().to_string(),
                            name: format!("Firefox Profile Cache ({})", entry.file_name().to_string_lossy()),
                            size,
                            last_modified: last_modified_str(&cache2),
                            category: "browser_firefox".to_string(),
                            selected: false,
                        });
                    }
                }
            }
        }
    }
    if !firefox_items.is_empty() {
        let size: u64 = firefox_items.iter().map(|i| i.size).sum();
        categories.push(ScanCategory {
            id: "browser_firefox".to_string(),
            name: "Mozilla Firefox Cache".to_string(),
            icon: "flame".to_string(),
            size,
            items: firefox_items,
            selected: false,
        });
    }

    // 6. Microsoft Edge
    let edge_targets = [
        (PathBuf::from(&home).join("Library/Caches/Microsoft Edge"), "Edge App Cache"),
        (PathBuf::from(&home).join("Library/Application Support/Microsoft Edge/Default/Cache"), "Edge Network Cache"),
        (PathBuf::from(&home).join("Library/Application Support/Microsoft Edge/Default/GPUCache"), "Edge GPU Cache"),
    ];
    let mut edge_items = Vec::new();
    for (path, label) in &edge_targets {
        if path.exists() {
            let size = dir_size(path);
            if size > 1_000_000 {
                edge_items.push(ScanItem {
                    id: gen_id(),
                    path: path.to_string_lossy().to_string(),
                    name: label.to_string(),
                    size,
                    last_modified: last_modified_str(path),
                    category: "browser_edge".to_string(),
                    selected: false,
                });
            }
        }
    }
    if !edge_items.is_empty() {
        let size: u64 = edge_items.iter().map(|i| i.size).sum();
        categories.push(ScanCategory {
            id: "browser_edge".to_string(),
            name: "Microsoft Edge Cache".to_string(),
            icon: "globe".to_string(),
            size,
            items: edge_items,
            selected: false,
        });
    }

    categories
}
