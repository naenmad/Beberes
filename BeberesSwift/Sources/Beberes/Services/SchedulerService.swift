import Foundation

public struct ScheduleConfig: Codable, Sendable {
    public var enabled: Bool
    public var intervalType: String // "daily", "weekly", "monthly"
    public var hour: Int
    public var cleanTrashOlderDays: Int
    public var cleanXcodeDerivedData: Bool
    public var cleanSystemLogs: Bool
    public var notifyOnComplete: Bool

    public init(
        enabled: Bool = false,
        intervalType: String = "weekly",
        hour: Int = 10,
        cleanTrashOlderDays: Int = 30,
        cleanXcodeDerivedData: Bool = true,
        cleanSystemLogs: Bool = true,
        notifyOnComplete: Bool = true
    ) {
        self.enabled = enabled
        self.intervalType = intervalType
        self.hour = hour
        self.cleanTrashOlderDays = cleanTrashOlderDays
        self.cleanXcodeDerivedData = cleanXcodeDerivedData
        self.cleanSystemLogs = cleanSystemLogs
        self.notifyOnComplete = notifyOnComplete
    }
}

public struct ScheduledCleanSummary: Sendable {
    public let success: Bool
    public let totalFreedBytes: Int64
    public let cleanedItemsCount: Int
    public let message: String

    public init(success: Bool, totalFreedBytes: Int64, cleanedItemsCount: Int, message: String) {
        self.success = success
        self.totalFreedBytes = totalFreedBytes
        self.cleanedItemsCount = cleanedItemsCount
        self.message = message
    }
}

public struct SchedulerService: Sendable {
    public static let shared = SchedulerService()

    private var configDirectory: URL {
        let home = FileManager.default.homeDirectoryForCurrentUser
        return home.appendingPathComponent(".config/beberes")
    }

    private var configFileURL: URL {
        configDirectory.appendingPathComponent("schedule.json")
    }

    private var launchAgentPlistURL: URL {
        let home = FileManager.default.homeDirectoryForCurrentUser
        return home.appendingPathComponent("Library/LaunchAgents/com.naenmad.beberes.cleaner.plist")
    }

    public init() {}

    public func loadConfig() -> ScheduleConfig {
        guard FileManager.default.fileExists(atPath: configFileURL.path),
              let data = try? Data(contentsOf: configFileURL),
              let config = try? JSONDecoder().decode(ScheduleConfig.self, from: data) else {
            return ScheduleConfig()
        }
        return config
    }

    public func saveConfig(_ config: ScheduleConfig) throws {
        let fm = FileManager.default
        if !fm.fileExists(atPath: configDirectory.path) {
            try fm.createDirectory(at: configDirectory, withIntermediateDirectories: true)
        }

        let encoder = JSONEncoder()
        encoder.outputFormatting = .prettyPrinted
        let data = try encoder.encode(config)
        try data.write(to: configFileURL)

        try syncLaunchAgent(config: config)
    }

    private func syncLaunchAgent(config: ScheduleConfig) throws {
        let fm = FileManager.default
        let plistURL = launchAgentPlistURL

        if !config.enabled {
            if fm.fileExists(atPath: plistURL.path) {
                let process = Process()
                process.executableURL = URL(fileURLWithPath: "/bin/launchctl")
                process.arguments = ["unload", plistURL.path]
                try? process.run()
                process.waitUntilExit()

                try? fm.removeItem(at: plistURL)
            }
            return
        }

        // Interval seconds: daily = 86400, weekly = 604800, monthly = 2592000
        let intervalSeconds: Int
        switch config.intervalType {
        case "daily": intervalSeconds = 86400
        case "monthly": intervalSeconds = 2592000
        default: intervalSeconds = 604800
        }

        let appPath: String
        let appBundle = URL(fileURLWithPath: "/Applications/Beberes.app/Contents/MacOS/Beberes")
        if fm.fileExists(atPath: appBundle.path) {
            appPath = appBundle.path
        } else {
            appPath = Bundle.main.executablePath ?? "/Applications/Beberes.app/Contents/MacOS/Beberes"
        }

        let launchAgentsDir = plistURL.deletingLastPathComponent()
        if !fm.fileExists(atPath: launchAgentsDir.path) {
            try fm.createDirectory(at: launchAgentsDir, withIntermediateDirectories: true)
        }

        let plistContent = """
        <?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
        <plist version="1.0">
        <dict>
            <key>Label</key>
            <string>com.naenmad.beberes.cleaner</string>
            <key>ProgramArguments</key>
            <array>
                <string>\(appPath)</string>
                <string>--scheduled-clean</string>
            </array>
            <key>StartInterval</key>
            <integer>\(intervalSeconds)</integer>
            <key>RunAtLoad</key>
            <false/>
            <key>StandardErrorPath</key>
            <string>/tmp/beberes_cleaner.err</string>
            <key>StandardOutPath</key>
            <string>/tmp/beberes_cleaner.out</string>
        </dict>
        </plist>
        """

        try plistContent.write(to: plistURL, atomically: true, encoding: .utf8)

        // Unload then load launchctl
        let unloadProc = Process()
        unloadProc.executableURL = URL(fileURLWithPath: "/bin/launchctl")
        unloadProc.arguments = ["unload", plistURL.path]
        try? unloadProc.run()
        unloadProc.waitUntilExit()

        let loadProc = Process()
        loadProc.executableURL = URL(fileURLWithPath: "/bin/launchctl")
        loadProc.arguments = ["load", plistURL.path]
        try? loadProc.run()
        loadProc.waitUntilExit()
    }

