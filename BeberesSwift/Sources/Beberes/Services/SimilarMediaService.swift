import Foundation
import CoreGraphics
import ImageIO
import AppKit

public struct SimilarPhotoItem: Identifiable, Sendable {
    public let id: String
    public let path: String
    public let filename: String
    public let sizeBytes: Int64
    public let width: Int
    public let height: Int
    public let isRecommendedKeep: Bool

    public var dimensionsString: String {
        width > 0 && height > 0 ? "\(width) × \(height)" : ""
    }

    public var formattedSize: String {
        sizeBytes.formattedBytes
    }
}

public struct SimilarPhotoGroup: Identifiable, Sendable {
    public let id: String
    public let similarityPercentage: Int
    public let items: [SimilarPhotoItem]
    public let reclaimableBytes: Int64

    public var wastedBytes: Int64 {
        reclaimableBytes
    }

    public var label: String {
        let first = items.first?.filename ?? "Similar Media"
        return "\(first) (\(similarityPercentage)% visual match)"
    }
}

private struct ImageFingerprint: Sendable {
    let path: String
    let size: Int64
    let width: Int
    let height: Int
    let hash: UInt64
}

public struct SimilarMediaService: Sendable {
    public static let shared = SimilarMediaService()

    public init() {}

    public func scanSimilarMedia(targetFolders: [URL]? = nil, maxDistance: Int = 8) async -> [SimilarPhotoGroup] {
        await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let groups = self.performScan(targetFolders: targetFolders, maxDistance: maxDistance)
                continuation.resume(returning: groups)
            }
        }
    }

    private func performScan(targetFolders: [URL]?, maxDistance: Int) -> [SimilarPhotoGroup] {
        let home = FileManager.default.homeDirectoryForCurrentUser
        let folders = targetFolders ?? [
            home.appendingPathComponent("Pictures"),
            home.appendingPathComponent("Downloads"),
            home.appendingPathComponent("Desktop")
        ]

        let validExts: Set<String> = ["png", "jpg", "jpeg", "heic", "webp"]
        let fm = FileManager.default
        var candidateURLs: [URL] = []

        for folder in folders {
            guard let enumerator = fm.enumerator(
                at: folder,
                includingPropertiesForKeys: [.isRegularFileKey, .fileSizeKey],
                options: [.skipsHiddenFiles, .skipsPackageDescendants]
            ) else { continue }

            var count = 0
            while let fileURL = enumerator.nextObject() as? URL {
                if validExts.contains(fileURL.pathExtension.lowercased()) {
                    if let values = try? fileURL.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey]),
                       values.isRegularFile == true,
                       let size = values.fileSize,
                       size > 20_000 && size < 60_000_000 {
                        candidateURLs.append(fileURL)
                        count += 1
                        if count > 150 { break }
                    }
                }
            }
        }

        // Compute fingerprints
        var fingerprints: [ImageFingerprint] = []
        for url in candidateURLs {
            if let (hash, width, height) = computeDHash(url: url) {
                let size = (try? url.resourceValues(forKeys: [.fileSizeKey]))?.fileSize ?? 0
                fingerprints.append(ImageFingerprint(
                    path: url.path,
                    size: Int64(size),
                    width: width,
                    height: height,
                    hash: hash
                ))
            }
        }

        // Group fingerprints using Hamming distance
        var visited = Set<Int>()
        var groups: [SimilarPhotoGroup] = []

        for i in 0..<fingerprints.count {
            if visited.contains(i) { continue }

            var cluster: [Int] = [i]
            var minDistanceInCluster = 64

            for j in (i + 1)..<fingerprints.count {
                if visited.contains(j) { continue }

                let dist = hammingDistance(fingerprints[i].hash, fingerprints[j].hash)
                if dist <= maxDistance {
                    cluster.append(j)
                    minDistanceInCluster = min(minDistanceInCluster, dist)
                }
            }

            if cluster.count > 1 {
                for idx in cluster {
                    visited.insert(idx)
                }

                // Pick best file to keep: highest resolution, then largest size
                let sortedCluster = cluster.sorted { a, b in
                    let resA = fingerprints[a].width * fingerprints[a].height
                    let resB = fingerprints[b].width * fingerprints[b].height
                    if resA != resB { return resA > resB }
                    return fingerprints[a].size > fingerprints[b].size
                }

                let bestIndex = sortedCluster[0]
                var items: [SimilarPhotoItem] = []
                var reclaimable: Int64 = 0

                for idx in sortedCluster {
                    let fp = fingerprints[idx]
                    let isBest = (idx == bestIndex)
                    if !isBest {
                        reclaimable += fp.size
                    }

                    items.append(SimilarPhotoItem(
                        id: fp.path,
                        path: fp.path,
                        filename: URL(fileURLWithPath: fp.path).lastPathComponent,
                        sizeBytes: fp.size,
                        width: fp.width,
                        height: fp.height,
                        isRecommendedKeep: isBest
                    ))
                }

                let similarityPct = max(70, min(100, 100 - (minDistanceInCluster * 100 / 64)))
                groups.append(SimilarPhotoGroup(
                    id: fingerprints[i].path,
                    similarityPercentage: similarityPct,
                    items: items,
                    reclaimableBytes: reclaimable
                ))
            }
        }

        return groups.sorted { $0.reclaimableBytes > $1.reclaimableBytes }
    }

    private func computeDHash(url: URL) -> (hash: UInt64, width: Int, height: Int)? {
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }

        var width = 0
        var height = 0
        if let props = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any] {
            width = props[kCGImagePropertyPixelWidth] as? Int ?? 0
            height = props[kCGImagePropertyPixelHeight] as? Int ?? 0
        }

        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: 9
        ]

        guard let thumb = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
            return nil
        }

        let colorSpace = CGColorSpaceCreateDeviceGray()
        var pixels = [UInt8](repeating: 0, count: 9 * 8)
        guard let context = CGContext(
            data: &pixels,
            width: 9,
            height: 8,
            bitsPerComponent: 8,
            bytesPerRow: 9,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.none.rawValue
        ) else {
            return nil
        }

        context.draw(thumb, in: CGRect(x: 0, y: 0, width: 9, height: 8))

        var hash: UInt64 = 0
        var bit: UInt64 = 0
        for row in 0..<8 {
            for col in 0..<8 {
                let left = pixels[row * 9 + col]
                let right = pixels[row * 9 + col + 1]
                if left > right {
                    hash |= (1 << bit)
                }
                bit += 1
            }
        }

        return (hash, width, height)
    }

    public func hammingDistance(_ a: UInt64, _ b: UInt64) -> Int {
        (a ^ b).nonzeroBitCount
    }

    public func deleteItems(paths: [String], preferTrash: Bool) async -> Int64 {
        var freed: Int64 = 0
        for path in paths {
            do {
                let size = (try? FileManager.default.attributesOfItem(atPath: path)[.size] as? Int64) ?? 0
                try TrashService.shared.remove(at: path, preferTrash: preferTrash)
                freed += size
            } catch {
                print("Failed to delete item \(path): \(error)")
            }
        }
        return freed
    }
}
