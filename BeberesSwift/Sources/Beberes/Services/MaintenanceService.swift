import Foundation

public struct MaintenanceItem: Identifiable, Sendable {
    public let id: String
    public let path: String
    public let name: String
    public let kind: MaintenanceKind
    public let details: String

    public init(
        id: String = UUID().uuidString,
        path: String,
        name: String,
        kind: MaintenanceKind,
        details: String
    ) {
        self.id = id
        self.path = path
        self.name = name
        self.kind = kind
        self.details = details
    }
}

public enum MaintenanceKind: String, Sendable, CaseIterable {
    case emptyFolder = "Empty Folder"
    case brokenSymlink = "Broken Symlink"

    public var iconName: String {
        switch self {
        case .emptyFolder: return "folder.badge.minus"
        case .brokenSymlink: return "link.badge.plus"
        }
    }
}

public struct MaintenanceScanResult: Sendable {
    public let emptyFolders: [MaintenanceItem]
    public let brokenSymlinks: [MaintenanceItem]

    public var totalCount: Int {
        emptyFolders.count + brokenSymlinks.count
    }
}

public struct MaintenanceService: Sendable {
    public static let shared = MaintenanceService()

    public init() {}

    public func scanMaintenanceItems(rootURL: URL? = nil, maxDepth: Int = 4) async -> MaintenanceScanResult {
        await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let res = self.performScan(rootURL: rootURL, maxDepth: maxDepth)
                continuation.resume(returning: res)
            }
        }
    }

    private func performScan(rootURL: URL?, maxDepth: Int) -> MaintenanceScanResult {
        let fm = FileManager.default
        var emptyFolders: [MaintenanceItem] = []
        var brokenSymlinks: [MaintenanceItem] = []

        let searchRoots: [URL]
        if let specificRoot = rootURL {
            searchRoots = [specificRoot]
        } else {
            let home = FileManager.default.homeDirectoryForCurrentUser
            searchRoots = [
                home.appendingPathComponent("Downloads"),
                home.appendingPathComponent("Desktop"),
                home.appendingPathComponent("Documents"),
                home.appendingPathComponent("Developer"),
                home.appendingPathComponent(".Trash")
            ]
        }

        for baseDir in searchRoots {
            guard let enumerator = fm.enumerator(
                at: baseDir,
                includingPropertiesForKeys: [.isDirectoryKey, .isSymbolicLinkKey],
                options: [.skipsHiddenFiles, .skipsPackageDescendants]
            ) else { continue }

            var count = 0
            while let itemURL = enumerator.nextObject() as? URL {
                count += 1
                if count > 2000 { break }

                let path = itemURL.path
                if SafetyGuard.isProtectedPath(path) { continue }

                // Check for broken symlink
                if let dest = try? fm.destinationOfSymbolicLink(atPath: path) {
                    let destURL: URL
                    if dest.hasPrefix("/") {
                        destURL = URL(fileURLWithPath: dest)
                    } else {
                        destURL = itemURL.deletingLastPathComponent().appendingPathComponent(dest)
                    }

                    if !fm.fileExists(atPath: destURL.path) {
                        brokenSymlinks.append(MaintenanceItem(
                            path: path,
                            name: itemURL.lastPathComponent,
                            kind: .brokenSymlink,
                            details: "Points to missing destination: \(dest)"
                        ))
                    }
                    continue
                }

                // Check for empty directory
                var isDir: ObjCBool = false
                if fm.fileExists(atPath: path, isDirectory: &isDir), isDir.boolValue {
                    if isFolderEffectivelyEmpty(at: itemURL, fm: fm) {
                        emptyFolders.append(MaintenanceItem(
                            path: path,
                            name: itemURL.lastPathComponent,
                            kind: .emptyFolder,
                            details: "Empty directory containing zero files"
                        ))
                    }
                }
            }
        }

        return MaintenanceScanResult(emptyFolders: emptyFolders, brokenSymlinks: brokenSymlinks)
    }

    private func isFolderEffectivelyEmpty(at url: URL, fm: FileManager) -> Bool {
        guard let contents = try? fm.contentsOfDirectory(atPath: url.path) else { return false }
        let nonMetadata = contents.filter { $0 != ".DS_Store" && $0 != ".localized" }
        return nonMetadata.isEmpty
    }

    public func cleanItems(_ items: [MaintenanceItem], preferTrash: Bool) async -> Int {
        var count = 0
        let fm = FileManager.default

        for item in items {
            do {
                if item.kind == .brokenSymlink {
                    try fm.removeItem(atPath: item.path)
                    count += 1
                } else {
                    // Empty folder: remove .DS_Store first if present
                    let dsStore = URL(fileURLWithPath: item.path).appendingPathComponent(".DS_Store")
                    if fm.fileExists(atPath: dsStore.path) {
                        try? fm.removeItem(at: dsStore)
                    }
                    try TrashService.shared.remove(at: item.path, preferTrash: preferTrash)
                    count += 1
                }
            } catch {
                print("Failed to clean maintenance item \(item.path): \(error)")
            }
        }
        return count
    }
}
