use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};
use sysinfo::Disks;
use walkdir::WalkDir;

#[cfg(unix)]
use std::os::unix::fs::MetadataExt;

/// Calculate real physical allocated disk space (handles APFS sparse files).
pub fn get_allocated_size(m: &fs::Metadata) -> u64 {
    #[cfg(unix)]
    {
        m.blocks() * 512
    }
    #[cfg(not(unix))]
    {
        m.len()
    }
}

/// Represents a scannable item found on disk.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanItem {
    pub id: String,
    pub path: String,
    pub name: String,
    pub size: u64,
    #[serde(rename = "lastModified")]
    pub last_modified: String,
    pub category: String,
    pub selected: bool,
}

/// Represents a category of scannable items.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanCategory {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub size: u64,
    pub items: Vec<ScanItem>,
    pub selected: bool,
}

/// Disk information.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskInfo {
    #[serde(rename = "totalSpace")]
    pub total_space: u64,
    #[serde(rename = "usedSpace")]
    pub used_space: u64,
    #[serde(rename = "freeSpace")]
    pub free_space: u64,
    #[serde(rename = "diskName")]
    pub disk_name: String,
}

/// Calculate the total physical size of a directory using parallel traversal.
fn dir_size(path: &Path) -> u64 {
    WalkDir::new(path)
        .into_iter()
        .par_bridge()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .map(|e| e.metadata().map(|m| get_allocated_size(&m)).unwrap_or(0))
        .sum()
}

/// Get the last modified time of a path as a human-readable string.
fn last_modified_str(path: &Path) -> String {
    fs::metadata(path)
        .and_then(|m| m.modified())
        .map(|t| {
            let elapsed = SystemTime::now()
                .duration_since(t)
                .unwrap_or(Duration::ZERO);
            let days = elapsed.as_secs() / 86400;
            if days > 365 {
                format!("{} year(s) ago", days / 365)
            } else if days > 30 {
                format!("{} month(s) ago", days / 30)
            } else if days > 0 {
                format!("{} day(s) ago", days)
            } else {
                "Today".to_string()
            }
        })
        .unwrap_or_else(|_| "Unknown".to_string())
}

/// Generate a simple unique ID.
fn gen_id() -> String {
    use std::sync::atomic::{AtomicU64, Ordering};
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let count = COUNTER.fetch_add(1, Ordering::Relaxed);
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_millis();
    format!("{}_{}", now, count)
}

/// Scan entries in a directory (non-recursive, top-level items only).
fn scan_directory_entries(dir: &Path, category_id: &str) -> Vec<ScanItem> {
    if !dir.exists() {
        return vec![];
    }

    let entries: Vec<PathBuf> = fs::read_dir(dir)
        .map(|rd| {
            rd.filter_map(|e| e.ok())
                .map(|e| e.path())
                .collect()
        })
        .unwrap_or_default();

    let mut items: Vec<ScanItem> = entries
        .par_iter()
        .map(|entry| {
            let size = if entry.is_dir() {
                dir_size(entry)
            } else {
                entry.metadata().map(|m| get_allocated_size(&m)).unwrap_or(0)
            };

            ScanItem {
                id: gen_id(),
                path: entry.to_string_lossy().to_string(),
                name: entry
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string(),
                size,
                last_modified: last_modified_str(entry),
                category: category_id.to_string(),
                selected: false,
            }
        })
        .filter(|item| item.size > 0)
        .collect();

    // Sort largest items first
    items.sort_by(|a, b| b.size.cmp(&a.size));
    items
}

