import Foundation
import AppKit
import CryptoKit

public struct LargeFilesService: Sendable {
    public init() {}

    public func scan(minSizeBytes: Int64 = 50 * 1024 * 1024) async -> ([LargeFileItem], [DuplicateGroup]) {
        await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let fm = FileManager.default
                let home = fm.homeDirectoryForCurrentUser

                let targetDirectories: [URL] = [
                    home.appendingPathComponent("Downloads"),
                    home.appendingPathComponent("Documents"),
                    home.appendingPathComponent("Movies"),
                    home.appendingPathComponent("Pictures"),
                    home.appendingPathComponent("Desktop")
                ]

                var largeFiles: [LargeFileItem] = []
                var sizeMap: [Int64: [LargeFileItem]] = [:]

                for folder in targetDirectories {
                    guard fm.fileExists(atPath: folder.path) else { continue }

                    guard let enumerator = fm.enumerator(
                        at: folder,
                        includingPropertiesForKeys: [.fileSizeKey, .contentModificationDateKey, .isRegularFileKey],
                        options: [.skipsHiddenFiles, .skipsPackageDescendants]
                    ) else { continue }

                    for case let fileURL as URL in enumerator {
                        guard let vals = try? fileURL.resourceValues(forKeys: [.fileSizeKey, .contentModificationDateKey, .isRegularFileKey]),
                              let isRegular = vals.isRegularFile, isRegular,
                              let size = vals.fileSize, size > 0 else { continue }

                        let sizeInt64 = Int64(size)
                        let ext = fileURL.pathExtension.lowercased()
                        let category = self.categorize(ext: ext)
                        let date = vals.contentModificationDate ?? Date()

                        let item = LargeFileItem(
                            name: fileURL.lastPathComponent,
                            path: fileURL.path,
                            sizeBytes: sizeInt64,
                            extensionName: ext,
                            category: category,
                            lastModified: date
                        )

                        if sizeInt64 >= minSizeBytes {
                            largeFiles.append(item)
                        }

                        // Track for duplicate detection (only files >= 1MB to avoid wasting time on tiny files)
                        if sizeInt64 >= 1024 * 1024 {
                            sizeMap[sizeInt64, default: []].append(item)
                        }
                    }
                }

                // Find duplicate candidates
                var duplicateGroups: [DuplicateGroup] = []
                for (size, candidates) in sizeMap where candidates.count > 1 {
                    var hashGroups: [String: [LargeFileItem]] = [:]

                    for item in candidates {
                        if let hash = self.quickFileHash(path: item.path, size: size) {
                            hashGroups[hash, default: []].append(item)
                        }
                    }

                    for (hash, items) in hashGroups where items.count > 1 {
                        duplicateGroups.append(DuplicateGroup(
                            id: hash,
                            fileSizeBytes: size,
                            items: items
                        ))
                    }
                }

                let sortedLarge = largeFiles.sorted { $0.sizeBytes > $1.sizeBytes }
                let sortedDuplicates = duplicateGroups.sorted { $0.wastedBytes > $1.wastedBytes }

                continuation.resume(returning: (sortedLarge, sortedDuplicates))
            }
        }
    }

    private func categorize(ext: String) -> FileCategory {
        switch ext {
        case "mp4", "mov", "mkv", "avi", "webm", "m4v", "flv":
            return .videos
        case "zip", "tar", "gz", "bz2", "7z", "rar", "xz":
            return .archives
        case "dmg", "pkg", "iso":
            return .installers
        case "png", "jpg", "jpeg", "webp", "gif", "heic", "heif", "svg", "tiff", "raw":
            return .images
        case "mp3", "wav", "aac", "flac", "m4a", "ogg":
            return .audio
        case "pdf", "docx", "doc", "xlsx", "pptx", "txt", "md", "pages", "numbers", "key":
            return .documents
        default:
            return .other
        }
    }

    private func quickFileHash(path: String, size: Int64) -> String? {
        guard let handle = try? FileHandle(forReadingFrom: URL(fileURLWithPath: path)) else { return nil }
        defer { try? handle.close() }

        var hasher = SHA256()

        // Read first 16KB
        let headerData = (try? handle.read(upToCount: 16384)) ?? Data()
        hasher.update(data: headerData)

        // Read middle 16KB if file is large enough
        if size > 65536 {
            try? handle.seek(toOffset: UInt64(size / 2))
            let midData = (try? handle.read(upToCount: 16384)) ?? Data()
            hasher.update(data: midData)
        }

        // Read last 16KB
        if size > 32768 {
            try? handle.seek(toOffset: UInt64(max(0, size - 16384)))
            let endData = (try? handle.read(upToCount: 16384)) ?? Data()
            hasher.update(data: endData)
        }

        let digest = hasher.finalize()
        return digest.map { String(format: "%02x", $0) }.joined()
    }

    public func trashFile(path: String) throws {
        guard SafetyGuard.isSafeToDelete(path: path) else {
            throw NSError(domain: "BeberesLargeFiles", code: 403, userInfo: [
                NSLocalizedDescriptionKey: "Safety guard rejected deletion of \(path)"
            ])
        }
        try TrashService.remove(at: path)
    }

    public func revealInFinder(path: String) {
        let url = URL(fileURLWithPath: path)
        NSWorkspace.shared.activateFileViewerSelecting([url])
    }
}
