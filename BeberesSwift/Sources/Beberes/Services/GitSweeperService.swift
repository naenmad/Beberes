import Foundation

public final class GitSweeperService: Sendable {
    public static let shared = GitSweeperService()

    public init() {}

    public func scanRepositories(searchRoots: [URL]) async -> [GitRepoItem] {
        var repos: [GitRepoItem] = []
        let fileManager = FileManager.default

        for root in searchRoots {
            guard fileManager.fileExists(atPath: root.path) else { continue }

            guard let enumerator = fileManager.enumerator(
                at: root,
                includingPropertiesForKeys: [.isDirectoryKey],
                options: [.skipsHiddenFiles]
            ) else {
                continue
            }

            while let dirURL = enumerator.nextObject() as? URL {
                // Check if directory has .git
                let gitDir = dirURL.appendingPathComponent(".git")
                var isDir: ObjCBool = false
                if fileManager.fileExists(atPath: gitDir.path, isDirectory: &isDir), isDir.boolValue {
                    enumerator.skipDescendants() // Do not look inside subdirectories of a git repo

                    if let repoItem = await inspectRepo(at: dirURL) {
                        repos.append(repoItem)
                    }
                }
            }
        }

        return repos.sorted(by: { $0.mergedBranches.count > $1.mergedBranches.count })
    }

    public func pruneBranches(_ branches: [String], in repoPath: String) async -> (deleted: [String], errors: [String]) {
        var deleted: [String] = []
        var errors: [String] = []

        let protectedBranches: Set<String> = ["main", "master", "develop", "dev"]

        for branch in branches {
            if protectedBranches.contains(branch) {
                errors.append("Branch '\(branch)' is a protected branch and cannot be pruned.")
                continue
            }

            let result = runGit(["-C", repoPath, "branch", "-d", branch])
            if result.exitCode == 0 {
                deleted.append(branch)
            } else {
                errors.append("Could not delete \(branch): \(result.output.trimmingCharacters(in: .whitespacesAndNewlines))")
            }
        }

        return (deleted, errors)
    }

    private func inspectRepo(at repoURL: URL) async -> GitRepoItem? {
        let repoPath = repoURL.path
        let repoName = repoURL.lastPathComponent

        // 1. Active branch
        let activeBranchResult = runGit(["-C", repoPath, "branch", "--show-current"])
        let activeBranch = activeBranchResult.output.trimmingCharacters(in: .whitespacesAndNewlines)

        // 2. Merged branches
        let mergedResult = runGit(["-C", repoPath, "branch", "--merged"])
        var mergedBranches: [String] = []

        let protectedBranches: Set<String> = ["main", "master", "develop", "dev", activeBranch]

        for line in mergedResult.output.components(separatedBy: .newlines) {
            let branch = line.trimmingCharacters(in: .whitespaces)
                .trimmingCharacters(in: CharacterSet(charactersIn: "*+ "))
            if !branch.isEmpty && !protectedBranches.contains(branch) {
                mergedBranches.append(branch)
            }
        }

        // 3. Uncommitted changes
        let statusResult = runGit(["-C", repoPath, "status", "--porcelain"])
        let hasChanges = !statusResult.output.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty

        // 4. Last commit date
        let dateResult = runGit(["-C", repoPath, "log", "-1", "--format=%ct"])
        let timestamp = TimeInterval(dateResult.output.trimmingCharacters(in: .whitespacesAndNewlines)) ?? 0
        let lastCommitDate = Date(timeIntervalSince1970: timestamp)

        // 5. Calculate .git size
        let gitDir = repoURL.appendingPathComponent(".git")
        let gitSize = calculateDirectorySize(gitDir)

        return GitRepoItem(
            name: repoName,
            path: repoPath,
            gitFolderSizeBytes: gitSize,
            activeBranch: activeBranch.isEmpty ? "HEAD" : activeBranch,
            mergedBranches: mergedBranches,
            hasUncommittedChanges: hasChanges,
            lastCommitDate: lastCommitDate
        )
    }

    private func calculateDirectorySize(_ url: URL) -> Int64 {
        let fileManager = FileManager.default
        guard let enumerator = fileManager.enumerator(at: url, includingPropertiesForKeys: [.fileSizeKey]) else {
            return 0
        }
        var total: Int64 = 0
        while let fileURL = enumerator.nextObject() as? URL {
            if let size = try? fileURL.resourceValues(forKeys: [.fileSizeKey]).fileSize {
                total += Int64(size)
            }
        }
        return total
    }

    private func runGit(_ args: [String]) -> (output: String, exitCode: Int32) {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/git")
        process.arguments = args

        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe

        do {
            try process.run()
            process.waitUntilExit()
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            let output = String(data: data, encoding: .utf8) ?? ""
            return (output, process.terminationStatus)
        } catch {
            return ("", -1)
        }
    }
}
