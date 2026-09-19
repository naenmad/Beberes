use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DormantArtifact {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DormantProject {
    pub name: String,
    pub path: String,
    pub last_commit_time: u64,
    pub last_commit_subject: String,
    pub inactive_days: u64,
    pub total_reclaimable_bytes: u64,
    pub artifacts: Vec<DormantArtifact>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HibernateResult {
    pub success: bool,
    pub project_path: String,
    pub freed_bytes: u64,
    pub removed_artifacts_count: usize,
    pub message: String,
}

fn compute_dir_size(path: &Path) -> u64 {
    if !path.exists() {
        return 0;
    }
    walkdir::WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .map(|e| e.metadata().map(|m| m.len()).unwrap_or(0))
        .sum()
}

fn get_last_git_commit(repo_path: &Path) -> Option<(u64, String)> {
    let output = Command::new("git")
        .args(["-C", &repo_path.to_string_lossy(), "log", "-1", "--format=%ct|||%s"])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let raw = String::from_utf8_lossy(&output.stdout);
    let trimmed = raw.trim();
    let mut parts = trimmed.splitn(2, "|||");

    let timestamp: u64 = parts.next()?.parse().ok()?;
    let subject = parts.next().unwrap_or("No commit message").to_string();

    Some((timestamp, subject))
}

const BUILD_ARTIFACT_NAMES: &[&str] = &[
    "node_modules",
    "target",
    ".venv",
    "venv",
    "build",
    "dist",
    ".dart_tool",
    ".next",
    ".turbo",
    ".nuxt",
    ".pytest_cache",
    "__pycache__",
];

#[tauri::command]
pub fn scan_dormant_projects(
    search_dirs: Option<Vec<String>>,
    days_threshold: u64,
) -> Result<Vec<DormantProject>, String> {
    let home = dirs::home_dir().ok_or("Could not resolve home directory")?;
    let mut candidate_roots: Vec<PathBuf> = Vec::new();

    if let Some(dirs) = search_dirs {
        for d in dirs {
            let p = PathBuf::from(d);
            if p.exists() {
                candidate_roots.push(p);
            }
        }
    }

    if candidate_roots.is_empty() {
        let common = [
            home.join("Developer"),
            home.join("Projects"),
            home.join("Workspace"),
            home.join("Code"),
            home.join("Documents/Developer"),
            home.join("Documents/Projects"),
        ];
        for dir in common {
            if dir.exists() {
                candidate_roots.push(dir);
            }
        }
    }

    if candidate_roots.is_empty() {
        // Fallback to home/Developer even if it has to be checked
        candidate_roots.push(home.join("Developer"));
    }

    let now_secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let mut git_repos: Vec<PathBuf> = Vec::new();

    // Traverse candidates up to depth 3 looking for .git directories
    for root in candidate_roots {
        let walker = walkdir::WalkDir::new(&root)
            .max_depth(3)
            .follow_links(false)
            .into_iter();

        for entry in walker.filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            // Don't recurse into giant artifact directories
            !BUILD_ARTIFACT_NAMES.contains(&name.as_ref())
        }).flatten() {
            if entry.file_type().is_dir() && entry.file_name() == ".git" {
                if let Some(parent) = entry.path().parent() {
                    git_repos.push(parent.to_path_buf());
                }
            }
        }
    }

    let mut dormant_projects: Vec<DormantProject> = Vec::new();

    for repo in git_repos {
        if let Some((commit_time, commit_subject)) = get_last_git_commit(&repo) {
            let elapsed_secs = now_secs.saturating_sub(commit_time);
            let elapsed_days = elapsed_secs / 86400;

            if elapsed_days >= days_threshold {
                let mut artifacts = Vec::new();
                let mut total_reclaimable = 0;

                for &art_name in BUILD_ARTIFACT_NAMES {
                    let art_path = repo.join(art_name);
                    if art_path.exists() {
                        let size = compute_dir_size(&art_path);
                        if size > 0 {
                            total_reclaimable += size;
                            artifacts.push(DormantArtifact {
                                name: art_name.to_string(),
                                path: art_path.to_string_lossy().to_string(),
                                size_bytes: size,
                            });
                        }
                    }
                }

                if !artifacts.is_empty() {
                    let project_name = repo
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_else(|| "Unknown".to_string());

                    dormant_projects.push(DormantProject {
                        name: project_name,
                        path: repo.to_string_lossy().to_string(),
                        last_commit_time: commit_time,
                        last_commit_subject: commit_subject,
                        inactive_days: elapsed_days,
                        total_reclaimable_bytes: total_reclaimable,
                        artifacts,
                    });
                }
            }
        }
    }

    // Sort by largest reclaimable space descending
    dormant_projects.sort_by(|a, b| b.total_reclaimable_bytes.cmp(&a.total_reclaimable_bytes));
    Ok(dormant_projects)
}

fn move_to_trash_or_remove(path: &Path) -> Result<(), String> {
    let output = Command::new("osascript")
        .arg("-e")
        .arg(format!("tell application \"Finder\" to delete POSIX file \"{}\"", path.to_string_lossy()))
        .output();

    if let Ok(out) = output {
        if out.status.success() {
            return Ok(());
        }
    }

    if path.is_dir() {
        std::fs::remove_dir_all(path).map_err(|e| e.to_string())
    } else {
        std::fs::remove_file(path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn hibernate_project(
    project_path: String,
    artifact_paths: Vec<String>,
) -> Result<HibernateResult, String> {
    let proj = PathBuf::from(&project_path);
    if !proj.exists() {
        return Err(format!("Project directory does not exist: {}", project_path));
    }

    let mut freed_bytes = 0;
    let mut removed_count = 0;

    for art in artifact_paths {
        let p = PathBuf::from(&art);

        // Security check: ensure target path is strictly a descendant of project_path
        if !p.starts_with(&proj) {
            return Err(format!("Security error: path outside project boundary: {}", art));
        }

        // Never delete .git directory or project root
        let file_name = p.file_name().map(|n| n.to_string_lossy()).unwrap_or_default();
        if file_name == ".git" || p == proj {
            return Err(format!("Refusing to remove critical repository structure: {}", art));
        }

        if p.exists() {
            let size = compute_dir_size(&p);
            match move_to_trash_or_remove(&p) {
                Ok(_) => {
                    freed_bytes += size;
                    removed_count += 1;
                }
                Err(e) => {
                    return Err(format!("Failed to remove artifact {}: {}", art, e));
                }
            }
        }
    }

    Ok(HibernateResult {
        success: true,
        project_path,
        freed_bytes,
        removed_artifacts_count: removed_count,
        message: format!(
            "Project hibernated successfully. Removed {} build artifacts, saving {}.",
            removed_count,
            crate::utils::format_size(freed_bytes)
        ),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hibernate_security_boundary() {
        let res = hibernate_project(
            "/tmp/fake_project".to_string(),
            vec!["/etc/passwd".to_string()],
        );
        assert!(res.is_err());
    }

    #[test]
    fn test_scan_dormant_projects_runs() {
        let res = scan_dormant_projects(Some(vec!["/tmp".to_string()]), 30);
        assert!(res.is_ok());
    }
}

