use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::{Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShredResult {
    #[serde(rename = "shreddedCount")]
    pub shredded_count: usize,
    #[serde(rename = "totalBytes")]
    pub total_bytes: u64,
    pub errors: Vec<String>,
}

fn pseudo_random_byte(seed: &mut u64) -> u8 {
    *seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
    (*seed >> 32) as u8
}

fn secure_shred_file(path: &Path, passes: u8) -> Result<u64, String> {
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    let file_len = metadata.len();

    if file_len > 0 {
        let mut file = OpenOptions::new()
            .write(true)
            .open(path)
            .map_err(|e| e.to_string())?;

        let chunk_size = 64 * 1024; // 64 KB buffer
        let num_passes = passes.clamp(1, 7);
        let mut seed = (file_len ^ 0x9E3779B97F4A7C15) | 1;

        for pass in 0..num_passes {
            file.seek(SeekFrom::Start(0)).map_err(|e| e.to_string())?;
            let mut remaining = file_len;

            while remaining > 0 {
                let to_write = remaining.min(chunk_size as u64) as usize;
                let buf = match pass % 3 {
                    0 => vec![0x00u8; to_write], // Zero fill
                    1 => vec![0xFFu8; to_write], // One fill
                    _ => {
                        let mut r = Vec::with_capacity(to_write);
                        for _ in 0..to_write {
                            r.push(pseudo_random_byte(&mut seed));
                        }
                        r
                    }
                };

                file.write_all(&buf).map_err(|e| e.to_string())?;
                remaining -= to_write as u64;
            }

            let _ = file.sync_all();
        }

        // Truncate to 0 byte
        file.set_len(0).map_err(|e| e.to_string())?;
        let _ = file.sync_all();
    }

    // Rename to scramble metadata trace before removing
    let parent = path.parent().unwrap_or_else(|| Path::new("/"));
    let scrambled_name = format!("shred_{:x}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos());
    let scrambled_path = parent.join(scrambled_name);

    let final_path = match fs::rename(path, &scrambled_path) {
        Ok(_) => scrambled_path,
        Err(_) => path.to_path_buf(),
    };

    fs::remove_file(&final_path).map_err(|e| e.to_string())?;
    Ok(file_len)
}

#[tauri::command]
pub async fn shred_paths(paths: Vec<String>, passes: Option<u8>) -> Result<ShredResult, String> {
    let num_passes = passes.unwrap_or(3);

    tokio::task::spawn_blocking(move || {
        let mut count = 0usize;
        let mut bytes = 0u64;
        let mut errors = Vec::new();

        for p_str in paths {
            let path = PathBuf::from(&p_str);
            if !path.exists() {
                continue;
            }

            if path.is_file() {
                match secure_shred_file(&path, num_passes) {
                    Ok(len) => {
                        count += 1;
                        bytes += len;
                    }
                    Err(e) => errors.push(format!("{}: {}", p_str, e)),
                }
            } else if path.is_dir() {
                // Collect files in bottom-up order
                let mut files = Vec::new();
                let mut dirs = Vec::new();

                for entry in WalkDir::new(&path).into_iter().filter_map(|e| e.ok()) {
                    if entry.file_type().is_file() {
                        files.push(entry.into_path());
                    } else if entry.file_type().is_dir() && entry.path() != path {
                        dirs.push(entry.into_path());
                    }
                }

                for f in files {
                    match secure_shred_file(&f, num_passes) {
                        Ok(len) => {
                            count += 1;
                            bytes += len;
                        }
                        Err(e) => errors.push(format!("{}: {}", f.to_string_lossy(), e)),
                    }
                }

                // Remove subdirectories from deepest to shallowest
                dirs.sort_by_key(|a| std::cmp::Reverse(a.components().count()));
                for d in dirs {
                    let _ = fs::remove_dir(d);
                }
                let _ = fs::remove_dir(&path);
            }
        }

        Ok(ShredResult {
            shredded_count: count,
            total_bytes: bytes,
            errors,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}
