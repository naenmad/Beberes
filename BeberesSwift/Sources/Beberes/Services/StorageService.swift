import Foundation
import Darwin

public struct DiskVolumeInfo: Sendable {
    public let totalBytes: Int64
    public let availableBytes: Int64
    public let purgeableBytes: Int64
    public let usedBytes: Int64
    public let usagePercentage: Double

    public init(
        totalBytes: Int64,
        availableBytes: Int64,
        purgeableBytes: Int64
    ) {
        self.totalBytes = totalBytes
        self.availableBytes = availableBytes
        self.purgeableBytes = purgeableBytes
        self.usedBytes = max(0, totalBytes - availableBytes)
        self.usagePercentage = totalBytes > 0 ? (Double(usedBytes) / Double(totalBytes)) * 100 : 0
    }
}

public struct RAMUsageInfo: Sendable {
    public let totalBytes: Int64
    public let usedBytes: Int64
    public let freeBytes: Int64
    public let inactiveBytes: Int64
    public let usagePercentage: Double

    public init(
        totalBytes: Int64,
        usedBytes: Int64,
        freeBytes: Int64,
        inactiveBytes: Int64
    ) {
        self.totalBytes = totalBytes
        self.usedBytes = usedBytes
        self.freeBytes = freeBytes
        self.inactiveBytes = inactiveBytes
        self.usagePercentage = totalBytes > 0 ? (Double(usedBytes) / Double(totalBytes)) * 100 : 0
    }
}

public struct StorageService: Sendable {
    public static func getDiskInfo() -> DiskVolumeInfo {
        let rootURL = URL(fileURLWithPath: "/")
        if let values = try? rootURL.resourceValues(forKeys: [
            .volumeTotalCapacityKey,
            .volumeAvailableCapacityKey,
            .volumeAvailableCapacityForImportantUsageKey
        ]) {
            let total = Int64(values.volumeTotalCapacity ?? 0)
            let avail = Int64(values.volumeAvailableCapacity ?? 0)
            let purgeable = Int64(values.volumeAvailableCapacityForImportantUsage ?? 0) - avail
            return DiskVolumeInfo(
                totalBytes: total,
                availableBytes: avail,
                purgeableBytes: max(0, purgeable)
            )
        }
        return DiskVolumeInfo(totalBytes: 0, availableBytes: 0, purgeableBytes: 0)
    }

    public static func getRAMInfo() -> RAMUsageInfo {
        var size: UInt64 = 0
        var sizeLen = MemoryLayout<UInt64>.size
        sysctlbyname("hw.memsize", &size, &sizeLen, nil, 0)
        let totalRAM = Int64(size)

        var vmStats = vm_statistics64()
        var count = mach_msg_type_number_t(MemoryLayout<vm_statistics64_data_t>.size / MemoryLayout<integer_t>.size)

        let kerr = withUnsafeMutablePointer(to: &vmStats) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
                host_statistics64(mach_host_self(), HOST_VM_INFO64, $0, &count)
            }
        }

        if kerr == KERN_SUCCESS {
            let pageSize = Int64(getpagesize())
            let active = Int64(vmStats.active_count) * pageSize
            let inactive = Int64(vmStats.inactive_count) * pageSize
            let wired = Int64(vmStats.wire_count) * pageSize
            let compressed = Int64(vmStats.compressor_page_count) * pageSize
            let free = Int64(vmStats.free_count) * pageSize

            let used = active + wired + compressed
            return RAMUsageInfo(
                totalBytes: totalRAM,
                usedBytes: used,
                freeBytes: free,
                inactiveBytes: inactive
            )
        }

        return RAMUsageInfo(totalBytes: totalRAM, usedBytes: 0, freeBytes: 0, inactiveBytes: 0)
    }

    public static func purgeInactiveMemory() async -> Result<Void, Error> {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/bin/purge")

        do {
            try task.run()
            task.waitUntilExit()
            if task.terminationStatus == 0 {
                return .success(())
            } else {
                return .failure(NSError(domain: "BeberesMemory", code: Int(task.terminationStatus), userInfo: [
                    NSLocalizedDescriptionKey: "purge exited with status \(task.terminationStatus)"
                ]))
            }
        } catch {
            return .failure(error)
        }
    }
}
