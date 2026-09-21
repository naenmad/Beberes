import Foundation
import AppKit

public struct AppUninstallerService: Sendable {
    public init() {}

    public func scanInstalledApps() async -> [AppItem] {
        await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let apps = self.performScan()
                continuation.resume(returning: apps)
            }
        }
    }

    private func performScan() -> [AppItem] {
        let fm = FileManager.default
        var results: [AppItem] = []
        var scannedPaths = Set<String>()

        let targetDirs = [
            "/Applications",
            fm.homeDirectoryForCurrentUser.appendingPathComponent("Applications").path
        ]

        for dir in targetDirs {
            let url = URL(fileURLWithPath: dir)
            guard let enumerator = fm.enumerator(
                at: url,
                includingPropertiesForKeys: [.isDirectoryKey, .isPackageKey],
                options: [.skipsHiddenFiles, .skipsPackageDescendants]
            ) else { continue }

            for case let fileURL as URL in enumerator {
                guard fileURL.pathExtension == "app" else { continue }
                if scannedPaths.contains(fileURL.path) { continue }
                scannedPaths.insert(fileURL.path)

                guard let bundle = Bundle(url: fileURL) else { continue }

                let bundleId = bundle.bundleIdentifier ?? ""
                let name = (bundle.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String)
                    ?? (bundle.object(forInfoDictionaryKey: "CFBundleName") as? String)
                    ?? fileURL.deletingPathExtension().lastPathComponent

                let version = (bundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String)
                    ?? (bundle.object(forInfoDictionaryKey: "CFBundleVersion") as? String)
                    ?? "1.0"

                let isSystem = fileURL.path.hasPrefix("/System") ||
                    (bundleId.hasPrefix("com.apple.") && !fileURL.path.hasPrefix("/Applications/Xcode"))

                let appSize = fastDirectorySize(at: fileURL)
                let leftovers = findLeftovers(bundleId: bundleId, appName: name)

                results.append(AppItem(
                    name: name,
                    bundleId: bundleId,
                    version: version,
                    path: fileURL.path,
                    appSizeBytes: appSize,
                    isSystemApp: isSystem,
                    leftovers: leftovers
                ))
            }
        }

        return results.sorted { $0.totalSizeBytes > $1.totalSizeBytes }
    }

    private func findLeftovers(bundleId: String, appName: String) -> [AppLeftoverItem] {
        guard !bundleId.isEmpty || !appName.isEmpty else { return [] }

        var items: [AppLeftoverItem] = []
        var seen = Set<String>()
        let fm = FileManager.default

        let homeLib = fm.homeDirectoryForCurrentUser.appendingPathComponent("Library")

        let searchLocations: [(category: String, subfolder: String, isPlist: Bool, isSavedState: Bool)] = [
            ("Application Support", "Application Support", false, false),
            ("Caches", "Caches", false, false),
            ("Preferences", "Preferences", true, false),
            ("Saved State", "Saved Application State", false, true),
            ("Containers", "Containers", false, false),
            ("Logs", "Logs", false, false)
        ]

        for loc in searchLocations {
            let base = homeLib.appendingPathComponent(loc.subfolder)

            var candidatePaths: [URL] = []
            if loc.isPlist {
                if !bundleId.isEmpty {
                    candidatePaths.append(base.appendingPathComponent("\(bundleId).plist"))
                }
            } else if loc.isSavedState {
                if !bundleId.isEmpty {
                    candidatePaths.append(base.appendingPathComponent("\(bundleId).savedState"))
                }
            } else {
                if !bundleId.isEmpty {
                    candidatePaths.append(base.appendingPathComponent(bundleId))
                }
                if !appName.isEmpty && appName != bundleId {
                    candidatePaths.append(base.appendingPathComponent(appName))
                }
            }

            for cand in candidatePaths {
                let path = cand.path
                if seen.contains(path) { continue }
                if fm.fileExists(atPath: path) {
                    seen.insert(path)
                    let size = fastDirectorySize(at: cand)
                    items.append(AppLeftoverItem(
                        path: path,
                        name: cand.lastPathComponent,
                        category: loc.category,
                        sizeBytes: size
                    ))
                }
            }
        }

        return items
    }

    public func uninstall(app: AppItem) async throws -> Int64 {
        guard !app.isSystemApp else {
            throw NSError(domain: "BeberesAppUninstaller", code: 403, userInfo: [
                NSLocalizedDescriptionKey: "System application cannot be uninstalled."
            ])
        }

        guard SafetyGuard.isSafeToDelete(path: app.path) else {
            throw NSError(domain: "BeberesAppUninstaller", code: 403, userInfo: [
                NSLocalizedDescriptionKey: "Safety guard rejected deletion of \(app.path)"
            ])
        }

        var totalFreed: Int64 = 0

        // 1. Move leftovers to trash
        for leftover in app.leftovers {
            if SafetyGuard.isSafeToDelete(path: leftover.path) {
                if (try? TrashService.moveToTrash(at: leftover.path)) != nil {
                    totalFreed += leftover.sizeBytes
                }
            }
        }

        // 2. Move main app bundle to trash
        try TrashService.moveToTrash(at: app.path)
        totalFreed += app.appSizeBytes

        return totalFreed
    }

    private func fastDirectorySize(at url: URL) -> Int64 {
        let fm = FileManager.default
        var isDir: ObjCBool = false
        guard fm.fileExists(atPath: url.path, isDirectory: &isDir) else { return 0 }

        if !isDir.boolValue {
            let attrs = try? fm.attributesOfItem(atPath: url.path)
            return (attrs?[.size] as? Int64) ?? 0
        }

        guard let enumerator = fm.enumerator(
            at: url,
            includingPropertiesForKeys: [.totalFileAllocatedSizeKey, .fileAllocatedSizeKey, .fileSizeKey],
            options: [.skipsHiddenFiles]
        ) else { return 0 }

        var total: Int64 = 0
        for case let fileURL as URL in enumerator {
            if let vals = try? fileURL.resourceValues(forKeys: [.totalFileAllocatedSizeKey, .fileAllocatedSizeKey, .fileSizeKey]) {
                total += Int64(vals.totalFileAllocatedSize ?? vals.fileAllocatedSize ?? vals.fileSize ?? 0)
            }
        }
        return total
    }
}
