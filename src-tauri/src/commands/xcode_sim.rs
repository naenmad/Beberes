use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct XcodeTargetItem {
    pub id: String,
    pub title: String,
    pub path: String,
    pub size_bytes: u64,
    pub description: String,
    pub is_safe: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct XcodeEnvironmentReport {
    pub has_xcode: bool,
    pub unavailable_simulators_count: usize,
    pub total_simulators_count: usize,
    pub targets: Vec<XcodeTargetItem>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SimctlPurgeResult {
    pub success: bool,
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

#[tauri::command]
pub fn scan_xcode_environments() -> Result<XcodeEnvironmentReport, String> {
    let home = dirs::home_dir().ok_or("Could not resolve home directory")?;
    let dev_root = home.join("Library/Developer");

    let has_xcode = dev_root.exists()
        || Path::new("/Applications/Xcode.app").exists()
        || Command::new("which").arg("xcrun").output().map(|o| o.status.success()).unwrap_or(false);

    let mut unavailable_count = 0;
    let mut total_count = 0;

    // Check simctl devices
    if let Ok(output) = Command::new("xcrun").args(["simctl", "list", "devices", "-j"]).output() {
        if output.status.success() {
            if let Ok(json_val) = serde_json::from_slice::<serde_json::Value>(&output.stdout) {
                if let Some(devices_map) = json_val.get("devices").and_then(|d| d.as_object()) {
                    for (_runtime, device_list) in devices_map {
                        if let Some(arr) = device_list.as_array() {
                            for dev in arr {
                                total_count += 1;
                                if dev.get("isAvailable").and_then(|a| a.as_bool()) == Some(false) {
                                    unavailable_count += 1;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    let mut targets = Vec::new();

    // 1. Xcode DerivedData
    let derived_data_path = dev_root.join("Xcode/DerivedData");
    let derived_data_size = compute_dir_size(&derived_data_path);
    targets.push(XcodeTargetItem {
        id: "derived_data".to_string(),
        title: "Xcode DerivedData (Build Caches)".to_string(),
        path: derived_data_path.to_string_lossy().to_string(),
        size_bytes: derived_data_size,
        description: "Index files, intermediate build objects, and module caches. Completely safe to clear; Xcode rebuilds automatically.".to_string(),
        is_safe: true,
    });

    // 2. iOS DeviceSupport Symbols
    let device_support_path = dev_root.join("Xcode/iOS DeviceSupport");
    let device_support_size = compute_dir_size(&device_support_path);
    targets.push(XcodeTargetItem {
        id: "device_support".to_string(),
        title: "iOS DeviceSupport Debug Symbols".to_string(),
        path: device_support_path.to_string_lossy().to_string(),
        size_bytes: device_support_size,
        description: "Debugging symbols from older connected iPhones/iPads. Often hoards 10-30 GB from legacy iOS versions.".to_string(),
        is_safe: true,
    });

    // 3. CoreSimulator Devices Cache
    let simulator_devices_path = dev_root.join("CoreSimulator/Devices");
    let simulator_size = compute_dir_size(&simulator_devices_path);
    targets.push(XcodeTargetItem {
        id: "core_simulators".to_string(),
        title: "iOS & watchOS Simulator Devices Data".to_string(),
        path: simulator_devices_path.to_string_lossy().to_string(),
        size_bytes: simulator_size,
        description: "Installed sandbox data and system caches inside local CoreSimulator devices.".to_string(),
        is_safe: false, // Requires user discretion
    });

    // 4. Xcode Archives
    let archives_path = dev_root.join("Xcode/Archives");
    let archives_size = compute_dir_size(&archives_path);
    targets.push(XcodeTargetItem {
        id: "xcode_archives".to_string(),
        title: "Xcode Distribution Archives".to_string(),
        path: archives_path.to_string_lossy().to_string(),
        size_bytes: archives_size,
        description: "Historical App Store packaging archives and dSYM debug artifacts.".to_string(),
        is_safe: false,
    });

    // 5. CoreSimulator Caches
    let sim_caches_path = dev_root.join("CoreSimulator/Caches");
    let sim_caches_size = compute_dir_size(&sim_caches_path);
    if sim_caches_path.exists() {
        targets.push(XcodeTargetItem {
            id: "simulator_caches".to_string(),
            title: "CoreSimulator Temp Caches".to_string(),
            path: sim_caches_path.to_string_lossy().to_string(),
            size_bytes: sim_caches_size,
            description: "Temporary download and compilation assets for Simulator runtimes.".to_string(),
            is_safe: true,
        });
    }

    Ok(XcodeEnvironmentReport {
        has_xcode,
        unavailable_simulators_count: unavailable_count,
        total_simulators_count: total_count,
        targets,
    })
}

#[tauri::command]
pub fn purge_unavailable_simulators() -> Result<SimctlPurgeResult, String> {
    let output = Command::new("xcrun")
        .args(["simctl", "delete", "unavailable"])
        .output()
        .map_err(|e| format!("Failed to run xcrun simctl: {}", e))?;

    if output.status.success() {
        Ok(SimctlPurgeResult {
            success: true,
            message: "Successfully deleted all unavailable and orphaned simulators".to_string(),
        })
    } else {
        let err_str = String::from_utf8_lossy(&output.stderr);
        Err(format!("xcrun error: {}", err_str.trim()))
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct XcodeCleanResult {
    pub success: bool,
    #[serde(rename = "freedBytes")]
    pub freed_bytes: u64,
    #[serde(rename = "cleanedCount")]
    pub cleaned_count: usize,
    pub message: String,
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

    // Fallback to direct fs removal if Finder script cannot trash
    if path.is_dir() {
        std::fs::remove_dir_all(path).map_err(|e| e.to_string())
    } else {
        std::fs::remove_file(path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn clean_xcode_target(target_id: String) -> Result<XcodeCleanResult, String> {
    let home = dirs::home_dir().ok_or("Could not resolve home directory")?;
    let dev_root = home.join("Library/Developer");

    let target_dir: PathBuf = match target_id.as_str() {
        "derived_data" => dev_root.join("Xcode/DerivedData"),
        "device_support" => dev_root.join("Xcode/iOS DeviceSupport"),
        "simulator_caches" => dev_root.join("CoreSimulator/Caches"),
        "xcode_archives" => dev_root.join("Xcode/Archives"),
        _ => return Err(format!("Unknown Xcode target: {}", target_id)),
    };

    if !target_dir.exists() {
        return Ok(XcodeCleanResult {
            success: true,
            freed_bytes: 0,
            cleaned_count: 0,
            message: "Target directory does not exist or is already clean.".to_string(),
        });
    }

    let mut freed_bytes: u64 = 0;
    let mut cleaned_count: usize = 0;

    // Iterate through children inside target_dir and remove/trash them
    if let Ok(entries) = std::fs::read_dir(&target_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let size = compute_dir_size(&path);

            if move_to_trash_or_remove(&path).is_ok() {
                freed_bytes += size;
                cleaned_count += 1;
            }
        }
    }

    Ok(XcodeCleanResult {
        success: true,
        freed_bytes,
        cleaned_count,
        message: format!("Cleared {} items from Xcode.", cleaned_count),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scan_xcode_environments_runs() {
        let res = scan_xcode_environments();
        assert!(res.is_ok());
        let report = res.unwrap();
        assert!(!report.targets.is_empty());
        assert!(report.targets.iter().any(|t| t.id == "derived_data"));
    }
}

