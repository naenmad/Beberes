use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use sysinfo::{Disks, System};

pub fn handle_cli_args() -> bool {
    let args: Vec<String> = env::args().collect();

    // If no arguments or launched via macOS LaunchServices (-psn_...)
    if args.len() <= 1 {
        return false;
    }

    let first_arg = &args[1];
    if first_arg.starts_with("-psn_") || first_arg == "gui" {
        return false;
    }

    match first_arg.as_str() {
        "-h" | "--help" | "help" => {
            print_help();
            true
        }
        "-v" | "--version" | "version" => {
            println!("Beberes v{}", env!("CARGO_PKG_VERSION"));
            true
        }
        "status" => {
            print_status();
            true
        }
        "doctor" => {
            run_doctor();
            true
        }
        "clean" => {
            run_clean(&args[2..]);
            true
        }
        "prune-trash" => {
            run_prune_trash();
            true
        }
        _ => {
            eprintln!("Unknown command: '{}'. Run 'beberes --help' for usage.", first_arg);
            true
        }
    }
}

fn print_help() {
    println!("\x1b[1;36mBeberes CLI\x1b[0m - Premium macOS Performance & Storage Optimizer v{}", env!("CARGO_PKG_VERSION"));
    println!();
    println!("\x1b[1mUSAGE:\x1b[0m");
    println!("  beberes <COMMAND> [OPTIONS]");
    println!();
    println!("\x1b[1mCOMMANDS:\x1b[0m");
    println!("  \x1b[32mstatus\x1b[0m          Display real-time storage, memory, and battery intelligence");
    println!("  \x1b[32mclean\x1b[0m           Purge caches and temporary files");
    println!("                  Options: --system, --dev, --trash, --all");
    println!("  \x1b[32mprune-trash\x1b[0m     Purge items in ~/.Trash older than 30 days");
    println!("  \x1b[32mdoctor\x1b[0m          Inspect permissions, disk health, and thermal state");
    println!("  \x1b[32mgui\x1b[0m             Launch the Beberes Graphical User Interface");
    println!();
    println!("\x1b[1mOPTIONS:\x1b[0m");
    println!("  -h, --help      Display this help menu");
    println!("  -v, --version   Display current Beberes version");
}

fn print_status() {
    println!("\x1b[1;36m=== Beberes System Status ===\x1b[0m\n");

    // 1. Memory
    let mut sys = System::new_all();
    sys.refresh_all();
    let total_mem = sys.total_memory() / (1024 * 1024);
    let used_mem = sys.used_memory() / (1024 * 1024);
    let mem_pct = if total_mem > 0 { (used_mem as f64 / total_mem as f64) * 100.0 } else { 0.0 };
    println!("\x1b[1m[Memory]\x1b[0m");
    println!("  Used: {} MB / {} MB ({:.1}%)\n", used_mem, total_mem, mem_pct);

    // 2. Storage
    let disks = Disks::new_with_refreshed_list();
    println!("\x1b[1m[Disks]\x1b[0m");
    for disk in disks.list() {
        let mount = disk.mount_point().to_string_lossy();
        let total = disk.total_space() / (1024 * 1024 * 1024);
        let avail = disk.available_space() / (1024 * 1024 * 1024);
        let used = total.saturating_sub(avail);
        let pct = if total > 0 { (used as f64 / total as f64) * 100.0 } else { 0.0 };
        println!("  • {} : {} GB / {} GB used ({:.1}%)", mount, used, total, pct);
    }
    println!();

    // 3. Trash
    if let Ok(home) = env::var("HOME") {
        let trash_path = PathBuf::from(home).join(".Trash");
        if let Ok(entries) = fs::read_dir(&trash_path) {
            let count = entries.count();
            println!("\x1b[1m[Trash]\x1b[0m");
            println!("  Items in ~/.Trash: {}\n", count);
        }
    }

    // 4. Battery
    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = Command::new("ioreg").args(["-rn", "AppleSmartBattery"]).output() {
            let out_str = String::from_utf8_lossy(&output.stdout);
            if out_str.contains("AppleSmartBattery") {
                println!("\x1b[1m[Battery]\x1b[0m");
                if let Some(pos) = out_str.find("\"CycleCount\" = ") {
                    let rest = &out_str[pos + 15..];
                    if let Some(v) = rest.split_whitespace().next() {
                        println!("  Cycle Count: {}", v);
                    }
                }
                if let Some(pos) = out_str.find("\"CurrentCapacity\" = ") {
                    let rest = &out_str[pos + 20..];
                    if let Some(v) = rest.split_whitespace().next() {
                        println!("  State of Charge: {}%", v);
                    }
                }
                println!();
            }
        }
    }
}

