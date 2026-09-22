import Foundation

public final class TidyUpService: Sendable {
    public static let shared = TidyUpService()

    public init() {}

    public func scan(sourceDirectory: URL) async -> TidyScanResult {
        let fileManager = FileManager.default
        let installedApps = getInstalledAppNames()

        guard let enumerator = fileManager.enumerator(
            at: sourceDirectory,
            includingPropertiesForKeys: [.isRegularFileKey, .fileSizeKey, .contentModificationDateKey],
            options: [.skipsHiddenFiles, .skipsSubdirectoryDescendants]
        ) else {
            return TidyScanResult(
                sourcePath: sourceDirectory.path,
                items: [],
                totalFiles: 0,
                totalBytes: 0,
                redundantInstallersCount: 0,
                redundantInstallersBytes: 0
            )
        }

        var items: [TidyItem] = []
        var totalBytes: Int64 = 0
        var redundantCount = 0
        var redundantBytes: Int64 = 0

        while let fileURL = enumerator.nextObject() as? URL {
            guard let resourceValues = try? fileURL.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey, .contentModificationDateKey]),
                  resourceValues.isRegularFile == true else {
                continue
            }

            let fileName = fileURL.lastPathComponent
            let size = Int64(resourceValues.fileSize ?? 0)
            let ext = fileURL.pathExtension.lowercased()
            let modDate = resourceValues.contentModificationDate ?? Date()

            let classification = classify(fileName: fileName, ext: ext, installedApps: installedApps)

            let item = TidyItem(
                name: fileName,
                path: fileURL.path,
                sizeBytes: size,
                category: classification.category,
                targetFolder: classification.targetFolder,
                isRedundantInstaller: classification.isRedundant,
                installedAppName: classification.matchedAppName,
                lastModified: modDate
            )

            items.append(item)
            totalBytes += size

            if classification.isRedundant {
                redundantCount += 1
                redundantBytes += size
            }
        }

        return TidyScanResult(
            sourcePath: sourceDirectory.path,
            items: items.sorted(by: { $0.sizeBytes > $1.sizeBytes }),
            totalFiles: items.count,
            totalBytes: totalBytes,
            redundantInstallersCount: redundantCount,
            redundantInstallersBytes: redundantBytes
        )
    }

    public func organizeItems(_ items: [TidyItem], sourceDirectory: URL) async -> (moved: Int, bytes: Int64, errors: [String]) {
        let fileManager = FileManager.default
        var moved = 0
        var totalBytes: Int64 = 0
        var errors: [String] = []

        for item in items {
            let targetDir = sourceDirectory.appendingPathComponent(item.targetFolder, isDirectory: true)
            do {
                if !fileManager.fileExists(atPath: targetDir.path) {
                    try fileManager.createDirectory(at: targetDir, withIntermediateDirectories: true)
                }

                let destinationURL = targetDir.appendingPathComponent(item.name)
                let sourceURL = URL(fileURLWithPath: item.path)

                // If file already exists in target, rename with timestamp
                var finalDest = destinationURL
                if fileManager.fileExists(atPath: destinationURL.path) {
                    let base = (item.name as NSString).deletingPathExtension
                    let ext = (item.name as NSString).pathExtension
                    let newName = "\(base)_\(Int(Date().timeIntervalSince1970)).\(ext)"
                    finalDest = targetDir.appendingPathComponent(newName)
                }

                try fileManager.moveItem(at: sourceURL, to: finalDest)
                moved += 1
                totalBytes += item.sizeBytes
            } catch {
                errors.append("Failed to organize \(item.name): \(error.localizedDescription)")
            }
        }

        return (moved, totalBytes, errors)
    }

    private func getInstalledAppNames() -> Set<String> {
        let fileManager = FileManager.default
        var appNames = Set<String>()
        let appDirs = [
            URL(fileURLWithPath: "/Applications"),
            URL(fileURLWithPath: "/System/Applications"),
            fileManager.homeDirectoryForCurrentUser.appendingPathComponent("Applications")
        ]

        for dir in appDirs {
            guard let contents = try? fileManager.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil) else {
                continue
            }
            for url in contents where url.pathExtension.lowercased() == "app" {
                let name = url.deletingPathExtension().lastPathComponent.lowercased()
                appNames.insert(name)
            }
        }
        return appNames
    }

    private func classify(
        fileName: String,
        ext: String,
        installedApps: Set<String>
    ) -> (category: String, targetFolder: String, isRedundant: Bool, matchedAppName: String?) {
        let nameLower = fileName.lowercased()

        // 1. Screenshots
        if nameLower.hasPrefix("screen shot") ||
           nameLower.hasPrefix("screenshot") ||
           nameLower.hasPrefix("tangkapan layar") ||
           nameLower.hasPrefix("cleanshot") ||
           nameLower.hasPrefix("capture") {
            return ("Screenshots", "Screenshots", false, nil)
        }

        // 2. Installers & Redundant detection
        if ["dmg", "pkg", "iso", "appimage"].contains(ext) {
            let cleanName = fileName
                .lowercased()
                .replacingOccurrences(of: ".dmg", with: "")
                .replacingOccurrences(of: ".pkg", with: "")
                .replacingOccurrences(of: "_", with: " ")
                .replacingOccurrences(of: "-", with: " ")
                .trimmingCharacters(in: .whitespacesAndNewlines)

            let words = cleanName.components(separatedBy: .whitespaces).filter { !$0.isEmpty }

            var matched: String? = nil
            for app in installedApps {
                if cleanName.hasPrefix(app) || app.hasPrefix(cleanName) {
                    matched = "\(app.capitalized).app"
                    break
                }
                if let firstWord = words.first, firstWord.count > 3 && app.hasPrefix(firstWord) {
                    matched = "\(app.capitalized).app"
                    break
                }
            }

            if let matched = matched {
                return ("Redundant Installers", "Installers", true, matched)
            }
            return ("Installers", "Installers", false, nil)
        }

        // 3. Archives
        if ["zip", "tar", "gz", "tgz", "rar", "7z", "bz2"].contains(ext) {
            return ("Archives", "Archives", false, nil)
        }

        // 4. Documents
        if ["pdf", "docx", "doc", "xlsx", "xls", "pptx", "txt", "md", "csv", "rtf"].contains(ext) {
            return ("Documents", "Documents", false, nil)
        }

        // 5. Media
        if ["jpg", "jpeg", "png", "webp", "gif", "heic", "svg", "mp4", "mov", "mkv", "mp3", "wav", "m4a"].contains(ext) {
            return ("Media", "Media", false, nil)
        }

        return ("Other Files", "Organized", false, nil)
    }
}
