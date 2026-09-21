import Foundation

public struct SafetyGuard: Sendable {
    private static let protectedSystemProcesses: Set<String> = [
        "launchd",
        "kernel_task",
        "WindowServer",
        "loginwindow",
        "Dock",
        "Finder",
        "mDNSResponder",
        "syslogd",
        "configd",
        "coreaudiod",
        "bluetoothd",
        "airportd",
        "diskarbitrationd",
        "securityd",
        "powerd"
    ]

    private static let protectedSystemPaths: [String] = [
        "/System",
        "/bin",
        "/sbin",
        "/usr/bin",
        "/usr/sbin",
        "/usr/lib",
        "/Library/Apple",
        "/private/var/db",
        "/private/etc",
        "/dev"
    ]

    public static func isProtectedProcess(pid: Int32, processName: String) -> Bool {
        if pid <= 1 { return true }
        let cleanName = (processName as NSString).lastPathComponent.lowercased()
        return protectedSystemProcesses.contains(where: { cleanName == $0.lowercased() })
    }

    public static func isProtectedPath(_ path: String) -> Bool {
        let standardPath = (path as NSString).standardizingPath
        for protected in protectedSystemPaths {
            if standardPath == protected || standardPath.hasPrefix(protected + "/") {
                return true
            }
        }
        return false
    }

    public static func isSafeToDelete(path: String) -> Bool {
        if path.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || path == "/" {
            return false
        }
        return !isProtectedPath(path)
    }

    public static func isSafeArtifact(projectPath: String, artifactPath: String) -> Bool {
        let standardProject = URL(fileURLWithPath: projectPath).standardized.path
        let standardArtifact = URL(fileURLWithPath: artifactPath).standardized.path

        // Target must be strictly inside the project
        guard standardArtifact.hasPrefix(standardProject + "/") else {
            return false
        }

        // Never touch .git or root
        let lastComponent = (standardArtifact as NSString).lastPathComponent
        if lastComponent == ".git" || standardArtifact == standardProject {
            return false
        }

        return true
    }
}
