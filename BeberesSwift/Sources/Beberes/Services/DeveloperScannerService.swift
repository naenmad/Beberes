import Foundation

public actor DeveloperScannerService {
    public static let artifactNames: Set<String> = [
        "node_modules",
        "target",
        ".venv",
        "venv",
        "build",
        "dist",
        ".dart_tool",
        ".next",
        ".turbo",
        ".nuxt",
        ".pytest_cache",
        "__pycache__"
    ]

    public init() {}

    public func scanDormantProjects(
        customSearchDirs: [String]? = nil,
        daysThreshold: Int = 30
    ) async -> [DormantProject] {
        let home = FileManager.default.homeDirectoryForCurrentUser
        var candidateRoots: [URL] = []

        if let dirs = customSearchDirs, !dirs.isEmpty {
            for d in dirs {
                let u = URL(fileURLWithPath: d)
                if (try? u.checkResourceIsReachable()) == true {
                    candidateRoots.append(u)
                }
            }
        }

        if candidateRoots.isEmpty {
            let defaults = [
                home.appendingPathComponent("Developer"),
                home.appendingPathComponent("Projects"),
                home.appendingPathComponent("Code"),
                home.appendingPathComponent("Workspace"),
                home.appendingPathComponent("Documents/Developer"),
                home.appendingPathComponent("Documents/Projects")
            ]
            for dir in defaults {
                if (try? dir.checkResourceIsReachable()) == true {
                    candidateRoots.append(dir)
                }
            }
        }

        if candidateRoots.isEmpty {
            candidateRoots.append(home.appendingPathComponent("Developer"))
        }

        var gitRepos: [URL] = []
        let fileManager = FileManager.default

        for root in candidateRoots {
            guard let enumerator = fileManager.enumerator(
                at: root,
                includingPropertiesForKeys: [.isDirectoryKey],
                options: [.skipsPackageDescendants]
            ) else { continue }

            while let fileURL = enumerator.nextObject() as? URL {
                if fileURL.lastPathComponent == ".git" {
                    let repoDir = fileURL.deletingLastPathComponent()
                    gitRepos.append(repoDir)
                    enumerator.skipDescendants()
                } else if Self.artifactNames.contains(fileURL.lastPathComponent) {
                    // Do not recurse inside heavy build folders while searching for .git
                    enumerator.skipDescendants()
                }
            }
        }

        var results: [DormantProject] = []
        let now = Date()

        for repo in gitRepos {
            guard let commitInfo = getLastGitCommit(repoPath: repo.path) else {
                continue
            }

            let elapsedDays = Calendar.current.dateComponents([.day], from: commitInfo.date, to: now).day ?? 0
            if elapsedDays >= daysThreshold {
                var artifacts: [DormantArtifact] = []
                var totalBytes: Int64 = 0

                for artName in Self.artifactNames {
                    let artURL = repo.appendingPathComponent(artName)
                    if (try? artURL.checkResourceIsReachable()) == true {
                        let size = calculateDirectorySize(url: artURL)
                        if size > 0 {
                            totalBytes += size
                            artifacts.append(DormantArtifact(
                                name: artName,
                                path: artURL.path,
                                sizeBytes: size
                            ))
                        }
                    }
                }

                if !artifacts.isEmpty {
                    results.append(DormantProject(
                        name: repo.lastPathComponent,
                        path: repo.path,
                        lastCommitDate: commitInfo.date,
                        lastCommitSubject: commitInfo.subject,
                        inactiveDays: elapsedDays,
                        totalReclaimableBytes: totalBytes,
                        artifacts: artifacts
                    ))
                }
            }
        }

        // Sort by largest reclaimable space descending
        return results.sorted(by: { $0.totalReclaimableBytes > $1.totalReclaimableBytes })
    }

    public func hibernateProject(project: DormantProject) async throws -> HibernateResult {
        var freedBytes: Int64 = 0
        var removedCount = 0

        for art in project.artifacts {
            // Guard boundary
            guard SafetyGuard.isSafeArtifact(projectPath: project.path, artifactPath: art.path) else {
                continue
            }

            if FileManager.default.fileExists(atPath: art.path) {
                try TrashService.remove(at: art.path)
                freedBytes += art.sizeBytes
                removedCount += 1
            }
        }

        return HibernateResult(
            success: true,
            projectPath: project.path,
            freedBytes: freedBytes,
            removedArtifactsCount: removedCount,
            message: "Hibernated \(removedCount) build folders, freed \(freedBytes.formattedBytes)."
        )
    }

    private func getLastGitCommit(repoPath: String) -> (date: Date, subject: String)? {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/bin/git")
        task.arguments = ["-C", repoPath, "log", "-1", "--format=%ct|||%s"]

        let pipe = Pipe()
        task.standardOutput = pipe
        task.standardError = Pipe()

        do {
            try task.run()
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            task.waitUntilExit()

            guard task.terminationStatus == 0,
                  let output = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) else {
                return nil
            }

            let parts = output.components(separatedBy: "|||")
            guard parts.count >= 2,
                  let timestamp = TimeInterval(parts[0]) else {
                return nil
            }

            let date = Date(timeIntervalSince1970: timestamp)
            let subject = parts[1]
            return (date, subject)
        } catch {
            return nil
        }
    }

    private func calculateDirectorySize(url: URL) -> Int64 {
        guard let enumerator = FileManager.default.enumerator(
            at: url,
            includingPropertiesForKeys: [.totalFileAllocatedSizeKey, .fileSizeKey],
            options: [.skipsHiddenFiles]
        ) else { return 0 }

        var total: Int64 = 0
        while let fileURL = enumerator.nextObject() as? URL {
            if let values = try? fileURL.resourceValues(forKeys: [.totalFileAllocatedSizeKey, .fileSizeKey]) {
                total += Int64(values.totalFileAllocatedSize ?? values.fileSize ?? 0)
            }
        }
        return total
    }
}
