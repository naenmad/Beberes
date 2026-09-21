import Foundation

public struct StartupManagerService: Sendable {
    public init() {}

    public func scanStartupItems() async -> [StartupItem] {
        await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let fm = FileManager.default
                var items: [StartupItem] = []

                let userAgents = fm.homeDirectoryForCurrentUser
                    .appendingPathComponent("Library/LaunchAgents").path
                let globalAgents = "/Library/LaunchAgents"
                let globalDaemons = "/Library/LaunchDaemons"

                items.append(contentsOf: self.scanFolder(path: userAgents, isUser: true, kind: "User Agent"))
                items.append(contentsOf: self.scanFolder(path: globalAgents, isUser: false, kind: "Global Agent"))
                items.append(contentsOf: self.scanFolder(path: globalDaemons, isUser: false, kind: "Global Daemon"))

                continuation.resume(returning: items)
            }
        }
    }

    private func scanFolder(path: String, isUser: Bool, kind: String) -> [StartupItem] {
        let fm = FileManager.default
        guard fm.fileExists(atPath: path) else { return [] }
        guard let files = try? fm.contentsOfDirectory(atPath: path) else { return [] }

        var results: [StartupItem] = []

        for file in files {
            guard file.hasSuffix(".plist") || file.hasSuffix(".plist.disabled") else { continue }

            let fullPath = (path as NSString).appendingPathComponent(file)
            let isEnabled = !file.hasSuffix(".disabled")

            var label = file
            var program: String? = nil

            if let data = try? Data(contentsOf: URL(fileURLWithPath: fullPath)),
               let plist = try? PropertyListSerialization.propertyList(from: data, options: [], format: nil) as? [String: Any] {
                if let l = plist["Label"] as? String, !l.isEmpty {
                    label = l
                }
                if let prog = plist["Program"] as? String {
                    program = prog
                } else if let args = plist["ProgramArguments"] as? [String], let first = args.first {
                    program = first
                }
            }

            let cleanName = file
                .replacingOccurrences(of: ".disabled", with: "")
                .replacingOccurrences(of: ".plist", with: "")

            let displayName = label != file ? label : cleanName

            results.append(StartupItem(
                name: displayName,
                label: label,
                path: fullPath,
                program: program,
                isUser: isUser,
                isEnabled: isEnabled,
                kindLabel: kind
            ))
        }

        return results.sorted { $0.name.lowercased() < $1.name.lowercased() }
    }

    public func toggleItem(_ item: StartupItem) throws -> StartupItem {
        let fm = FileManager.default
        let currentPath = item.path
        let newPath: String

        if item.isEnabled {
            // Disable: append .disabled
            newPath = currentPath + ".disabled"
            try fm.moveItem(atPath: currentPath, toPath: newPath)
            unloadLaunchctl(path: currentPath)
        } else {
            // Enable: remove .disabled
            if currentPath.hasSuffix(".disabled") {
                newPath = String(currentPath.dropLast(".disabled".count))
                try fm.moveItem(atPath: currentPath, toPath: newPath)
                loadLaunchctl(path: newPath)
            } else {
                newPath = currentPath
            }
        }

        var updated = item
        updated.isEnabled = !item.isEnabled
        return StartupItem(
            name: updated.name,
            label: updated.label,
            path: newPath,
            program: updated.program,
            isUser: updated.isUser,
            isEnabled: !item.isEnabled,
            kindLabel: updated.kindLabel
        )
    }

    public func removeItem(_ item: StartupItem) throws {
        unloadLaunchctl(path: item.path)
        try TrashService.moveToTrash(at: item.path)
    }

    private func unloadLaunchctl(path: String) {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/bin/launchctl")
        task.arguments = ["unload", path]
        try? task.run()
        task.waitUntilExit()
    }

    private func loadLaunchctl(path: String) {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/bin/launchctl")
        task.arguments = ["load", path]
        try? task.run()
        task.waitUntilExit()
    }
}
