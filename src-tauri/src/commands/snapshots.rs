use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApfsSnapshotItem {
    pub id: String,
    pub name: String,
    pub date_str: String,
    pub estimated_size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApfsSnapshotResult {
    pub total_snapshots: usize,
    pub snapshots: Vec<ApfsSnapshotItem>,
}

/// List all APFS local snapshots on the root volume created by Time Machine / macOS updates.
#[tauri::command]
pub fn list_apfs_snapshots() -> Result<ApfsSnapshotResult, String> {
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("tmutil")
            .arg("listlocalsnapshots")
            .arg("/")
            .output()
            .map_err(|e| format!("Failed to list local snapshots: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut snapshots = Vec::new();

        for line in stdout.lines() {
            let line = line.trim();
            if line.starts_with("com.apple.TimeMachine.") {
                // e.g., com.apple.TimeMachine.2026-09-18-102542.local
                let parts: Vec<&str> = line.split('.').collect();
                let date_str = if parts.len() >= 4 {
                    parts[3].to_string()
                } else {
                    line.replace("com.apple.TimeMachine.", "")
                        .replace(".local", "")
                };

                snapshots.push(ApfsSnapshotItem {
                    id: line.to_string(),
                    name: line.to_string(),
                    date_str,
                    // APFS snapshots typically claim 500MB to 5GB of purgeable space each
                    estimated_size: 1_500_000_000,
                });
            }
        }

        let total = snapshots.len();
        Ok(ApfsSnapshotResult {
            total_snapshots: total,
            snapshots,
        })
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(ApfsSnapshotResult {
            total_snapshots: 0,
            snapshots: Vec::new(),
        })
    }
}

/// Delete a specific APFS snapshot by its date string (e.g., 2026-09-18-102542).
#[tauri::command]
pub fn delete_apfs_snapshot(snapshot_date: String) -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("tmutil")
            .arg("deletelocalsnapshots")
            .arg(&snapshot_date)
            .output()
            .map_err(|e| format!("Failed to execute tmutil deletelocalsnapshots: {}", e))?;

        if output.status.success() {
            Ok(true)
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("Could not delete snapshot: {}", stderr.trim()))
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(false)
    }
}

/// Delete all detected APFS local snapshots to free up "System Data" / "Other" purgeable space.
#[tauri::command]
pub fn delete_all_apfs_snapshots() -> Result<usize, String> {
    #[cfg(target_os = "macos")]
    {
        let list_res = list_apfs_snapshots()?;
        let mut deleted_count = 0;

        for snap in list_res.snapshots {
            if let Ok(true) = delete_apfs_snapshot(snap.date_str) {
                deleted_count += 1;
            }
        }

        Ok(deleted_count)
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(0)
    }
}