/// Scan system directories: cache, logs, browser cache, trash.
#[tauri::command]
pub fn scan_system_directories() -> Vec<ScanCategory> {
    let home = dirs_home();
    let mut categories = vec![];

    // 1. System Cache
    let cache_dir = PathBuf::from(&home).join("Library/Caches");
    let cache_items = scan_directory_entries(&cache_dir, "system_cache");
    let cache_size: u64 = cache_items.iter().map(|i| i.size).sum();
    categories.push(ScanCategory {
        id: "system_cache".to_string(),
        name: "System Cache".to_string(),
        icon: "folder".to_string(),
        size: cache_size,
        items: cache_items,
        selected: false,
    });

    // 2. User Logs & Crash Reports
    let logs_dir = PathBuf::from(&home).join("Library/Logs");
    let log_items = scan_directory_entries(&logs_dir, "user_logs");
    let log_size: u64 = log_items.iter().map(|i| i.size).sum();
    categories.push(ScanCategory {
        id: "user_logs".to_string(),
        name: "User Logs & Diagnostics".to_string(),
        icon: "file-text".to_string(),
        size: log_size,
        items: log_items,
        selected: false,
    });

    // 3. Browser Cache (Chrome, Safari, Firefox, Edge, Arc)
    let browser_cache_dirs = vec![
        PathBuf::from(&home).join("Library/Caches/Google/Chrome"),
        PathBuf::from(&home).join("Library/Caches/com.apple.Safari"),
        PathBuf::from(&home).join("Library/Caches/Firefox"),
        PathBuf::from(&home).join("Library/Caches/com.microsoft.edgemac"),
        PathBuf::from(&home).join("Library/Caches/company.thebrowser.Browser"),
        PathBuf::from(&home).join("Library/Caches/BraveSoftware/Brave-Browser"),
    ];
    let mut browser_items: Vec<ScanItem> = vec![];
    for dir in &browser_cache_dirs {
        if dir.exists() {
            let size = dir_size(dir);
            if size > 0 {
                browser_items.push(ScanItem {
                    id: gen_id(),
                    path: dir.to_string_lossy().to_string(),
                    name: dir
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string(),
                    size,
                    last_modified: last_modified_str(dir),
                    category: "browser_cache".to_string(),
                    selected: false,
                });
            }
        }
    }
    browser_items.sort_by(|a, b| b.size.cmp(&a.size));
    let browser_size: u64 = browser_items.iter().map(|i| i.size).sum();
    categories.push(ScanCategory {
        id: "browser_cache".to_string(),
        name: "Browser Cache".to_string(),
        icon: "globe".to_string(),
        size: browser_size,
        items: browser_items,
        selected: false,
    });

    // 4. Trash Bin
    let trash_dir = PathBuf::from(&home).join(".Trash");
    let trash_items = scan_directory_entries(&trash_dir, "trash");
    let trash_size: u64 = trash_items.iter().map(|i| i.size).sum();
    categories.push(ScanCategory {
        id: "trash".to_string(),
        name: "Trash Bin".to_string(),
        icon: "trash".to_string(),
        size: trash_size,
        items: trash_items,
        selected: false,
    });

    categories
}

