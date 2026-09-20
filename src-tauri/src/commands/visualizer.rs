use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskTreeNode {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size: u64,
    #[serde(rename = "isDir")]
    pub is_dir: bool,
    pub children: Vec<DiskTreeNode>,
    #[serde(rename = "fileCount")]
    pub file_count: usize,
}

fn should_skip(path: &Path) -> bool {
    let s = path.to_string_lossy();
    s == "/Volumes"
        || s == "/dev"
        || s == "/proc"
        || s.starts_with("/System/Volumes")
        || s.ends_with("/.Trash")
        || s.ends_with("/.Spotlight-V100")
        || s.ends_with("/.DocumentRevisions-V100")
        || s.ends_with("/.fseventsd")
        || s.ends_with("/.git")
        || s.ends_with("/node_modules")
        || s.contains("/node_modules/")
        || s.contains("/Library/Caches")
        || s.contains("/Library/Containers")
        || s.contains("/Library/Metadata")
}

fn calculate_allocated_size(path: &Path) -> (u64, usize) {
    if should_skip(path) {
        return (0, 0);
    }
    if path.is_file() {
        let size = path.metadata().map(|m| m.len()).unwrap_or(0);
        return (size, 1);
    }

    WalkDir::new(path)
        .same_file_system(true)
        .max_depth(4)
        .min_depth(1)
        .into_iter()
        .filter_entry(|e| !should_skip(e.path()))
        .par_bridge()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| e.metadata().ok())
        .fold(|| (0u64, 0usize), |(s, c), m| (s + m.len(), c + 1))
        .reduce(|| (0u64, 0usize), |(s1, c1), (s2, c2)| (s1 + s2, c1 + c2))
}

fn build_tree(path: &Path, current_depth: usize, max_depth: usize) -> DiskTreeNode {
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string_lossy().to_string());

    let is_dir = path.is_dir();

    if should_skip(path) {
        return DiskTreeNode {
            id: path.to_string_lossy().to_string(),
            name,
            path: path.to_string_lossy().to_string(),
            size: 0,
            is_dir,
            children: Vec::new(),
            file_count: 0,
        };
    }

    if !is_dir || current_depth >= max_depth {
        let (size, file_count) = calculate_allocated_size(path);
        return DiskTreeNode {
            id: path.to_string_lossy().to_string(),
            name,
            path: path.to_string_lossy().to_string(),
            size,
            is_dir,
            children: Vec::new(),
            file_count,
        };
    }

    let direct_entries: Vec<PathBuf> = match fs::read_dir(path) {
        Ok(rd) => rd
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| !should_skip(p))
            .collect(),
        Err(_) => Vec::new(),
    };

    // Parallel scan of direct children
    let mut children: Vec<DiskTreeNode> = direct_entries
        .par_iter()
        .map(|child_path| build_tree(child_path, current_depth + 1, max_depth))
        .filter(|node| node.size > 0)
        .collect();

    // Sort children descending by size
    children.sort_by_key(|a| std::cmp::Reverse(a.size));

    let total_size: u64 = children.iter().map(|c| c.size).sum();
    let total_files: usize = children.iter().map(|c| c.file_count).sum();

    DiskTreeNode {
        id: path.to_string_lossy().to_string(),
        name,
        path: path.to_string_lossy().to_string(),
        size: total_size,
        is_dir,
        children,
        file_count: total_files,
    }
}

#[tauri::command]
pub async fn scan_directory_tree(
    mut path: String,
    max_depth: Option<usize>,
) -> Result<DiskTreeNode, String> {
    if path.is_empty() || path == "~" {
        if let Ok(home) = std::env::var("HOME") {
            path = home;
        }
    } else if path.starts_with("~/") {
        if let Ok(home) = std::env::var("HOME") {
            path = format!("{}{}", home, &path[1..]);
        }
    }

    let target = PathBuf::from(&path);
    if !target.exists() {
        return Err(format!("Directory not found: {}", path));
    }

    let depth = max_depth.unwrap_or(2).min(3);
    let root_node = tokio::task::spawn_blocking(move || build_tree(&target, 0, depth))
        .await
        .map_err(|e| e.to_string())?;

    Ok(root_node)
}
