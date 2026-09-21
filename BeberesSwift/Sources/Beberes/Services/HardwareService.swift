import Foundation
import IOKit.ps

public struct HardwareService: Sendable {
    public init() {}

    public static func getMetrics() -> HardwareMetrics {
        let chip = getChipName()
        let cores = ProcessInfo.processInfo.activeProcessorCount
        let thermal = getThermalDescription()
        let os = ProcessInfo.processInfo.operatingSystemVersionString
        let uptime = formatUptime(ProcessInfo.processInfo.systemUptime)
        let (battery, charging) = getBatteryInfo()

        return HardwareMetrics(
            chipName: chip,
            totalCores: cores,
            thermalState: thermal,
            osVersion: os,
            uptimeString: uptime,
            batteryLevel: battery,
            isCharging: charging
        )
    }

    private static func getChipName() -> String {
        var size: Int = 0
        sysctlbyname("machdep.cpu.brand_string", nil, &size, nil, 0)
        if size > 0 {
            var data = [CChar](repeating: 0, count: size)
            sysctlbyname("machdep.cpu.brand_string", &data, &size, nil, 0)
            let name = data.withUnsafeBufferPointer { ptr in
                ptr.baseAddress.map { String(cString: $0) } ?? ""
            }.trimmingCharacters(in: .whitespacesAndNewlines)
            if !name.isEmpty {
                return name
            }
        }

        // Fallback for Apple Silicon
        var modelSize: Int = 0
        sysctlbyname("hw.model", nil, &modelSize, nil, 0)
        if modelSize > 0 {
            var modelData = [CChar](repeating: 0, count: modelSize)
            sysctlbyname("hw.model", &modelData, &modelSize, nil, 0)
            let model = modelData.withUnsafeBufferPointer { ptr in
                ptr.baseAddress.map { String(cString: $0) } ?? ""
            }.trimmingCharacters(in: .whitespacesAndNewlines)
            if !model.isEmpty {
                return "Apple Silicon (\(model))"
            }
        }

        return "Apple Silicon Mac"
    }

    private static func getThermalDescription() -> String {
        switch ProcessInfo.processInfo.thermalState {
        case .nominal: return "Nominal (Cool & Quiet)"
        case .fair: return "Fair (Elevated Fans)"
        case .serious: return "Serious (Throttling Active)"
        case .critical: return "Critical (Extreme Heat)"
        @unknown default: return "Normal"
        }
    }

    private static func formatUptime(_ seconds: TimeInterval) -> String {
        let totalSeconds = Int(seconds)
        let days = totalSeconds / 86400
        let hours = (totalSeconds % 86400) / 3600
        let minutes = (totalSeconds % 3600) / 60

        if days > 0 {
            return "\(days)d \(hours)h \(minutes)m"
        } else if hours > 0 {
            return "\(hours)h \(minutes)m"
        } else {
            return "\(minutes)m"
        }
    }

    private static func getBatteryInfo() -> (Int?, Bool?) {
        guard let snapshot = IOPSCopyPowerSourcesInfo()?.takeRetainedValue(),
              let sources = IOPSCopyPowerSourcesList(snapshot)?.takeRetainedValue() as? [CFTypeRef] else {
            return (nil, nil)
        }

        for source in sources {
            if let desc = IOPSGetPowerSourceDescription(snapshot, source)?.takeUnretainedValue() as? [String: Any] {
                let capacity = desc[kIOPSCurrentCapacityKey as String] as? Int
                let isCharging = desc[kIOPSIsChargingKey as String] as? Bool
                if let cap = capacity {
                    return (cap, isCharging)
                }
            }
        }

        return (nil, nil)
    }
}
