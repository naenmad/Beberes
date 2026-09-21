import Foundation
import AppKit

public struct TrashManagerService: Sendable {
    public init() {}

    public func scanTrash() async -> [TrashItem] {
        await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let fm = FileManager.default
                let trashURL = fm.homeDirectoryForCurrentUser.appendingPathComponent(".Trash")

                guard fm.fileExists(atPath: trashURL.path) else {
                    continuation.resume(returning: [])
                    return
                }

                guard let files = try? fm.contentsOfDirectory(
                    at: trashURL,
                    includingPropertiesForKeys: [.fileSizeKey, .isDirectoryKey, .contentModificationDateKey],
                    options: []
                ) else {
                    continuation.resume(returning: [])
                    return
                }

                var items: [TrashItem] = []

                for fileURL in files {
                    guard fileURL.lastPathComponent != ".DS_Store" else { continue }

                    let isDir = (try? fileURL.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) ?? false
                    let date = (try? fileURL.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate)
                    let size = self.calculateSize(url: fileURL, isDir: isDir)

                    items.append(TrashItem(
                        name: fileURL.lastPathComponent,
                        path: fileURL.path,
                        sizeBytes: size,
                        isDirectory: isDir,
                        dateDeleted: date
                    ))
                }

                let sorted = items.sorted { $0.sizeBytes > $1.sizeBytes }
                continuation.resume(returning: sorted)
            }
        }
    }

    public func emptyTrash() async throws -> Int64 {
        let items = await scanTrash()
        let fm = FileManager.default
        var totalFreed: Int64 = 0

        for item in items {
            // Must strictly be in ~/.Trash
            let trashPath = fm.homeDirectoryForCurrentUser.appendingPathComponent(".Trash").path
            guard item.path.hasPrefix(trashPath) else { continue }

            do {
                try fm.removeItem(atPath: item.path)
                totalFreed += item.sizeBytes
            } catch {
                // Continue with other items
            }
        }

        return totalFreed
    }

    public func deletePermanently(item: TrashItem) throws {
        let fm = FileManager.default
        let trashPath = fm.homeDirectoryForCurrentUser.appendingPathComponent(".Trash").path
        guard item.path.hasPrefix(trashPath) else {
            throw NSError(domain: "BeberesTrash", code: 403, userInfo: [
                NSLocalizedDescriptionKey: "Item is not in Trash"
            ])
        }
        try fm.removeItem(atPath: item.path)
    }

    public func revealInFinder(path: String) {
        let url = URL(fileURLWithPath: path)
        NSWorkspace.shared.activateFileViewerSelecting([url])
    }

    private func calculateSize(url: URL, isDir: Bool) -> Int64 {
        let fm = FileManager.default
        if !isDir {
            let attrs = try? fm.attributesOfItem(atPath: url.path)
            return (attrs?[.size] as? Int64) ?? 0
        }

        guard let enumerator = fm.enumerator(
            at: url,
            includingPropertiesForKeys: [.totalFileAllocatedSizeKey, .fileAllocatedSizeKey, .fileSizeKey],
            options: []
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
