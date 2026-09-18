use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitRepoItem {
    pub id: String,
    pub name: String,
    pub path: String,
    #[serde(rename = "gitFolderSize")]
    pub git_folder_size: u64,
    #[serde(rename = "activeBranch")]
    pub active_branch: String,
    #[serde(rename = "mergedBranches")]
    pub merged_branches: Vec<String>,
    #[serde(rename = "uncommittedChanges")]
    pub uncommitted_changes: bool,
    #[serde(rename = "lastCommitDate")]
    pub last_commit_date: String,
}

fn calculate_dir_size(path: &Path) -> u64 {
    WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| e.metadata().ok())
        .map(|m| m.len())
        .sum()
}

fn inspect_git_repo(repo_path: &Path) -> Option<GitRepoItem> {
    let git_dir = repo_path.join(".git");
    if !git_dir.exists() {
        return None;
    }

    let git_folder_size = calculate_dir_size(&git_dir);
    let name = repo_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    // Active branch
    let active_branch = Command::new("git")
        .arg("-C")
        .arg(repo_path)
        .arg("branch")
        .arg("--show-current")
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| "main".to_string());

    // Merged branches
    let merged_branches_out = Command::new("git")
        .arg("-C")
        .arg(repo_path)
        .arg("branch")
        .arg("--merged")
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .unwrap_or_default();

    let mut merged_branches = Vec::new();
    for line in merged_branches_out.lines() {
        let trimmed = line.trim().trim_start_matches('*').trim();
        if !trimmed.is_empty()
            && trimmed != "main"
            && trimmed != "master"
            && trimmed != "develop"
            && trimmed != "dev"
            && trimmed != active_branch
        {
            merged_branches.push(trimmed.to_string());
        }
    }

    // Uncommitted status
    let status_out = Command::new("git")
        .arg("-C")
        .arg(repo_path)
        .arg("status")
        .arg("--porcelain")
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .unwrap_or_default();

    let uncommitted_changes = !status_out.trim().is_empty();

    // Last commit date
    let last_commit = Command::new("git")
        .arg("-C")
        .arg(repo_path)
        .arg("log")
        .arg("-1")
        .arg("--format=%cd")
        .arg("--date=relative")
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    Some(GitRepoItem {
        id: repo_path.to_string_lossy().to_string(),
        name,
        path: repo_path.to_string_lossy().to_string(),
        git_folder_size,
        active_branch,
        merged_branches,
        uncommitted_changes,
        last_commit_date: last_commit,
    })
}

#[tauri::command]
pub async fn scan_git_repos(search_root: Option<String>) -> Result<Vec<GitRepoItem>, String> {
    let root = search_root.unwrap_or_else(|| {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/Shared".to_string());
        let dev = PathBuf::from(&home).join("Developer");
        if dev.exists() {
            dev.to_string_lossy().to_string()
        } else {
            home
        }
    });

    let target_path = PathBuf::from(&root);
    if !target_path.exists() {
        return Ok(Vec::new());
    }

    tokio::task::spawn_blocking(move || {
        let mut repos = Vec::new();

        // Search up to 4 levels deep for .git directories
        for entry in WalkDir::new(&target_path)
            .max_depth(4)
            .into_iter()
            .filter_entry(|e| {
                let name = e.file_name().to_string_lossy();
                // Skip node_modules, target, .cache, etc.
                name != "node_modules" && name != "target" && name != ".cache" && name != ".npm"
            })
            .filter_map(|e| e.ok())
        {
            if entry.file_type().is_dir() && entry.file_name() == ".git" {
                if let Some(parent) = entry.path().parent() {
                    if let Some(repo_item) = inspect_git_repo(parent) {
                        repos.push(repo_item);
                    }
                }
            }
        }

        repos.sort_by(|a, b| b.git_folder_size.cmp(&a.git_folder_size));
        Ok(repos)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn optimize_git_repo(repo_path: String, delete_merged_branches: bool) -> Result<u64, String> {
    tokio::task::spawn_blocking(move || {
        let path = PathBuf::from(&repo_path);
        let git_dir = path.join(".git");
        if !git_dir.exists() {
            return Err("Not a git repository".to_string());
        }

        let initial_size = calculate_dir_size(&git_dir);

        // Delete merged branches if requested
        if delete_merged_branches {
            if let Some(info) = inspect_git_repo(&path) {
                for branch in info.merged_branches {
                    let _ = Command::new("git")
                        .arg("-C")
                        .arg(&path)
                        .arg("branch")
                        .arg("-d")
                        .arg(&branch)
                        .output();
                }
            }
        }

        // Run git gc --prune=now
        let _ = Command::new("git")
            .arg("-C")
            .arg(&path)
            .arg("gc")
            .arg("--prune=now")
            .output();

        let final_size = calculate_dir_size(&git_dir);
        let freed = initial_size.saturating_sub(final_size);

        Ok(freed)
    })
    .await
    .map_err(|e| e.to_string())?
}
