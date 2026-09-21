import Foundation
import Darwin

public struct FileShredderService: Sendable {
    public init() {}

    public func shred(paths: [String], passes: ShredPassOption) async throws -> ShredSummary {
        await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let fm = FileManager.default
                var shreddedCount = 0
                var totalBytesFreed: Int64 = 0
                var errors: [String] = []

                for path in paths {
                    guard fm.fileExists(atPath: path) else { continue }
                    guard SafetyGuard.isSafeToDelete(path: path) else {
                        errors.append("Safety Guard prevented shredding protected path: \(path)")
                        continue
                    }

                    var isDir: ObjCBool = false
                    fm.fileExists(atPath: path, isDirectory: &isDir)

                    if isDir.boolValue {
                        let (count, bytes, dirErrors) = self.shredDirectory(at: path, passes: passes.rawValue)
                        shreddedCount += count
                        totalBytesFreed += bytes
                        errors.append(contentsOf: dirErrors)
                    } else {
                        do {
                            let bytes = try self.shredSingleFile(at: path, passes: passes.rawValue)
                            shreddedCount += 1
                            totalBytesFreed += bytes
                        } catch {
                            errors.append("\(path): \(error.localizedDescription)")
                        }
                    }
                }

                continuation.resume(returning: ShredSummary(
                    filesShreddedCount: shreddedCount,
                    bytesFreed: totalBytesFreed,
                    errors: errors
                ))
            }
        }
    }

    private func shredSingleFile(at path: String, passes: Int) throws -> Int64 {
        let fd = open(path, O_RDWR)
        guard fd >= 0 else {
            throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno), userInfo: [
                NSLocalizedDescriptionKey: "Failed to open file for shredding: \(path)"
            ])
        }
        defer { close(fd) }

        var statInfo = stat()
        guard fstat(fd, &statInfo) == 0 else {
            throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno), userInfo: [
                NSLocalizedDescriptionKey: "Failed to stat file: \(path)"
            ])
        }

        let fileLen = statInfo.st_size
        if fileLen > 0 {
            let chunkSize = 64 * 1024
            var buffer = [UInt8](repeating: 0, count: chunkSize)

            for pass in 0..<passes {
                lseek(fd, 0, SEEK_SET)
                var remaining = fileLen

                while remaining > 0 {
                    let toWrite = min(Int(remaining), chunkSize)
                    fillBuffer(&buffer, count: toWrite, pass: pass)

                    let written = write(fd, buffer, toWrite)
                    if written < 0 {
                        throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno), userInfo: [
                            NSLocalizedDescriptionKey: "Write error during shredding pass \(pass + 1)"
                        ])
                    }
                    remaining -= off_t(written)
                }

                // Force disk controller flush
                _ = fcntl(fd, F_FULLFSYNC)
            }

            // Truncate to 0 bytes
            _ = ftruncate(fd, 0)
            _ = fcntl(fd, F_FULLFSYNC)
        }

        // Close fd before rename/unlink
        close(fd)

        // Metadata scrambling: Rename file to randomized UUID before unlinking
        let parentDir = (path as NSString).deletingLastPathComponent
        let scrambledName = "shred_\(UUID().uuidString)"
        let scrambledPath = (parentDir as NSString).appendingPathComponent(scrambledName)

        if rename(path, scrambledPath) == 0 {
            unlink(scrambledPath)
        } else {
            unlink(path)
        }

        return Int64(fileLen)
    }

    private func fillBuffer(_ buffer: inout [UInt8], count: Int, pass: Int) {
        switch pass % 3 {
        case 0:
            // Zero fill
            _ = buffer.withUnsafeMutableBytes { ptr in
                memset(ptr.baseAddress, 0x00, count)
            }
        case 1:
            // One fill
            _ = buffer.withUnsafeMutableBytes { ptr in
                memset(ptr.baseAddress, 0xFF, count)
            }
        default:
            // Cryptographic random fill
            buffer.withUnsafeMutableBytes { ptr in
                if let base = ptr.baseAddress {
                    arc4random_buf(base, count)
                }
            }
        }
    }

    private func shredDirectory(at dirPath: String, passes: Int) -> (Int, Int64, [String]) {
        var count = 0
        var bytes: Int64 = 0
        var errors: [String] = []
        let fm = FileManager.default

        let url = URL(fileURLWithPath: dirPath)
        guard let enumerator = fm.enumerator(
            at: url,
            includingPropertiesForKeys: [.isDirectoryKey],
            options: []
        ) else {
            return (0, 0, ["Unable to access directory: \(dirPath)"])
        }

        var fileURLs: [URL] = []
        var dirURLs: [URL] = []

        for case let fileURL as URL in enumerator {
            let isDir = (try? fileURL.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) ?? false
            if isDir {
                dirURLs.append(fileURL)
            } else {
                fileURLs.append(fileURL)
            }
        }

        // Shred files first
        for file in fileURLs {
            do {
                let fileBytes = try shredSingleFile(at: file.path, passes: passes)
                count += 1
                bytes += fileBytes
            } catch {
                errors.append("\(file.path): \(error.localizedDescription)")
            }
        }

        // Remove directories bottom-up
        for dir in dirURLs.reversed() {
            _ = try? fm.removeItem(at: dir)
        }
        _ = try? fm.removeItem(at: url)

        return (count, bytes, errors)
    }
}
