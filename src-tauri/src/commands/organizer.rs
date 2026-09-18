use crate::commands::cleaner::{clean_selected_items, get_allocated_size, CleanResult};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TidyItem {
    pub id: String,
    pub path: String,
    pub name: String,
    pub size: u64,
    #[serde(rename = "lastModified")]
    pub last_modified: String,
    pub category: String,
    #[serde(rename = "targetFolder")]
    pub target_folder: String,
    #[serde(rename = "isRedundantInstaller")]
    pub is_redundant_installer: bool,
    #[serde(rename = "installedAppName")]
    pub installed_app_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TidyScanResult {
    #[serde(rename = "sourcePath")]
    pub source_path: String,
    pub items: Vec<TidyItem>,
    #[serde(rename = "totalFiles")]
    pub total_files: usize,
    #[serde(rename = "totalSize")]
    pub total_size: u64,
    #[serde(rename = "redundantInstallersCount")]
    pub redundant_installers_count: usize,
    #[serde(rename = "redundantInstallersSize")]
    pub redundant_installers_size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TidyAction {
    #[serde(rename = "itemPath")]
    pub item_path: String,
    #[serde(rename = "targetFolderName")]
    pub target_folder_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TidyExecuteResult {
    #[serde(rename = "movedCount")]
    pub moved_count: usize,
    #[serde(rename = "organizedBytes")]
    pub organized_bytes: u64,
    #[serde(rename = "isSimulation")]
    pub is_simulation: bool,
    pub errors: Vec<String>,
}

/// Helper to get list of installed application names (lowercase for comparison).
fn get_installed_apps() -> HashSet<String> {
    let mut apps = HashSet::new();
    let app_dirs = vec![
        PathBuf::from("/Applications"),
        PathBuf::from("/System/Applications"),
        PathBuf::from(std::env::var("HOME").unwrap_or_default()).join("Applications"),
    ];

    for dir in app_dirs {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("app") {
                    if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                        apps.insert(stem.to_lowercase());
                    }
                }
            }
        }
    }
    apps
}

/// Determine category and target folder for a file.
fn classify_file(name: &str, ext: &str) -> (&'static str, &'static str) {
    let name_lower = name.to_lowercase();

    // 1. Screenshots
    if name_lower.starts_with("screen shot")
        || name_lower.starts_with("screenshot")
        || name_lower.starts_with("tangkapan layar")
        || name_lower.starts_with("cleanshot")
        || name_lower.starts_with("capture")
    {
        return ("Screenshots", "Screenshots");
    }

    // 2. Installers
    match ext {
        "dmg" | "pkg" | "iso" | "appimage" => return ("Installers", "Installers"),
        _ => {}
    }

    // 3. Documents
    match ext {
        "pdf" | "doc" | "docx" | "xls" | "xlsx" | "ppt" | "pptx" | "csv" | "txt" | "rtf"
        | "epub" | "pages" | "numbers" | "keynote" => return ("Documents", "Documents"),
        _ => {}
    }

    // 4. Archives
    match ext {
        "zip" | "tar" | "gz" | "tgz" | "rar" | "7z" | "bz2" | "xz" => {
            return ("Archives", "Archives")
        }
        _ => {}
    }

    // 5. Media (Videos, Audio, Images)
    match ext {
        "mp4" | "mov" | "mkv" | "avi" | "webm" | "mp3" | "m4a" | "wav" | "flac" | "aac"
        | "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg" | "heic" | "psd" | "ai" | "fig" => {
            return ("Media", "Media")
        }
        _ => {}
    }

    // 6. Code / Developer files
    match ext {
        "js" | "ts" | "jsx" | "tsx" | "py" | "rs" | "go" | "c" | "cpp" | "h" | "html"
        | "css" | "json" | "yaml" | "yml" | "toml" | "sql" | "sh" | "md" => {
            return ("Code", "Code")
        }
        _ => {}
    }

    ("Other", "Other")
}

/// Check if an installer file corresponds to an application that is already installed.
fn check_redundant_installer(name: &str, installed_apps: &HashSet<String>) -> (bool, Option<String>) {
    let clean_name = name
        .to_lowercase()
        .replace(".dmg", "")
        .replace(".pkg", "")
        .replace("_", " ")
        .replace("-", " ");

    let words: Vec<&str> = clean_name.split_whitespace().collect();

    for app in installed_apps {
        // Direct match or partial match on main app name
        if clean_name.starts_with(app) || app.starts_with(&clean_name) {
            return (true, Some(format!("{}.app", app)));
        }
        if let Some(first_word) = words.first() {
            if first_word.len() > 3 && app.starts_with(first_word) {
                return (true, Some(format!("{}.app", app)));
            }
        }
    }

    (false, None)
}

