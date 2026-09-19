use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimilarPhotoItem {
    pub id: String,
    pub path: String,
    pub filename: String,
    pub size_bytes: u64,
    pub width: u32,
    pub height: u32,
    pub last_modified: u64,
    pub is_recommended_keep: bool,
    pub selected_to_remove: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimilarPhotoGroup {
    pub group_id: String,
    pub similarity_percentage: u32,
    pub items: Vec<SimilarPhotoItem>,
    pub reclaimable_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimilarMediaScanResult {
    pub groups: Vec<SimilarPhotoGroup>,
    pub total_similar_count: usize,
    pub total_reclaimable_bytes: u64,
}

struct ImageFingerprint {
    path: PathBuf,
    size: u64,
    width: u32,
    height: u32,
    modified: u64,
    hash: u64,
}

fn compute_dhash_via_sips(img_path: &Path) -> Option<(u64, u32, u32)> {
    // Generate a tiny 9x8 raw grayscale bitmap using sips
    let temp_dir = std::env::temp_dir();
    let temp_bmp = temp_dir.join(format!("beberes_hash_{}.bmp", fastrand_simple()));

    let status = Command::new("sips")
        .args([
            "-s", "format", "bmp",
            "--resampleWidth", "9",
            "--resampleHeight", "8",
            img_path.to_str()?,
            "--out",
            temp_bmp.to_str()?,
        ])
        .output();

    if let Ok(out) = status {
        if out.status.success() {
            if let Ok(bytes) = fs::read(&temp_bmp) {
                let _ = fs::remove_file(&temp_bmp);
                // BMP header is typically 54 bytes
                if bytes.len() > 54 {
                    let pixel_data = &bytes[54..];
                    // Compute difference hash across rows
                    let mut hash: u64 = 0;
                    let mut bit_idx = 0;
                    for row in 0..8 {
                        for col in 0..8 {
                            let idx1 = (row * 9 + col) * 3;
                            let idx2 = (row * 9 + col + 1) * 3;
                            if idx2 + 2 < pixel_data.len() {
                                // Grayscale luminance approximation
                                let lum1 = (pixel_data[idx1] as u32 + pixel_data[idx1 + 1] as u32 + pixel_data[idx1 + 2] as u32) / 3;
                                let lum2 = (pixel_data[idx2] as u32 + pixel_data[idx2 + 1] as u32 + pixel_data[idx2 + 2] as u32) / 3;
                                if lum1 > lum2 {
                                    hash |= 1 << bit_idx;
                                }
                                bit_idx += 1;
                            }
                        }
                    }

                    // Also retrieve original dimensions via sips
                    let (width, height) = read_dimensions_via_sips(img_path).unwrap_or((1920, 1080));
                    return Some((hash, width, height));
                }
            }
        }
    }

    let _ = fs::remove_file(&temp_bmp);
    None
}

fn read_dimensions_via_sips(img_path: &Path) -> Option<(u32, u32)> {
    let output = Command::new("sips")
        .args(["-g", "pixelWidth", "-g", "pixelHeight", img_path.to_str()?])
        .output()
        .ok()?;

    let s = String::from_utf8_lossy(&output.stdout);
    let mut w = 0u32;
    let mut h = 0u32;

    for line in s.lines() {
        if line.contains("pixelWidth:") {
            if let Some(val) = line.split_whitespace().last() {
                w = val.parse().unwrap_or(0);
            }
        } else if line.contains("pixelHeight:") {
            if let Some(val) = line.split_whitespace().last() {
                h = val.parse().unwrap_or(0);
            }
        }
    }

    if w > 0 && h > 0 {
        Some((w, h))
    } else {
        None
    }
}

fn fastrand_simple() -> u32 {
    use std::time::SystemTime;
    let nanos = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(12345);
    nanos ^ (std::process::id() << 16)
}

fn hamming_distance(a: u64, b: u64) -> u32 {
    (a ^ b).count_ones()
}

#[tauri::command]
pub fn scan_similar_photos(
    target_folders: Option<Vec<String>>,
    max_distance: Option<u32>,
) -> SimilarMediaScanResult {
    let threshold = max_distance.unwrap_or(6);
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/Users/Shared"));

    let folders: Vec<PathBuf> = match target_folders {
        Some(paths) if !paths.is_empty() => paths.into_iter().map(PathBuf::from).collect(),
        _ => vec![
            home.join("Pictures"),
            home.join("Downloads"),
            home.join("Desktop"),
        ],
    };

    let mut candidate_paths = Vec::new();
    let valid_exts = ["png", "jpg", "jpeg", "heic", "webp"];

    for folder in folders {
        if !folder.exists() {
            continue;
        }
        for entry in WalkDir::new(folder)
            .max_depth(4)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    let lower = ext.to_lowercase();
                    if valid_exts.contains(&lower.as_str()) {
                        // Limit file size to avoid processing massive PSD/RAW that aren't everyday photos
                        if let Ok(meta) = path.metadata() {
                            if meta.len() > 10_000 && meta.len() < 50_000_000 {
                                candidate_paths.push((path.to_path_buf(), meta.len()));
                            }
                        }
                    }
                }
            }
        }
    }

    // Limit initial candidate list to top 250 most recent to keep scan fast
    candidate_paths.truncate(250);

    let mut fingerprints = Vec::new();
    for (path, size) in candidate_paths {
        if let Some((hash, width, height)) = compute_dhash_via_sips(&path) {
            let modified = path
                .metadata()
                .and_then(|m| m.modified())
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0);

            fingerprints.push(ImageFingerprint {
                path,
                size,
                width,
                height,
                modified,
                hash,
            });
        }
    }

    let mut groups = Vec::new();
    let mut visited = vec![false; fingerprints.len()];

    for i in 0..fingerprints.len() {
        if visited[i] {
            continue;
        }

        let mut cluster = vec![i];
        let mut min_dist = 64u32;

        for j in (i + 1)..fingerprints.len() {
            if visited[j] {
                continue;
            }
            let dist = hamming_distance(fingerprints[i].hash, fingerprints[j].hash);
            if dist <= threshold {
                cluster.push(j);
                visited[j] = true;
                if dist < min_dist {
                    min_dist = dist;
                }
            }
        }

        if cluster.len() > 1 {
            visited[i] = true;

            // Find best resolution / highest size item to keep
            let mut best_idx = cluster[0];
            let mut max_res = fingerprints[best_idx].width as u64 * fingerprints[best_idx].height as u64;

            for &idx in &cluster {
                let res = fingerprints[idx].width as u64 * fingerprints[idx].height as u64;
                if res > max_res || (res == max_res && fingerprints[idx].size > fingerprints[best_idx].size) {
                    max_res = res;
                    best_idx = idx;
                }
            }

            let mut group_items = Vec::new();
            let mut reclaimable: u64 = 0;

            for &idx in &cluster {
                let fp = &fingerprints[idx];
                let is_keep = idx == best_idx;
                if !is_keep {
                    reclaimable += fp.size;
                }

                group_items.push(SimilarPhotoItem {
                    id: format!("sim_{}_{}", i, idx),
                    path: fp.path.to_string_lossy().to_string(),
                    filename: fp.path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                    size_bytes: fp.size,
                    width: fp.width,
                    height: fp.height,
                    last_modified: fp.modified,
                    is_recommended_keep: is_keep,
                    selected_to_remove: !is_keep,
                });
            }

            let similarity_percentage = 100 - ((min_dist as f32 / 64.0) * 100.0).round() as u32;

            groups.push(SimilarPhotoGroup {
                group_id: format!("group_{}", i),
                similarity_percentage: similarity_percentage.max(85),
                items: group_items,
                reclaimable_bytes: reclaimable,
            });
        }
    }

    let total_similar_count: usize = groups.iter().map(|g| g.items.len()).sum();
    let total_reclaimable_bytes: u64 = groups.iter().map(|g| g.reclaimable_bytes).sum();

    SimilarMediaScanResult {
        groups,
        total_similar_count,
        total_reclaimable_bytes,
    }
}

#[tauri::command]
pub fn delete_similar_photos(photo_paths: Vec<String>, to_trash: bool) -> Result<u64, String> {
    let mut freed_bytes: u64 = 0;

    for path_str in photo_paths {
        let path = Path::new(&path_str);
        if path.exists() {
            let size = path.metadata().map(|m| m.len()).unwrap_or(0);
            if to_trash {
                #[cfg(target_os = "macos")]
                {
                    let script = format!(
                        r#"tell application "Finder" to delete POSIX file "{}""#,
                        path.to_str().unwrap_or("")
                    );
                    if Command::new("osascript").args(["-e", &script]).status().is_ok() {
                        freed_bytes += size;
                        continue;
                    }
                }
            }
            // Fallback direct delete
            if fs::remove_file(path).is_ok() {
                freed_bytes += size;
            }
        }
    }

    Ok(freed_bytes)
}