/// Scan developer workspaces: node_modules, cargo target, xcode, package caches, docker.
#[tauri::command]
pub fn scan_dev_workspaces() -> Vec<ScanCategory> {
    let home = dirs_home();
    let dev_dirs = vec![
        PathBuf::from(&home).join("Developer"),
        PathBuf::from(&home).join("Projects"),
        PathBuf::from(&home).join("Code"),
        PathBuf::from(&home).join("dev"),
    ];
    let mut categories = vec![];

    // 1. Xcode & iOS Dev Caches
    let xcode_targets = vec![
        (
            PathBuf::from(&home).join("Library/Developer/Xcode/DerivedData"),
            "DerivedData (Build Cache)",
        ),
        (
            PathBuf::from(&home).join("Library/Developer/Xcode/Archives"),
            "Xcode Archives",
        ),
        (
            PathBuf::from(&home).join("Library/Developer/Xcode/iOS DeviceSupport"),
            "iOS Device Support Symbols",
        ),
        (
            PathBuf::from(&home).join("Library/Developer/CoreSimulator/Caches"),
            "Simulator Caches",
        ),
        (
            PathBuf::from(&home).join("Library/Caches/com.apple.dt.Xcode"),
            "Xcode App Cache",
        ),
    ];

    let mut xcode_items: Vec<ScanItem> = vec![];
    for (dir, label) in &xcode_targets {
        if dir.exists() {
            if dir.ends_with("DerivedData") {
                let sub_items = scan_directory_entries(dir, "xcode_cache");
                for mut item in sub_items {
                    if item.size > 5_000_000 {
                        item.category = "xcode_cache".to_string();
                        xcode_items.push(item);
                    }
                }
            } else {
                let size = dir_size(dir);
                if size > 5_000_000 {
                    xcode_items.push(ScanItem {
                        id: gen_id(),
                        path: dir.to_string_lossy().to_string(),
                        name: label.to_string(),
                        size,
                        last_modified: last_modified_str(dir),
                        category: "xcode_cache".to_string(),
                        selected: false,
                    });
                }
            }
        }
    }
    xcode_items.sort_by(|a, b| b.size.cmp(&a.size));
    let xcode_size: u64 = xcode_items.iter().map(|i| i.size).sum();
    if !xcode_items.is_empty() {
        categories.push(ScanCategory {
            id: "xcode_cache".to_string(),
            name: "Xcode & Simulator Caches".to_string(),
            icon: "hammer".to_string(),
            size: xcode_size,
            items: xcode_items,
            selected: false,
        });
    }

    // 2. Package Manager Caches (Bun, pnpm, npm, Yarn, CocoaPods, Homebrew, Gradle, Pip, Android, uv)
    let pm_targets = vec![
        (PathBuf::from(&home).join(".bun/install/cache"), "Bun Install Cache"),
        (PathBuf::from(&home).join(".local/share/pnpm/store"), "pnpm Store Cache"),
        (PathBuf::from(&home).join("Library/pnpm/store"), "pnpm Store (macOS)"),
        (PathBuf::from(&home).join(".npm/_cacache"), "npm Cache"),
        (PathBuf::from(&home).join("Library/Caches/Yarn"), "Yarn Cache"),
        (PathBuf::from(&home).join("Library/Caches/Homebrew"), "Homebrew Download Cache"),
        (PathBuf::from(&home).join("Library/Caches/CocoaPods"), "CocoaPods Cache"),
        (PathBuf::from(&home).join(".gradle/caches"), "Gradle Cache"),
        (PathBuf::from(&home).join(".gradle/daemon"), "Gradle Daemon Logs/Cache"),
        (PathBuf::from(&home).join(".android/cache"), "Android Build Cache"),
        (PathBuf::from(&home).join("Library/Caches/pip"), "Python / Pip Cache"),
        (PathBuf::from(&home).join(".cache/uv"), "Astral uv Cache"),
        (PathBuf::from(&home).join(".cache/ruff"), "Ruff Cache"),
    ];

    let mut pm_items: Vec<ScanItem> = vec![];
    for (dir, label) in &pm_targets {
        if dir.exists() {
            let size = dir_size(dir);
            if size > 1_000_000 {
                pm_items.push(ScanItem {
                    id: gen_id(),
                    path: dir.to_string_lossy().to_string(),
                    name: label.to_string(),
                    size,
                    last_modified: last_modified_str(dir),
                    category: "package_cache".to_string(),
                    selected: false,
                });
            }
        }
    }
    // Scan Python caches (__pycache__, .pytest_cache, .ruff_cache) in dev directories
    for dev_dir in &dev_dirs {
        if !dev_dir.exists() {
            continue;
        }
        for entry in WalkDir::new(dev_dir)
            .max_depth(3)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let name = entry.file_name().to_string_lossy();
            if entry.file_type().is_dir() && (name == "__pycache__" || name == ".pytest_cache" || name == ".ruff_cache") {
                let size = dir_size(entry.path());
                if size > 100_000 {
                    let parent_name = entry
                        .path()
                        .parent()
                        .and_then(|p| p.file_name())
                        .unwrap_or_default()
                        .to_string_lossy();
                    pm_items.push(ScanItem {
                        id: gen_id(),
                        path: entry.path().to_string_lossy().to_string(),
                        name: format!("{}/{}", parent_name, name),
                        size,
                        last_modified: last_modified_str(entry.path()),
                        category: "package_cache".to_string(),
                        selected: false,
                    });
                }
            }
        }
    }

    pm_items.sort_by(|a, b| b.size.cmp(&a.size));
    let pm_size: u64 = pm_items.iter().map(|i| i.size).sum();
    if !pm_items.is_empty() {
        categories.push(ScanCategory {
            id: "package_cache".to_string(),
            name: "Package Manager & Build Caches".to_string(),
            icon: "layers".to_string(),
            size: pm_size,
            items: pm_items,
            selected: false,
        });
    }

    // 3. Stale node_modules (projects not modified in > 90 days)
    let ninety_days = Duration::from_secs(90 * 24 * 3600);
    let mut node_items: Vec<ScanItem> = vec![];

    for dev_dir in &dev_dirs {
        if !dev_dir.exists() {
            continue;
        }
        for entry in WalkDir::new(dev_dir)
            .max_depth(3)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.file_name() == "node_modules" && entry.file_type().is_dir() {
                let project_dir = entry.path().parent().unwrap_or(entry.path());
                let is_stale = fs::metadata(project_dir)
                    .and_then(|m| m.modified())
                    .map(|t| {
                        SystemTime::now()
                            .duration_since(t)
                            .unwrap_or(Duration::ZERO)
                            > ninety_days
                    })
                    .unwrap_or(false);

                if is_stale {
                    let size = dir_size(entry.path());
                    if size > 1_000_000 {
                        node_items.push(ScanItem {
                            id: gen_id(),
                            path: entry.path().to_string_lossy().to_string(),
                            name: format!(
                                "{}/node_modules",
                                project_dir
                                    .file_name()
                                    .unwrap_or_default()
                                    .to_string_lossy()
                            ),
                            size,
                            last_modified: last_modified_str(project_dir),
                            category: "node_modules".to_string(),
                            selected: false,
                        });
                    }
                }
            }
        }
    }

    node_items.sort_by(|a, b| b.size.cmp(&a.size));
    let node_size: u64 = node_items.iter().map(|i| i.size).sum();
    categories.push(ScanCategory {
        id: "node_modules".to_string(),
        name: "Stale node_modules".to_string(),
        icon: "package".to_string(),
        size: node_size,
        items: node_items,
        selected: false,
    });

    // 4. Cargo target directories & registry cache
    let mut cargo_items: Vec<ScanItem> = vec![];

    let cargo_registry = PathBuf::from(&home).join(".cargo/registry");
    if cargo_registry.exists() {
        let size = dir_size(&cargo_registry);
        if size > 1_000_000 {
            cargo_items.push(ScanItem {
                id: gen_id(),
                path: cargo_registry.to_string_lossy().to_string(),
                name: ".cargo/registry".to_string(),
                size,
                last_modified: last_modified_str(&cargo_registry),
                category: "cargo_target".to_string(),
                selected: false,
            });
        }
    }

    for dev_dir in &dev_dirs {
        if !dev_dir.exists() {
            continue;
        }
        for entry in WalkDir::new(dev_dir)
            .max_depth(3)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.file_name() == "target" && entry.file_type().is_dir() {
                let project_dir = entry.path().parent().unwrap_or(entry.path());
                if project_dir.join("Cargo.toml").exists() {
                    let size = dir_size(entry.path());
                    if size > 10_000_000 {
                        cargo_items.push(ScanItem {
                            id: gen_id(),
                            path: entry.path().to_string_lossy().to_string(),
                            name: format!(
                                "{}/target",
                                project_dir
                                    .file_name()
                                    .unwrap_or_default()
                                    .to_string_lossy()
                            ),
                            size,
                            last_modified: last_modified_str(entry.path()),
                            category: "cargo_target".to_string(),
                            selected: false,
                        });
                    }
                }
            }
        }
    }

    cargo_items.sort_by(|a, b| b.size.cmp(&a.size));
    let cargo_size: u64 = cargo_items.iter().map(|i| i.size).sum();
    categories.push(ScanCategory {
        id: "cargo_target".to_string(),
        name: "Rust/Cargo Cache".to_string(),
        icon: "box".to_string(),
        size: cargo_size,
        items: cargo_items,
        selected: false,
    });

    // 5. Docker / OrbStack dangling cache (accurately calculated using physical disk blocks!)
    let docker_dirs = vec![
        PathBuf::from(&home).join("Library/Containers/com.docker.docker/Data/vms"),
        PathBuf::from(&home).join(".orbstack/data"),
        PathBuf::from(&home).join(".docker/buildx"),
    ];

    let mut docker_items: Vec<ScanItem> = vec![];
    for dir in &docker_dirs {
        if dir.exists() {
            let size = dir_size(dir);
            if size > 10_000_000 {
                docker_items.push(ScanItem {
                    id: gen_id(),
                    path: dir.to_string_lossy().to_string(),
                    name: dir
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string(),
                    size,
                    last_modified: last_modified_str(dir),
                    category: "docker_volumes".to_string(),
                    selected: false,
                });
            }
        }
    }

    docker_items.sort_by(|a, b| b.size.cmp(&a.size));
    let docker_size: u64 = docker_items.iter().map(|i| i.size).sum();
    if !docker_items.is_empty() {
        categories.push(ScanCategory {
            id: "docker_volumes".to_string(),
            name: "Docker / OrbStack".to_string(),
            icon: "container".to_string(),
            size: docker_size,
            items: docker_items,
            selected: false,
        });
    }

    categories
}