    public func triggerScheduledCleanNow() -> ScheduledCleanSummary {
        let config = loadConfig()
        var totalFreed: Int64 = 0
        var cleanedCount: Int = 0
        let fm = FileManager.default
        let home = fm.homeDirectoryForCurrentUser

        // 1. Clean system/app logs
        if config.cleanSystemLogs {
            let logsDir = home.appendingPathComponent("Library/Logs")
            if let entries = try? fm.contentsOfDirectory(at: logsDir, includingPropertiesForKeys: [.fileSizeKey]) {
                for file in entries {
                    var isDir: ObjCBool = false
                    if fm.fileExists(atPath: file.path, isDirectory: &isDir), !isDir.boolValue {
                        if let attrs = try? fm.attributesOfItem(atPath: file.path),
                           let size = attrs[.size] as? Int64 {
                            do {
                                try fm.removeItem(at: file)
                                totalFreed += size
                                cleanedCount += 1
                            } catch {}
                        }
                    }
                }
            }
        }

        // 2. Clean Xcode DerivedData
        if config.cleanXcodeDerivedData {
            let derivedData = home.appendingPathComponent("Library/Developer/Xcode/DerivedData")
            if let entries = try? fm.contentsOfDirectory(at: derivedData, includingPropertiesForKeys: nil) {
                for item in entries {
                    let size = fm.allocatedSize(of: item)
                    do {
                        try fm.removeItem(at: item)
                        totalFreed += size
                        cleanedCount += 1
                    } catch {}
                }
            }
        }

        // 3. Clean old Trash items
        if config.cleanTrashOlderDays > 0 {
            let trashDir = home.appendingPathComponent(".Trash")
            let cutoffDate = Date().addingTimeInterval(-Double(config.cleanTrashOlderDays) * 86400)
            if let entries = try? fm.contentsOfDirectory(at: trashDir, includingPropertiesForKeys: [.contentModificationDateKey]) {
                for item in entries {
                    if let values = try? item.resourceValues(forKeys: [.contentModificationDateKey]),
                       let modDate = values.contentModificationDate,
                       modDate < cutoffDate {
                        let size = fm.allocatedSize(of: item)
                        do {
                            try fm.removeItem(at: item)
                            totalFreed += size
                            cleanedCount += 1
                        } catch {}
                    }
                }
            }
        }

        return ScheduledCleanSummary(
            success: true,
            totalFreedBytes: totalFreed,
            cleanedItemsCount: cleanedCount,
            message: "Scheduled cleanup completed. Freed \(totalFreed.formattedBytes) across \(cleanedCount) items."
        )
    }
}

private extension FileManager {
    func allocatedSize(of url: URL) -> Int64 {
        var isDir: ObjCBool = false
        guard fileExists(atPath: url.path, isDirectory: &isDir) else { return 0 }
        if !isDir.boolValue {
            return (try? attributesOfItem(atPath: url.path)[.size] as? Int64) ?? 0
        }
        guard let enumerator = enumerator(at: url, includingPropertiesForKeys: [.fileSizeKey]) else { return 0 }
        var total: Int64 = 0
        while let item = enumerator.nextObject() as? URL {
            if let size = try? item.resourceValues(forKeys: [.fileSizeKey]).fileSize {
                total += Int64(size)
            }
        }
        return total
    }
}
