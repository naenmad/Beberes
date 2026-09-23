import Foundation
import AppKit

public struct OrphanedItem: Identifiable, Sendable {
    public let id: String
    public let path: String
    public let name: String
    public let inferredApp: String
    public let kind: String
    public let sizeBytes: Int64
    public let lastModified: String

    public init(
        id: String = UUID().uuidString,
        path: String,
        name: String,
        inferredApp: String,
        kind: String,
        sizeBytes: Int64,
        lastModified: String
    ) {
        self.id = id
        self.path = path
        self.name = name
        self.inferredApp = inferredApp
        self.kind = kind
        self.sizeBytes = sizeBytes
        self.lastModified = lastModified
    }

    public var formattedSize: String {
        sizeBytes.formattedBytes
    }
}

public struct OrphanedService: Sendable {
    public static let shared = OrphanedService()

    public init() {}

    public func scanOrphanedLeftovers() async -> [OrphanedItem] {
        await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let items = self.performScan()
                continuation.resume(returning: items)
            }
        }
    }

    private func performScan() -> [OrphanedItem] {
        let (installedNames, installedBundleIds) = getInstalledAppIdentifiers()
        let home = FileManager.default.homeDirectoryForCurrentUser
        let library = home.appendingPathComponent("Library")

        let scanTargets: [(URL, String)] = [
            (library.appendingPathComponent("Application Support"), "Application Support"),
            (library.appendingPathComponent("Caches"), "Caches"),
            (library.appendingPathComponent("Saved Application State"), "Saved State"),
            (library.appendingPathComponent("Preferences"), "Preferences"),
            (library.appendingPathComponent("Containers"), "Containers")
        ]

        var candidates: [(URL, String, String)] = []
        let fm = FileManager.default

        for (dirURL, kind) in scanTargets {
            guard let contents = try? fm.contentsOfDirectory(at: dirURL, includingPropertiesForKeys: [.contentModificationDateKey, .fileSizeKey], options: [.skipsHiddenFiles]) else {
                continue
            }

            for itemURL in contents {
                let fileName = itemURL.lastPathComponent

                // Skip system and core Apple components
                if isSystemAppleIdentifier(fileName) {
                    continue
                }

                var cleanName = fileName
                if cleanName.hasSuffix(".savedState") {
                    cleanName = String(cleanName.dropLast(11))
                } else if cleanName.hasSuffix(".plist") {
                    cleanName = String(cleanName.dropLast(6))
                }

                let lowerClean = cleanName.lowercased()

                // Check against installed apps
                let matchesInstalled = installedBundleIds.contains(lowerClean) || installedNames.contains { name in
                    lowerClean == name ||
                    lowerClean.hasPrefix("\(name).") ||
                    lowerClean.hasSuffix(".\(name)") ||
                    lowerClean.contains("-\(name)")
                }

                if !matchesInstalled {
                    var inferred = cleanName
                    if cleanName.contains(".") {
                        let parts = cleanName.split(separator: ".")
                        if parts.count >= 2 {
                            inferred = String(parts[1]).capitalized
                        }
                    }

                    candidates.append((itemURL, kind, inferred))
                }
            }
        }

        var results: [OrphanedItem] = []

        for (url, kind, inferredApp) in candidates {
            let size = fastDirectorySize(at: url)
            // Filter out trivial items (< 100 KB) to avoid false positives and noise
            if size < 100_000 {
                continue
            }

            let modDate = (try? url.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate ?? Date()
            let modStr = formatRelativeDate(modDate)

            results.append(OrphanedItem(
                path: url.path,
                name: url.lastPathComponent,
                inferredApp: inferredApp,
                kind: kind,
                sizeBytes: size,
                lastModified: modStr
            ))
        }

        return results.sorted { $0.sizeBytes > $1.sizeBytes }
    }

    private func getInstalledAppIdentifiers() -> (Set<String>, Set<String>) {
        var names = Set<String>()
        var bundleIds = Set<String>()

        let fm = FileManager.default
        let appDirs = [
            URL(fileURLWithPath: "/Applications"),
            URL(fileURLWithPath: "/System/Applications"),
            fm.homeDirectoryForCurrentUser.appendingPathComponent("Applications")
        ]

        for dir in appDirs {
            guard let contents = try? fm.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil, options: [.skipsHiddenFiles]) else {
                continue
            }

            for item in contents where item.pathExtension == "app" {
                let stem = item.deletingPathExtension().lastPathComponent.lowercased()
                names.insert(stem)

                let plistURL = item.appendingPathComponent("Contents/Info.plist")
                if let data = try? Data(contentsOf: plistURL),
                   let dict = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any],
                   let bid = dict["CFBundleIdentifier"] as? String {
                    bundleIds.insert(bid.lowercased())
                }
            }
        }

        return (names, bundleIds)
    }

    private func isSystemAppleIdentifier(_ name: String) -> Bool {
        let n = name.lowercased()
        if n.hasPrefix("com.apple.") || n.hasPrefix("apple") { return true }
        let protected = [
            "clouddocs", "mobilesync", "addressbook", "accounts",
            "callhistorydb", "identityservices", "quick look", "messages",
            "mail", "siri", "safari", "photos", "finder", "dock",
            "system preferences", "system settings", "keychain", "containers",
            "preferences", "caches", "cloudkit", "metadata", "cloud",
            "icloud", "bluetooth", "audio", "driver", "input methods"
        ]
        return protected.contains { n == $0 || n.hasPrefix($0) }
    }

    private func fastDirectorySize(at url: URL) -> Int64 {
        var isDir: ObjCBool = false
        if !FileManager.default.fileExists(atPath: url.path, isDirectory: &isDir) {
            return 0
        }
        if !isDir.boolValue {
            return (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? Int64) ?? 0
        }

        guard let enumerator = FileManager.default.enumerator(
            at: url,
            includingPropertiesForKeys: [.fileSizeKey, .isRegularFileKey],
            options: [.skipsHiddenFiles]
        ) else { return 0 }

        var total: Int64 = 0
        var count = 0
        while let fileURL = enumerator.nextObject() as? URL {
            if let values = try? fileURL.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey]),
               values.isRegularFile == true,
               let size = values.fileSize {
                total += Int64(size)
            }
            count += 1
            if count > 2000 { break }
        }
        return total
    }

    private func formatRelativeDate(_ date: Date) -> String {
        let diff = Date().timeIntervalSince(date)
        let days = Int(diff / 86400)
        if days <= 0 { return "Today" }
        if days == 1 { return "Yesterday" }
        if days < 30 { return "\(days) days ago" }
        if days < 365 { return "\(days / 30) months ago" }
        return "\(days / 365) years ago"
    }

    public func cleanOrphanedItems(_ items: [OrphanedItem], preferTrash: Bool) async -> Int64 {
        var freed: Int64 = 0
        for item in items {
            do {
                try TrashService.shared.remove(at: item.path, preferTrash: preferTrash)
                freed += item.sizeBytes
            } catch {
                print("Failed to remove orphaned item: \(item.path)")
            }
        }
        return freed
    }
}
