use serde::{Deserialize, Serialize};
use std::process::Command;
use sysinfo::{Pid, System};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ListeningPort {
    pub port: u16,
    pub pid: u32,
    pub process_name: String,
    pub user: String,
    pub protocol: String,
    pub address: String,
    pub memory_bytes: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KillResult {
    pub success: bool,
    pub pid: u32,
    pub message: String,
}

#[tauri::command]
pub fn list_active_ports() -> Result<Vec<ListeningPort>, String> {
    let output = Command::new("lsof")
        .args(["-nP", "-iTCP", "-sTCP:LISTEN"])
        .output()
        .map_err(|e| format!("Failed to execute lsof: {}", e))?;

    if !output.status.success() && output.stdout.is_empty() {
        return Ok(Vec::new());
    }

    let stdout_str = String::from_utf8_lossy(&output.stdout);
    let mut ports: Vec<ListeningPort> = Vec::new();
    let mut seen_keys = std::collections::HashSet::new();

    // Query system for memory usage by PID
    let mut sys = System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    for line in stdout_str.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 9 {
            continue;
        }

        let process_name = parts[0].to_string();
        let pid: u32 = match parts[1].parse() {
            Ok(p) => p,
            Err(_) => continue,
        };
        let user = parts[2].to_string();
        let protocol = parts[4].to_string();

        // Target address is usually the second to last part before (LISTEN)
        // e.g. "TCP 127.0.0.1:3000 (LISTEN)" -> parts: [..., "TCP", "127.0.0.1:3000", "(LISTEN)"]
        let address_token = if parts.len() >= 9 {
            parts[parts.len() - 2]
        } else {
            continue;
        };

        let port: u16 = match address_token.rsplit(':').next().and_then(|s| s.parse().ok()) {
            Some(p) => p,
            None => continue,
        };

        // Deduplicate (port, pid) pairs
        let key = (port, pid);
        if seen_keys.contains(&key) {
            continue;
        }
        seen_keys.insert(key);

        let sys_pid = Pid::from_u32(pid);
        let memory_bytes = sys.process(sys_pid).map(|p| p.memory()).unwrap_or(0);

        ports.push(ListeningPort {
            port,
            pid,
            process_name,
            user,
            protocol,
            address: address_token.to_string(),
            memory_bytes,
        });
    }

    ports.sort_by_key(|p| p.port);
    Ok(ports)
}

#[tauri::command]
pub fn kill_process_by_pid(pid: u32, force: bool) -> Result<KillResult, String> {
    // Safety guardrails: never terminate core system processes
    if pid <= 100 {
        return Err(format!("Protected process: cannot terminate system PID {}", pid));
    }

    // Verify process name isn't a critical macOS daemon
    let mut sys = System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    let sys_pid = Pid::from_u32(pid);

    if let Some(proc_ref) = sys.process(sys_pid) {
        let name = proc_ref.name().to_string_lossy().to_lowercase();
        let protected_daemons = [
            "launchd",
            "kernel_task",
            "windowserver",
            "loginwindow",
            "mds",
            "finder",
            "dock",
            "systemsoundserverd",
        ];
        if protected_daemons.iter().any(|d| name.contains(d)) {
            return Err(format!("Safety whitelist: cannot terminate system daemon '{}'", name));
        }
    }

    let signal_flag = if force { "-9" } else { "-15" };
    let output = Command::new("kill")
        .args([signal_flag, &pid.to_string()])
        .output()
        .map_err(|e| format!("Failed to run kill command: {}", e))?;

    if output.status.success() {
        Ok(KillResult {
            success: true,
            pid,
            message: format!("Process {} terminated successfully", pid),
        })
    } else {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to kill PID {}: {}", pid, err_msg.trim()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_protected_pid_safety() {
        let res = kill_process_by_pid(1, false);
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("Protected process"));

        let res0 = kill_process_by_pid(0, true);
        assert!(res0.is_err());
        assert!(res0.unwrap_err().contains("Protected process"));
    }

    #[test]
    fn test_list_active_ports_runs() {
        let res = list_active_ports();
        assert!(res.is_ok());
    }
}