/// Scan custom paths provided by the user.
#[tauri::command]
pub fn scan_custom_paths(paths: Vec<String>) -> Vec<ScanCategory> {
    let mut categories = vec![];

    for path_str in &paths {
        let path = PathBuf::from(path_str);
        if path.exists() {
            let mut items = scan_directory_entries(&path, &path_str);
            items.sort_by(|a, b| b.size.cmp(&a.size));
            let size: u64 = items.iter().map(|i| i.size).sum();
            categories.push(ScanCategory {
                id: gen_id(),
                name: path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string(),
                icon: "folder".to_string(),
                size,
                items,
                selected: false,
            });
        }
    }

    categories
}

/// Detailed information for any detected storage drive.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskDetail {
    pub id: String,
    pub name: String,
    #[serde(rename = "mountPoint")]
    pub mount_point: String,
    #[serde(rename = "totalSpace")]
    pub total_space: u64,
    #[serde(rename = "usedSpace")]
    pub used_space: u64,
    #[serde(rename = "freeSpace")]
    pub free_space: u64,
    #[serde(rename = "isRemovable")]
    pub is_removable: bool,
    #[serde(rename = "fileSystem")]
    pub file_system: String,
}

#[cfg(unix)]
fn get_fs_stats(path_str: &str) -> Option<(u64, u64, u64)> {
    use std::ffi::CString;
    use std::mem::MaybeUninit;

    let c_path = CString::new(path_str).ok()?;
    unsafe {
        let mut stat = MaybeUninit::<libc::statvfs>::uninit();
        if libc::statvfs(c_path.as_ptr(), stat.as_mut_ptr()) == 0 {
            let stat = stat.assume_init();
            let bsize = stat.f_frsize as u64;
            let total = stat.f_blocks as u64 * bsize;
            let free = stat.f_bavail as u64 * bsize;
            let used = total.saturating_sub(free);
            return Some((total, used, free));
        }
    }
    None
}

