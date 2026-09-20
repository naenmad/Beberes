use serde::{Deserialize, Serialize};
use std::process::Command;
use std::sync::Mutex;
use sysinfo::System;

static SYSTEM_MONITOR: Mutex<Option<System>> = Mutex::new(None);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatteryIntelligence {
    pub has_battery: bool,
    pub cycle_count: u32,
    pub health_percentage: f64,
    pub current_percentage: u32,
    pub design_capacity: u32,
    pub nominal_capacity: u32,
    pub is_charging: bool,
    pub is_fully_charged: bool,
    pub is_plugged_in: bool,
    pub charger_watts: Option<u32>,
    pub condition: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThermalIntelligence {
    pub thermal_state: String,
    pub cpu_speed_limit: u32,
    pub is_throttled: bool,
    pub cpu_brand: String,
    pub cpu_usage: f32,
    pub core_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnergyHogProcess {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f32,
    pub memory_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareReport {
    pub battery: BatteryIntelligence,
    pub thermal: ThermalIntelligence,
    pub energy_hogs: Vec<EnergyHogProcess>,
}

#[tauri::command]
pub fn get_hardware_intelligence() -> HardwareReport {
    let battery = read_macos_battery();
    let (thermal, energy_hogs) = read_system_and_energy();

    HardwareReport {
        battery,
        thermal,
        energy_hogs,
    }
}

fn read_macos_battery() -> BatteryIntelligence {
    let mut batt = BatteryIntelligence {
        has_battery: false,
        cycle_count: 0,
        health_percentage: 100.0,
        current_percentage: 100,
        design_capacity: 0,
        nominal_capacity: 0,
        is_charging: false,
        is_fully_charged: false,
        is_plugged_in: true,
        charger_watts: None,
        condition: "Normal".to_string(),
    };

    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = Command::new("ioreg").args(["-rn", "AppleSmartBattery"]).output() {
            let out_str = String::from_utf8_lossy(&output.stdout);
            if out_str.contains("AppleSmartBattery") {
                batt.has_battery = true;

                // CycleCount
                if let Some(pos) = out_str.find("\"CycleCount\" = ") {
                    let rest = &out_str[pos + 15..];
                    if let Some(val_str) = rest.split_whitespace().next() {
                        if let Ok(val) = val_str.parse::<u32>() {
                            batt.cycle_count = val;
                        }
                    }
                }

                // CurrentCapacity
                if let Some(pos) = out_str.find("\"CurrentCapacity\" = ") {
                    let rest = &out_str[pos + 20..];
                    if let Some(val_str) = rest.split_whitespace().next() {
                        if let Ok(val) = val_str.parse::<u32>() {
                            batt.current_percentage = val;
                        }
                    }
                }

                // ExternalConnected
                if out_str.contains("\"ExternalConnected\" = Yes") {
                    batt.is_plugged_in = true;
                } else if out_str.contains("\"ExternalConnected\" = No") {
                    batt.is_plugged_in = false;
                }

                // FullyCharged
                if out_str.contains("\"FullyCharged\"=1") || out_str.contains("\"FullyCharged\" = 1") || out_str.contains("\"FullyCharged\" = Yes") {
                    batt.is_fully_charged = true;
                }

                // IsCharging
                if out_str.contains("\"IsCharging\"=1") || out_str.contains("\"IsCharging\" = 1") || out_str.contains("\"IsCharging\" = Yes") {
                    batt.is_charging = true;
                }

                // Charger Watts
                if let Some(pos) = out_str.find("\"Watts\"=") {
                    let rest = &out_str[pos + 8..];
                    let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
                    if let Ok(w) = digits.parse::<u32>() {
                        batt.charger_watts = Some(w);
                    }
                }

                // BatteryData: DesignCapacity & NominalChargeCapacity
                let mut design = 0u32;
                let mut nominal = 0u32;
                if let Some(pos) = out_str.find("\"DesignCapacity\"=") {
                    let rest = &out_str[pos + 17..];
                    let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
                    if let Ok(d) = digits.parse::<u32>() {
                        design = d;
                        batt.design_capacity = d;
                    }
                }

                if let Some(pos) = out_str.find("\"NominalChargeCapacity\"=") {
                    let rest = &out_str[pos + 24..];
                    let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
                    if let Ok(n) = digits.parse::<u32>() {
                        nominal = n;
                        batt.nominal_capacity = n;
                    }
                }

                if design > 0 && nominal > 0 {
                    let pct = (nominal as f64 / design as f64) * 100.0;
                    batt.health_percentage = (pct * 10.0).round() / 10.0;
                    if batt.health_percentage < 80.0 {
                        batt.condition = "Service Recommended".to_string();
                    } else {
                        batt.condition = "Normal".to_string();
                    }
                }
            }
        }
    }

    batt
}

fn read_system_and_energy() -> (ThermalIntelligence, Vec<EnergyHogProcess>) {
    let mut guard = SYSTEM_MONITOR.lock().unwrap_or_else(|e| e.into_inner());
    let sys = guard.get_or_insert_with(|| {
        let mut s = System::new();
        s.refresh_cpu_all();
        s.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
        s
    });

    sys.refresh_cpu_all();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    let mut hogs = Vec::new();
    for (&pid, process) in sys.processes() {
        let cpu = process.cpu_usage();
        if cpu > 0.5 {
            hogs.push(EnergyHogProcess {
                pid: pid.as_u32(),
                name: process.name().to_string_lossy().to_string(),
                cpu_usage: (cpu * 10.0).round() / 10.0,
                memory_bytes: process.memory(),
            });
        }
    }

    hogs.sort_by(|a, b| b.cpu_usage.partial_cmp(&a.cpu_usage).unwrap_or(std::cmp::Ordering::Equal));
    hogs.truncate(6);

    let mut cpu_speed_limit = 100u32;
    let mut thermal_state = "Normal".to_string();
    let mut is_throttled = false;

    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = Command::new("pmset").args(["-g", "therm"]).output() {
            let out_str = String::from_utf8_lossy(&output.stdout);
            if out_str.contains("CPU_Speed_Limit") {
                if let Some(pos) = out_str.find("CPU_Speed_Limit") {
                    let rest = &out_str[pos + 15..];
                    let digits: String = rest.chars().filter(|c| c.is_ascii_digit()).take(3).collect();
                    if let Ok(lim) = digits.parse::<u32>() {
                        cpu_speed_limit = lim;
                        if lim < 100 {
                            is_throttled = true;
                            thermal_state = "Throttled / Fair".to_string();
                        }
                    }
                }
            }
        }
    }

    let cpu_brand = sys.cpus().first().map(|c| c.brand().to_string()).unwrap_or_else(|| "Apple Silicon / Intel".to_string());
    let core_count = sys.cpus().len();
    let cpu_usage = sys.global_cpu_usage();

    let thermal = ThermalIntelligence {
        thermal_state,
        cpu_speed_limit,
        is_throttled,
        cpu_brand,
        cpu_usage: (cpu_usage * 10.0).round() / 10.0,
        core_count,
    };

    (thermal, hogs)
}