/// Scan a directory for unorganized files (top-level files only, ignores subdirectories).
#[tauri::command]
pub fn scan_tidy_directory(path: String) -> Result<TidyScanResult, String> {
    let resolved_path = if path == "downloads" || path.is_empty() {
        std::env::var("HOME")
            .map(|h| format!("{}/Downloads", h))
            .unwrap_or_else(|_| path.clone())
    } else if path == "desktop" {
        std::env::var("HOME")
            .map(|h| format!("{}/Desktop", h))
            .unwrap_or_else(|_| path.clone())
    } else {
        path.clone()
    };

    let target_dir = Path::new(&resolved_path);
    if !target_dir.exists() || !target_dir.is_dir() {
        return Err(format!("Path does not exist or is not a directory: {}", resolved_path));
    }

    let installed_apps = get_installed_apps();
    let mut items = vec![];
    let mut total_size: u64 = 0;
    let mut redundant_count: usize = 0;
    let mut redundant_size: u64 = 0;

    let entries = fs::read_dir(target_dir).map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries.filter_map(|e| e.ok()) {
        let entry_path = entry.path();

        // Only organize loose regular files, ignore subfolders or hidden files
        if !entry_path.is_file() {
            continue;
        }

        let file_name = match entry_path.file_name().and_then(|s| s.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };

        if file_name.starts_with('.') {
            continue;
        }

        let ext = entry_path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();

        let (category, target_folder) = classify_file(&file_name, &ext);
        let metadata = entry.metadata().ok();
        let size = metadata.as_ref().map(get_allocated_size).unwrap_or(0);

        let (is_redundant, installed_app_name) = if category == "Installers" {
            check_redundant_installer(&file_name, &installed_apps)
        } else {
            (false, None)
        };

        if is_redundant {
            redundant_count += 1;
            redundant_size += size;
        }

        let last_modified = metadata
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

        total_size += size;
        items.push(TidyItem {
            id: format!("{}_{}", file_name, size),
            path: entry_path.to_string_lossy().to_string(),
            name: file_name,
            size,
            last_modified,
            category: category.to_string(),
            target_folder: target_folder.to_string(),
            is_redundant_installer: is_redundant,
            installed_app_name,
        });
    }

    // Sort largest files first
    items.sort_by_key(|a| std::cmp::Reverse(a.size));

    let total_files = items.len();

    Ok(TidyScanResult {
        source_path: resolved_path,
        items,
        total_files,
        total_size,
        redundant_installers_count: redundant_count,
        redundant_installers_size: redundant_size,
    })
}

/// Execute organization by moving selected files into designated category subfolders.
#[tauri::command]
pub fn execute_tidy_organization(
    source_dir: String,
    actions: Vec<TidyAction>,
    dry_run: Option<bool>,
) -> Result<TidyExecuteResult, String> {
    let resolved_source = if source_dir == "downloads" || source_dir.is_empty() {
        std::env::var("HOME")
            .map(|h| format!("{}/Downloads", h))
            .unwrap_or_else(|_| source_dir.clone())
    } else if source_dir == "desktop" {
        std::env::var("HOME")
            .map(|h| format!("{}/Desktop", h))
            .unwrap_or_else(|_| source_dir.clone())
    } else {
        source_dir.clone()
    };

    let source_path = Path::new(&resolved_source);
    if !source_path.exists() {
        return Err("Source directory does not exist".to_string());
    }

    let is_simulation = dry_run.unwrap_or(false);
    let mut moved_count: usize = 0;
    let mut organized_bytes: u64 = 0;
    let mut errors: Vec<String> = vec![];

    for action in actions {
        let file_path = Path::new(&action.item_path);
        if !file_path.exists() || !file_path.is_file() {
            continue;
        }

        let file_size = file_path
            .metadata()
            .map(|m| get_allocated_size(&m))
            .unwrap_or(0);

        if is_simulation {
            moved_count += 1;
            organized_bytes += file_size;
            continue;
        }

        let file_name = match file_path.file_name() {
            Some(n) => n,
            None => continue,
        };

        let target_dir_path = source_path.join(&action.target_folder_name);
        if !target_dir_path.exists() {
            if let Err(e) = fs::create_dir_all(&target_dir_path) {
                errors.push(format!("Failed to create folder {}: {}", action.target_folder_name, e));
                continue;
            }
        }

        // Determine unique destination path to avoid overwriting existing files
        let mut dest_path = target_dir_path.join(file_name);
        if dest_path.exists() && dest_path != file_path {
            let stem = file_path.file_stem().and_then(|s| s.to_str()).unwrap_or("file");
            let ext = file_path.extension().and_then(|s| s.to_str()).unwrap_or("");
            let mut counter = 1;
            loop {
                let candidate_name = if ext.is_empty() {
                    format!("{}_{}", stem, counter)
                } else {
                    format!("{}_{}.{}", stem, counter, ext)
                };
                let candidate_path = target_dir_path.join(&candidate_name);
                if !candidate_path.exists() {
                    dest_path = candidate_path;
                    break;
                }
                counter += 1;
            }
        }

        // Move file (atomic rename or copy+remove fallback)
        let move_result = fs::rename(file_path, &dest_path).or_else(|_| {
            fs::copy(file_path, &dest_path).and_then(|_| fs::remove_file(file_path))
        });

        match move_result {
            Ok(_) => {
                moved_count += 1;
                organized_bytes += file_size;
            }
            Err(e) => {
                errors.push(format!("Failed to move {}: {}", action.item_path, e));
            }
        }
    }

    Ok(TidyExecuteResult {
        moved_count,
        organized_bytes,
        is_simulation,
        errors,
    })
}

/// Delete or trash redundant installer files.
#[tauri::command]
pub fn clean_redundant_installers(
    paths: Vec<String>,
    dry_run: Option<bool>,
    use_trash: Option<bool>,
) -> Result<CleanResult, String> {
    clean_selected_items(paths, dry_run, use_trash)
}