#[cfg(not(unix))]
fn get_fs_stats(_path_str: &str) -> Option<(u64, u64, u64)> {
    None
}

/// Get all mounted storage devices (Internal Macintosh HD, USB Flashdisks, External SSDs).
#[tauri::command]
pub fn get_all_disks() -> Vec<DiskDetail> {
    let mut result = Vec::new();

    // 1. Primary internal Macintosh HD (/System/Volumes/Data or /)
    let primary_path = if Path::new("/System/Volumes/Data").exists() {
        "/System/Volumes/Data"
    } else {
        "/"
    };

    if let Some((total, used, free)) = get_fs_stats(primary_path) {
        result.push(DiskDetail {
            id: "internal_primary".to_string(),
            name: "Macintosh HD".to_string(),
            mount_point: "/".to_string(),
            total_space: total,
            used_space: used,
            free_space: free,
            is_removable: false,
            file_system: "APFS".to_string(),
        });
    }

    // 2. Discover External Drives / Flashdisks / Removable Media in /Volumes
    if let Ok(entries) = fs::read_dir("/Volumes") {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            let vol_name = path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            // Skip symlink to root "Macintosh HD" inside /Volumes
            if path.is_symlink() || vol_name == "Macintosh HD" || vol_name.is_empty() {
                continue;
            }

            if let Some((total, used, free)) = get_fs_stats(&path.to_string_lossy()) {
                if total > 0 {
                    result.push(DiskDetail {
                        id: format!("vol_{}", vol_name),
                        name: vol_name,
                        mount_point: path.to_string_lossy().to_string(),
                        total_space: total,
                        used_space: used,
                        free_space: free,
                        is_removable: true,
                        file_system: "External".to_string(),
                    });
                }
            }
        }
    }

    if result.is_empty() {
        result.push(DiskDetail {
            id: "internal_primary".to_string(),
            name: "Macintosh HD".to_string(),
            mount_point: "/".to_string(),
            total_space: 256 * 1024 * 1024 * 1024,
            used_space: 128 * 1024 * 1024 * 1024,
            free_space: 128 * 1024 * 1024 * 1024,
            is_removable: false,
            file_system: "APFS".to_string(),
        });
    }

    result
}

