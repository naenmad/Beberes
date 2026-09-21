import Foundation

// MARK: - Navigation Target
public enum NavigationSection: String, CaseIterable, Identifiable, Hashable, Sendable {
    case dashboard = "Dashboard"
    case devWorkspace = "Developer Workspace"
    case zombiePorts = "Zombie Ports"
    case systemClean = "System Clean"
    case appUninstaller = "App Uninstaller"
    case settings = "Settings"

    public var id: String { rawValue }

    public var iconName: String {
        switch self {
        case .dashboard: return "gauge.with.needle"
        case .devWorkspace: return "hammer"
        case .zombiePorts: return "network"
        case .systemClean: return "sparkles"
        case .appUninstaller: return "trash"
        case .settings: return "gearshape"
        }
    }
}

// MARK: - Zombie Port Model
public struct ZombiePort: Identifiable, Hashable, Sendable {
    public let id: String
    public let port: Int
    public let pid: Int32
    public let processName: String
    public let protocolType: String
    public let user: String
    public let command: String
    public let isProtected: Bool

    public init(
        port: Int,
        pid: Int32,
        processName: String,
        protocolType: String = "TCP",
        user: String = "",
        command: String = "",
        isProtected: Bool = false
    ) {
        self.id = "\(port)_\(pid)"
        self.port = port
        self.pid = pid
        self.processName = processName
        self.protocolType = protocolType
        self.user = user
        self.command = command
        self.isProtected = isProtected
    }
}

// MARK: - Developer Workspace Models
public struct DormantArtifact: Identifiable, Hashable, Sendable {
    public var id: String { path }
    public let name: String
    public let path: String
    public let sizeBytes: Int64

    public init(name: String, path: String, sizeBytes: Int64) {
        self.name = name
        self.path = path
        self.sizeBytes = sizeBytes
    }

    public var formattedSize: String {
        ByteCountFormatter.string(fromByteCount: sizeBytes, countStyle: .file)
    }
}

public struct DormantProject: Identifiable, Hashable, Sendable {
    public var id: String { path }
    public let name: String
    public let path: String
    public let lastCommitDate: Date
    public let lastCommitSubject: String
    public let inactiveDays: Int
    public let totalReclaimableBytes: Int64
    public let artifacts: [DormantArtifact]

    public init(
        name: String,
        path: String,
        lastCommitDate: Date,
        lastCommitSubject: String,
        inactiveDays: Int,
        totalReclaimableBytes: Int64,
        artifacts: [DormantArtifact]
    ) {
        self.name = name
        self.path = path
        self.lastCommitDate = lastCommitDate
        self.lastCommitSubject = lastCommitSubject
        self.inactiveDays = inactiveDays
        self.totalReclaimableBytes = totalReclaimableBytes
        self.artifacts = artifacts
    }

    public var formattedReclaimable: String {
        ByteCountFormatter.string(fromByteCount: totalReclaimableBytes, countStyle: .file)
    }
}

public struct HibernateResult: Sendable {
    public let success: Bool
    public let projectPath: String
    public let freedBytes: Int64
    public let removedArtifactsCount: Int
    public let message: String

    public init(
        success: Bool,
        projectPath: String,
        freedBytes: Int64,
        removedArtifactsCount: Int,
        message: String
    ) {
        self.success = success
        self.projectPath = projectPath
        self.freedBytes = freedBytes
        self.removedArtifactsCount = removedArtifactsCount
        self.message = message
    }
}

// MARK: - Format Utilities
public extension Int64 {
    var formattedBytes: String {
        ByteCountFormatter.string(fromByteCount: self, countStyle: .file)
    }
}