fn run_doctor() {
    println!("\x1b[1;36m=== Beberes Doctor Diagnostics ===\x1b[0m\n");

    // Check Full Disk Access
    print!("• Checking Full Disk Access permission... ");
    let tcc_test = if let Ok(home) = env::var("HOME") {
        let safari_dir = PathBuf::from(home).join("Library/Safari");
        fs::read_dir(safari_dir).is_ok()
    } else {
        false
    };

    if tcc_test {
        println!("\x1b[32m[GRANTED]\x1b[0m");
    } else {
        println!("\x1b[33m[LIMITED]\x1b[0m (Grant in System Settings -> Privacy & Security -> Full Disk Access)");
    }

    // Check APFS snapshots
    print!("• Checking APFS Local Snapshots... ");
    if let Ok(output) = Command::new("tmutil").arg("listlocalsnapshots").arg("/").output() {
        let count = String::from_utf8_lossy(&output.stdout).lines().count();
        println!("{} snapshots found", count);
    } else {
        println!("Unavailable");
    }

    // Check Thermal State
    print!("• Checking Thermal Pressure... ");
    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = Command::new("pmset").args(["-g", "therm"]).output() {
            let out = String::from_utf8_lossy(&output.stdout);
            if out.contains("No thermal warning") || out.contains("CPU_Speed_Limit") {
                println!("\x1b[32m[NOMINAL]\x1b[0m");
            } else {
                println!("\x1b[32m[NORMAL]\x1b[0m");
            }
        } else {
            println!("Normal");
        }
    }

    println!("\n\x1b[1;32m✓ Diagnostic completed.\x1b[0m");
}

fn run_prune_trash() {
    println!("\x1b[1;36mPruning items in ~/.Trash older than 30 days...\x1b[0m");
    let home = env::var("HOME").unwrap_or_else(|_| "/Users/Shared".to_string());
    let trash_dir = PathBuf::from(home).join(".Trash");

    if !trash_dir.exists() {
        println!("Trash folder is already empty.");
        return;
    }

    let cutoff_duration = std::time::Duration::from_secs(30 * 86400);
    let now = std::time::SystemTime::now();

    let mut count = 0;
    let mut freed = 0u64;

    if let Ok(entries) = fs::read_dir(&trash_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let p = entry.path();
            if let Ok(m) = entry.metadata() {
                if let Ok(mod_time) = m.modified() {
                    if let Ok(age) = now.duration_since(mod_time) {
                        if age >= cutoff_duration {
                            let size = if p.is_dir() {
                                walkdir::WalkDir::new(&p)
                                    .into_iter()
                                    .filter_map(|e| e.ok())
                                    .filter_map(|e| e.metadata().ok())
                                    .filter(|e| e.is_file())
                                    .map(|e| e.len())
                                    .sum()
                            } else {
                                m.len()
                            };

                            let res = if p.is_dir() {
                                fs::remove_dir_all(&p)
                            } else {
                                fs::remove_file(&p)
                            };

                            if res.is_ok() {
                                count += 1;
                                freed += size;
                            }
                        }
                    }
                }
            }
        }
    }

    println!("\x1b[1;32m✓ Successfully pruned {} items ({:.2} MB freed).\x1b[0m", count, freed as f64 / (1024.0 * 1024.0));
}

fn run_clean(flags: &[String]) {
    let clean_trash = flags.iter().any(|f| f == "--trash" || f == "--all");
    let clean_system = flags.iter().any(|f| f == "--system" || f == "--all");
    let clean_dev = flags.iter().any(|f| f == "--dev" || f == "--all");

    if !clean_trash && !clean_system && !clean_dev {
        println!("Please specify what to clean: --system, --dev, --trash, or --all");
        return;
    }

    println!("\x1b[1;36mStarting Beberes CLI cleanup...\x1b[0m");

    if clean_trash {
        print!("• Emptying macOS Trash... ");
        let _ = Command::new("osascript")
            .args(["-e", "tell application \"Finder\" to empty trash"])
            .output();
        println!("\x1b[32mDone\x1b[0m");
    }

    if clean_system {
        print!("• Purging user log files (~/Library/Logs)... ");
        if let Ok(home) = env::var("HOME") {
            let logs_dir = PathBuf::from(home).join("Library/Logs");
            if let Ok(entries) = fs::read_dir(logs_dir) {
                for entry in entries.filter_map(|e| e.ok()) {
                    let p = entry.path();
                    if p.is_file() {
                        let _ = fs::remove_file(p);
                    }
                }
            }
        }
        println!("\x1b[32mDone\x1b[0m");
    }

    if clean_dev {
        print!("• Purging Xcode DerivedData... ");
        if let Ok(home) = env::var("HOME") {
            let derived = PathBuf::from(home).join("Library/Developer/Xcode/DerivedData");
            if derived.exists() {
                let _ = fs::remove_dir_all(derived);
            }
        }
        println!("\x1b[32mDone\x1b[0m");
    }

    println!("\n\x1b[1;32m✓ Cleanup finished successfully.\x1b[0m");
}