/// Get disk info for a specific mount point (e.g. "/" or "/Volumes/NAENDISK").
#[tauri::command]
pub fn get_disk_info_by_mount(mount_point: String) -> DiskInfo {
    let check_path = if mount_point == "/" && Path::new("/System/Volumes/Data").exists() {
        "/System/Volumes/Data"
    } else {
        &mount_point
    };

    if let Some((total, used, free)) = get_fs_stats(check_path) {
        let name = if mount_point == "/" {
            "Macintosh HD".to_string()
        } else {
            Path::new(&mount_point)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "External Drive".to_string())
        };

        return DiskInfo {
            total_space: total,
            used_space: used,
            free_space: free,
            disk_name: name,
        };
    }

    get_disk_info()
}

/// Get disk info for the primary disk.
#[tauri::command]
pub fn get_disk_info() -> DiskInfo {
    get_disk_info_by_mount("/".to_string())
}

/// Get the home directory path.
fn dirs_home() -> String {
    std::env::var("HOME").unwrap_or_else(|_| "/Users/unknown".to_string())
}

/// System hardware and OS details.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemDetails {
    #[serde(rename = "osName")]
    pub os_name: String,
    #[serde(rename = "osVersion")]
    pub os_version: String,
    pub arch: String,
    pub hostname: String,
    #[serde(rename = "kernelVersion")]
    pub kernel_version: String,
    #[serde(rename = "fileSystem")]
    pub file_system: String,
    #[serde(rename = "iconCacheCount")]
    pub icon_cache_count: u32,
    #[serde(rename = "iconCacheBytes")]
    pub icon_cache_bytes: u64,
}

/// Get macOS hardware and system specification details.
#[tauri::command]
pub fn get_system_details() -> SystemDetails {
    let os_name = sysinfo::System::name().unwrap_or_else(|| "macOS".to_string());
    let os_version = sysinfo::System::os_version().unwrap_or_else(|| "Unknown".to_string());
    let arch = sysinfo::System::cpu_arch();
    let hostname = sysinfo::System::host_name().unwrap_or_else(|| "Mac".to_string());
    let kernel_version = sysinfo::System::kernel_version().unwrap_or_else(|| "".to_string());

    let mut icon_cache_count = 0;
    let mut icon_cache_bytes = 0;
    if let Ok(home) = std::env::var("HOME") {
        let icon_dir = Path::new(&home).join(".cache/beberes/icons");
        if let Ok(entries) = fs::read_dir(&icon_dir) {
            for entry in entries.flatten() {
                if let Ok(meta) = entry.metadata() {
                    icon_cache_count += 1;
                    icon_cache_bytes += meta.len();
                }
            }
        }
    }

    let disks = Disks::new_with_refreshed_list();
    let file_system = disks
        .list()
        .first()
        .map(|d| d.file_system().to_string_lossy().to_string())
        .unwrap_or_else(|| "APFS".to_string());

    SystemDetails {
        os_name,
        os_version,
        arch,
        hostname,
        kernel_version,
        file_system,
        icon_cache_count,
        icon_cache_bytes,
    }
}

/// Clear cached application icons from disk.
#[tauri::command]
pub fn clear_icon_cache() -> Result<u32, String> {
    let mut count = 0;
    if let Ok(home) = std::env::var("HOME") {
        let icon_dir = Path::new(&home).join(".cache/beberes/icons");
        if icon_dir.exists() {
            if let Ok(entries) = fs::read_dir(&icon_dir) {
                for entry in entries.flatten() {
                    let _ = fs::remove_file(entry.path());
                    count += 1;
                }
            }
        }
    }
    Ok(count)
}
