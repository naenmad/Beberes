import Foundation

public struct SystemExtensionItem: Identifiable, Sendable {
    public let id: String
    public let name: String
    public let version: String
    public let description: String
    public let hostAppOrType: String
    public let path: String
    public let sizeBytes: Int64
    public let isSystemPlugin: Bool

    public init(
        id: String = UUID().uuidString,
        name: String,
        version: String,
        description: String,
        hostAppOrType: String,
        path: String,
        sizeBytes: Int64,
        isSystemPlugin: Bool
    ) {
        self.id = id
        self.name = name
        self.version = version
        self.description = description
        self.hostAppOrType = hostAppOrType
        self.path = path
        self.sizeBytes = sizeBytes
        self.isSystemPlugin = isSystemPlugin
    }

    public var formattedSize: String {
        sizeBytes > 0 ? sizeBytes.formattedBytes : ""
    }
}

public struct PluginManagerService: Sendable {
    public static let shared = PluginManagerService()

    public init() {}

    public func scanExtensionsAndPlugins() async -> [SystemExtensionItem] {
        await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let items = self.performScan()
                continuation.resume(returning: items)
            }
        }
    }

    private func performScan() -> [SystemExtensionItem] {
        let home = FileManager.default.homeDirectoryForCurrentUser
        let appSupport = home.appendingPathComponent("Library/Application Support")

        let browserTargets: [(URL, String)] = [
            (appSupport.appendingPathComponent("Google/Chrome/Default/Extensions"), "Google Chrome"),
            (appSupport.appendingPathComponent("Arc/User Data/Default/Extensions"), "Arc Browser"),
            (appSupport.appendingPathComponent("BraveSoftware/Brave-Browser/Default/Extensions"), "Brave Browser"),
            (appSupport.appendingPathComponent("Microsoft Edge/Default/Extensions"), "Microsoft Edge")
        ]

        var results: [SystemExtensionItem] = []
        let fm = FileManager.default

        // 1. Scan Browser Extensions
        for (targetURL, hostName) in browserTargets {
            guard let extFolders = try? fm.contentsOfDirectory(at: targetURL, includingPropertiesForKeys: nil, options: [.skipsHiddenFiles]) else {
                continue
            }

            for extFolder in extFolders {
                // Inside each extension folder are version folders (e.g. 1.2.3_0)
                guard let versionDirs = try? fm.contentsOfDirectory(at: extFolder, includingPropertiesForKeys: nil, options: [.skipsHiddenFiles]) else {
                    continue
                }

                for vDir in versionDirs {
                    let manifestURL = vDir.appendingPathComponent("manifest.json")
                    if let data = try? Data(contentsOf: manifestURL),
                       let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                        var name = json["name"] as? String ?? extFolder.lastPathComponent
                        let version = json["version"] as? String ?? "1.0"
                        var desc = json["description"] as? String ?? ""

                        // Resolve localized message keys if __MSG_...
                        if name.hasPrefix("__MSG_") {
                            let key = String(name.dropFirst(6).dropLast(2))
                            if let localized = resolveLocaleMessage(versionDir: vDir, key: key) {
                                name = localized
                            }
                        }
                        if desc.hasPrefix("__MSG_") {
                            let key = String(desc.dropFirst(6).dropLast(2))
                            if let localized = resolveLocaleMessage(versionDir: vDir, key: key) {
                                desc = localized
                            }
                        }

                        let size = fastDirectorySize(at: extFolder)
                        results.append(SystemExtensionItem(
                            id: extFolder.path,
                            name: name,
                            version: version,
                            description: desc,
                            hostAppOrType: hostName,
                            path: extFolder.path,
                            sizeBytes: size,
                            isSystemPlugin: false
                        ))
                        break
                    }
                }
            }
        }

        // 2. Scan macOS QuickLook & Spotlight Plugins
        let systemPluginDirs: [(URL, String)] = [
            (URL(fileURLWithPath: "/Library/QuickLook"), "QuickLook Plugin"),
            (home.appendingPathComponent("Library/QuickLook"), "User QuickLook Plugin"),
            (URL(fileURLWithPath: "/Library/Spotlight"), "Spotlight Importer"),
            (home.appendingPathComponent("Library/Spotlight"), "User Spotlight Importer")
        ]

        for (dirURL, typeName) in systemPluginDirs {
            guard let plugins = try? fm.contentsOfDirectory(at: dirURL, includingPropertiesForKeys: nil, options: [.skipsHiddenFiles]) else {
                continue
            }

            for pluginURL in plugins {
                let name = pluginURL.deletingPathExtension().lastPathComponent
                let size = fastDirectorySize(at: pluginURL)
                results.append(SystemExtensionItem(
                    id: pluginURL.path,
                    name: name,
                    version: "macOS Plugin",
                    description: pluginURL.path,
                    hostAppOrType: typeName,
                    path: pluginURL.path,
                    sizeBytes: size,
                    isSystemPlugin: true
                ))
            }
        }

        return results.sorted { $0.hostAppOrType < $1.hostAppOrType }
    }

    private func resolveLocaleMessage(versionDir: URL, key: String) -> String? {
        let locales = ["en", "en_US", "en_GB"]
        for loc in locales {
            let messagesURL = versionDir.appendingPathComponent("_locales/\(loc)/messages.json")
            if let data = try? Data(contentsOf: messagesURL),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let entry = json[key] as? [String: Any],
               let message = entry["message"] as? String {
                return message
            }
        }
        return nil
    }

    private func fastDirectorySize(at url: URL) -> Int64 {
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
            if count > 500 { break }
        }
        return total
    }

    public func removeExtension(path: String, preferTrash: Bool) async throws {
        try TrashService.shared.remove(at: path, preferTrash: preferTrash)
    }
}
