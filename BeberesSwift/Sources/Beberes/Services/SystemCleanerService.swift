import Foundation

public struct CleanCategory: Identifiable, Hashable, Sendable {
    public let id: String
    public let title: String
    public let detail: String
    public let iconName: String
    public var sizeBytes: Int64
    public var itemCount: Int
    public var paths: [String]
    public let isSafe: Bool

    public init(
        id: String,
        title: String,
        detail: String,
        iconName: String,
        sizeBytes: Int64 = 0,
        itemCount: Int = 0,
        paths: [String] = [],
        isSafe: Bool = true
    ) {
        self.id = id
        self.title = title
        self.detail = detail
        self.iconName = iconName
        self.sizeBytes = sizeBytes
        self.itemCount = itemCount
        self.paths = paths
        self.isSafe = isSafe
    }

    public var formattedSize: String {
        ByteCountFormatter.string(fromByteCount: sizeBytes, countStyle: .file)
    }
}

public actor SystemCleanerService {
    public init() {}

    public func scanCategories() async -> [CleanCategory] {
        let home = FileManager.default.homeDirectoryForCurrentUser

        var categories: [CleanCategory] = [
            CleanCategory(
                id: "apfs_snapshots",
                title: "APFS Local Snapshots",
                detail: "Time Machine shadow copies holding storage space hostage.",
                iconName: "clock.arrow.circlepath"
            ),
            CleanCategory(
                id: "user_caches",
                title: "User App Caches",
                detail: "Temporary app caches and shader data in ~/Library/Caches.",
                iconName: "externaldrive.badge.timemachine"
            ),
            CleanCategory(
                id: "system_logs",
                title: "System & Diagnostic Logs",
                detail: "Old ASL crash logs and diagnostic dumps in ~/Library/Logs.",
                iconName: "doc.text"
            ),
            CleanCategory(
                id: "browser_caches",
                title: "Browser Web Caches",
                detail: "Safari, Chrome, Arc, Brave, Edge, Firefox, and Opera web caches.",
                iconName: "globe"
            ),
            CleanCategory(
                id: "xcode_caches",
                title: "Xcode Developer Artifacts",
                detail: "DerivedData, old iOS DeviceSupport symbols, and simulator caches.",
                iconName: "hammer.fill"
            ),
            CleanCategory(
                id: "xcode_simulators",
                title: "Unavailable iOS Simulators",
                detail: "Residual runtimes and broken virtual devices via xcrun simctl.",
                iconName: "iphone.badge.play"
            )
        ]

        for i in categories.indices {
            switch categories[i].id {
            case "apfs_snapshots":
                let snapshots = scanAPFSSnapshots()
                categories[i].sizeBytes = snapshots.totalSize
                categories[i].itemCount = snapshots.names.count
                categories[i].paths = snapshots.names

            case "user_caches":
                let cachesURL = home.appendingPathComponent("Library/Caches")
                let (size, count, paths) = scanDirectoryContents(cachesURL, maxItems: 100)
                categories[i].sizeBytes = size
                categories[i].itemCount = count
                categories[i].paths = paths

            case "system_logs":
                let logsURL = home.appendingPathComponent("Library/Logs")
                let (size, count, paths) = scanDirectoryContents(logsURL, maxItems: 100)
                categories[i].sizeBytes = size
                categories[i].itemCount = count
                categories[i].paths = paths

            case "browser_caches":
                let browserCacheDirs = [
                    home.appendingPathComponent("Library/Caches/com.apple.Safari"),
                    home.appendingPathComponent("Library/Containers/com.apple.Safari/Data/Library/Caches"),
                    home.appendingPathComponent("Library/Caches/Google/Chrome"),
                    home.appendingPathComponent("Library/Application Support/Google/Chrome/Default/Service Worker/CacheStorage"),
                    home.appendingPathComponent("Library/Caches/company.thebrowser.Browser"),
                    home.appendingPathComponent("Library/Application Support/Arc/User Data/Default/Service Worker/CacheStorage"),
                    home.appendingPathComponent("Library/Caches/BraveSoftware/Brave-Browser"),
                    home.appendingPathComponent("Library/Application Support/BraveSoftware/Brave-Browser/Default/Service Worker/CacheStorage"),
                    home.appendingPathComponent("Library/Caches/Microsoft Edge"),
                    home.appendingPathComponent("Library/Application Support/Microsoft Edge/Default/Service Worker/CacheStorage"),
                    home.appendingPathComponent("Library/Caches/Firefox"),
                    home.appendingPathComponent("Library/Caches/com.operasoftware.Opera")
                ]
                var total: Int64 = 0
                var allPaths: [String] = []

                for dir in browserCacheDirs {
                    if (try? dir.checkResourceIsReachable()) == true {
                        let (s, _, p) = scanDirectoryContents(dir, maxItems: 30)
                        total += s
                        allPaths.append(contentsOf: p)
                    }
                }
                categories[i].sizeBytes = total
                categories[i].itemCount = allPaths.count
                categories[i].paths = allPaths

            case "xcode_caches":
                let devDirs = [
                    home.appendingPathComponent("Library/Developer/Xcode/DerivedData"),
                    home.appendingPathComponent("Library/Developer/Xcode/iOS DeviceSupport"),
                    home.appendingPathComponent("Library/Developer/Xcode/Archives"),
                    home.appendingPathComponent("Library/Developer/CoreSimulator/Caches")
                ]
                var total: Int64 = 0
                var allPaths: [String] = []

                for dir in devDirs {
                    if (try? dir.checkResourceIsReachable()) == true {
                        let (size, _, paths) = scanDirectoryContents(dir, maxItems: 30)
                        total += size
                        allPaths.append(contentsOf: paths)
                    }
                }
                categories[i].sizeBytes = total
                categories[i].itemCount = allPaths.count
                categories[i].paths = allPaths

            case "xcode_simulators":
                let (count, estBytes) = scanUnavailableSimulators()
                categories[i].sizeBytes = estBytes
                categories[i].itemCount = count
                categories[i].paths = count > 0 ? ["simctl:delete_unavailable"] : []

            default:
                break
            }
        }

        return categories
    }

    public func clean(category: CleanCategory) async throws -> Int64 {
        var freed: Int64 = 0

        if category.id == "apfs_snapshots" {
            for name in category.paths {
                deleteSnapshot(name: name)
            }
            freed = category.sizeBytes
        } else if category.id == "xcode_simulators" {
            purgeUnavailableSimulators()
            freed = category.sizeBytes
        } else {
            for p in category.paths {
                if !SafetyGuard.isProtectedPath(p) {
                    try? TrashService.shared.remove(at: p)
                }
            }
            freed = category.sizeBytes
        }

        return freed
    }

    private func scanUnavailableSimulators() -> (count: Int, estimatedBytes: Int64) {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/bin/xcrun")
        task.arguments = ["simctl", "list", "devices", "-j"]

        let pipe = Pipe()
        task.standardOutput = pipe
        task.standardError = Pipe()

        do {
            try task.run()
            task.waitUntilExit()
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let devices = json["devices"] as? [String: [[String: Any]]] {
                var unavailable = 0
                for (_, list) in devices {
                    for dev in list {
                        if let isAvailable = dev["isAvailable"] as? Bool, !isAvailable {
                            unavailable += 1
                        }
                    }
                }
                let est = Int64(unavailable) * 800_000_000
                return (unavailable, est)
            }
        } catch {}
        return (0, 0)
    }

    private func purgeUnavailableSimulators() {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/bin/xcrun")
        task.arguments = ["simctl", "delete", "unavailable"]
        try? task.run()
        task.waitUntilExit()
    }

    private func scanAPFSSnapshots() -> (totalSize: Int64, names: [String]) {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/bin/tmutil")
        task.arguments = ["listlocalsnapshots", "/"]

        let pipe = Pipe()
        task.standardOutput = pipe
        task.standardError = Pipe()

        do {
            try task.run()
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            task.waitUntilExit()

            guard let output = String(data: data, encoding: .utf8) else {
                return (0, [])
            }

            var snapshotNames: [String] = []
            for line in output.components(separatedBy: .newlines) {
                // e.g. "com.apple.TimeMachine.2026-09-21-123456.local"
                if line.contains("com.apple.TimeMachine") {
                    let name = line.replacingOccurrences(of: "Snapshots for volume group /: ", with: "")
                        .trimmingCharacters(in: .whitespacesAndNewlines)
                    snapshotNames.append(name)
                }
            }

            // Estimate average 1.5 GB per local snapshot if present
            let estSize = Int64(snapshotNames.count) * 1_500_000_000
            return (estSize, snapshotNames)
        } catch {
            return (0, [])
        }
    }

    private func deleteSnapshot(name: String) {
        // e.g. date is "2026-09-21-123456" from name
        let parts = name.components(separatedBy: ".")
        guard let datePart = parts.first(where: { $0.contains("-") && $0.count >= 10 }) else {
            return
        }

        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/bin/tmutil")
        task.arguments = ["deletelocalsnapshots", datePart]
        try? task.run()
        task.waitUntilExit()
    }

    private func scanDirectoryContents(_ url: URL, maxItems: Int) -> (size: Int64, count: Int, paths: [String]) {
        guard let enumerator = FileManager.default.enumerator(
            at: url,
            includingPropertiesForKeys: [.fileSizeKey, .totalFileAllocatedSizeKey],
            options: [.skipsSubdirectoryDescendants]
        ) else { return (0, 0, []) }

        var totalSize: Int64 = 0
        var paths: [String] = []

        while let fileURL = enumerator.nextObject() as? URL {
            let path = fileURL.path
            if SafetyGuard.isProtectedPath(path) { continue }

            paths.append(path)
            if let vals = try? fileURL.resourceValues(forKeys: [.totalFileAllocatedSizeKey, .fileSizeKey]) {
                totalSize += Int64(vals.totalFileAllocatedSize ?? vals.fileSize ?? 0)
            }
        }

        return (totalSize, paths.count, Array(paths.prefix(maxItems)))
    }
}
