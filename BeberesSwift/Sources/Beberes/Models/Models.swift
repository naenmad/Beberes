import Foundation

// MARK: - Navigation Target
public enum NavigationGroup: String, CaseIterable, Identifiable, Sendable {
    case overview = "OVERVIEW"
    case cleaning = "CLEANING"
    case organization = "ORGANIZATION"
    case developer = "DEVELOPER"

    public var id: String { rawValue }
}

public enum NavigationSection: String, CaseIterable, Identifiable, Hashable, Sendable {
    // Overview
    case dashboard = "Dashboard"
    case hardware = "Hardware"

    // Cleaning
    case systemClean = "System Clean"
    case appUninstaller = "App Uninstaller"
    case trashManager = "Trash Manager"
    case fileShredder = "File Shredder"

    // Organization
    case tidyUp = "Tidy Up"
    case largeFiles = "Large & Duplicates"
    case quickReview = "Quick Review"
    case diskVisualizer = "Disk Visualizer"
    case similarPhotos = "Similar Photos"

    // Developer
    case devWorkspace = "Dev Workspace"
    case gitSweeper = "Git Sweeper"
    case startupItems = "Startup Manager"
    case zombiePorts = "Zombie Ports"
    case plugins = "Plugins"

    // Preferences
    case settings = "Settings"

    public var id: String { rawValue }

    public var group: NavigationGroup? {
        switch self {
        case .dashboard, .hardware:
            return .overview
        case .systemClean, .appUninstaller, .trashManager, .fileShredder:
            return .cleaning
        case .tidyUp, .largeFiles, .quickReview, .diskVisualizer, .similarPhotos:
            return .organization
        case .devWorkspace, .gitSweeper, .startupItems, .zombiePorts, .plugins:
            return .developer
        case .settings:
            return nil
        }
    }

    public var iconName: String {
        switch self {
        case .dashboard: return "square.grid.2x2"
        case .hardware: return "waveform.path.ecg"
        case .systemClean: return "sparkles"
        case .appUninstaller: return "app.badge"
        case .trashManager: return "trash"
        case .fileShredder: return "shield.lefthalf.filled"
        case .tidyUp: return "folder.badge.gearshape"
        case .largeFiles: return "square.stack.3d.up"
        case .quickReview: return "eye"
        case .diskVisualizer: return "chart.pie"
        case .similarPhotos: return "photo.stack"
        case .devWorkspace: return "hammer"
        case .gitSweeper: return "arrow.triangle.branch"
        case .startupItems: return "bolt"
        case .zombiePorts: return "network"
        case .plugins: return "puzzlepiece.extension"
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

// MARK: - App Uninstaller Models
public struct AppLeftoverItem: Identifiable, Hashable, Sendable {
    public var id: String { path }
    public let path: String
    public let name: String
    public let category: String
    public let sizeBytes: Int64

    public init(path: String, name: String, category: String, sizeBytes: Int64) {
        self.path = path
        self.name = name
        self.category = category
        self.sizeBytes = sizeBytes
    }

    public var formattedSize: String {
        sizeBytes.formattedBytes
    }
}

public struct AppItem: Identifiable, Hashable, Sendable {
    public var id: String { path }
    public let name: String
    public let bundleId: String
    public let version: String
    public let path: String
    public let appSizeBytes: Int64
    public let isSystemApp: Bool
    public let leftovers: [AppLeftoverItem]

    public init(
        name: String,
        bundleId: String,
        version: String,
        path: String,
        appSizeBytes: Int64,
        isSystemApp: Bool,
        leftovers: [AppLeftoverItem]
    ) {
        self.name = name
        self.bundleId = bundleId
        self.version = version
        self.path = path
        self.appSizeBytes = appSizeBytes
        self.isSystemApp = isSystemApp
        self.leftovers = leftovers
    }

    public var leftoversSizeBytes: Int64 {
        leftovers.reduce(0) { $0 + $1.sizeBytes }
    }

    public var totalSizeBytes: Int64 {
        appSizeBytes + leftoversSizeBytes
    }

    public var formattedTotalSize: String {
        totalSizeBytes.formattedBytes
    }
}

// MARK: - Startup Items Models
public struct StartupItem: Identifiable, Hashable, Sendable {
    public var id: String { path }
    public let name: String
    public let label: String
    public let path: String
    public let program: String?
    public let isUser: Bool
    public var isEnabled: Bool
    public let kindLabel: String

    public init(
        name: String,
        label: String,
        path: String,
        program: String?,
        isUser: Bool,
        isEnabled: Bool,
        kindLabel: String
    ) {
        self.name = name
        self.label = label
        self.path = path
        self.program = program
        self.isUser = isUser
        self.isEnabled = isEnabled
        self.kindLabel = kindLabel
    }
}

// MARK: - File Shredder Models
public enum ShredPassOption: Int, CaseIterable, Identifiable, Sendable {
    case quick = 1
    case standard = 3
    case dod = 7

    public var id: Int { rawValue }

    public var label: String {
        switch self {
        case .quick: return "1 Pass (Quick Zero-Out)"
        case .standard: return "3 Passes (Standard Secure DoD)"
        case .dod: return "7 Passes (Military Grade Random)"
        }
    }
}

public struct ShredSummary: Sendable {
    public let filesShreddedCount: Int
    public let bytesFreed: Int64
    public let errors: [String]

    public init(filesShreddedCount: Int, bytesFreed: Int64, errors: [String] = []) {
        self.filesShreddedCount = filesShreddedCount
        self.bytesFreed = bytesFreed
        self.errors = errors
    }
}

// MARK: - Large & Duplicate Files Models
public enum FileCategory: String, CaseIterable, Identifiable, Sendable {
    case all = "All"
    case videos = "Videos"
    case archives = "Archives"
    case installers = "Installers"
    case images = "Images"
    case audio = "Audio"
    case documents = "Documents"
    case other = "Other"

    public var id: String { rawValue }

    public var icon: String {
        switch self {
        case .all: return "square.grid.2x2"
        case .videos: return "film"
        case .archives: return "archivebox"
        case .installers: return "shippingbox"
        case .images: return "photo"
        case .audio: return "music.note"
        case .documents: return "doc.text"
        case .other: return "doc"
        }
    }
}

public struct LargeFileItem: Identifiable, Hashable, Sendable {
    public var id: String { path }
    public let name: String
    public let path: String
    public let sizeBytes: Int64
    public let extensionName: String
    public let category: FileCategory
    public let lastModified: Date

    public init(
        name: String,
        path: String,
        sizeBytes: Int64,
        extensionName: String,
        category: FileCategory,
        lastModified: Date
    ) {
        self.name = name
        self.path = path
        self.sizeBytes = sizeBytes
        self.extensionName = extensionName
        self.category = category
        self.lastModified = lastModified
    }

    public var formattedSize: String {
        sizeBytes.formattedBytes
    }
}

public struct DuplicateGroup: Identifiable, Hashable, Sendable {
    public let id: String
    public let fileSizeBytes: Int64
    public let items: [LargeFileItem]

    public init(id: String, fileSizeBytes: Int64, items: [LargeFileItem]) {
        self.id = id
        self.fileSizeBytes = fileSizeBytes
        self.items = items
    }

    public var wastedBytes: Int64 {
        max(0, Int64(items.count - 1) * fileSizeBytes)
    }

    public var formattedWastedSize: String {
        wastedBytes.formattedBytes
    }
}

// MARK: - Hardware Intelligence Models
public struct HardwareMetrics: Sendable {
    public let chipName: String
    public let totalCores: Int
    public let thermalState: String
    public let osVersion: String
    public let uptimeString: String
    public let batteryLevel: Int?
    public let isCharging: Bool?

    public init(
        chipName: String,
        totalCores: Int,
        thermalState: String,
        osVersion: String,
        uptimeString: String,
        batteryLevel: Int? = nil,
        isCharging: Bool? = nil
    ) {
        self.chipName = chipName
        self.totalCores = totalCores
        self.thermalState = thermalState
        self.osVersion = osVersion
        self.uptimeString = uptimeString
        self.batteryLevel = batteryLevel
        self.isCharging = isCharging
    }
}

// MARK: - Trash Manager Models
public struct TrashItem: Identifiable, Hashable, Sendable {
    public var id: String { path }
    public let name: String
    public let path: String
    public let sizeBytes: Int64
    public let isDirectory: Bool
    public let dateDeleted: Date?

    public init(
        name: String,
        path: String,
        sizeBytes: Int64,
        isDirectory: Bool,
        dateDeleted: Date?
    ) {
        self.name = name
        self.path = path
        self.sizeBytes = sizeBytes
        self.isDirectory = isDirectory
        self.dateDeleted = dateDeleted
    }

    public var formattedSize: String {
        sizeBytes.formattedBytes
    }
}

// MARK: - Tidy Up Models
public struct TidyItem: Identifiable, Hashable, Sendable {
    public var id: String { path }
    public let name: String
    public let path: String
    public let sizeBytes: Int64
    public let category: String
    public let targetFolder: String
    public let isRedundantInstaller: Bool
    public let installedAppName: String?
    public let lastModified: Date

    public init(
        name: String,
        path: String,
        sizeBytes: Int64,
        category: String,
        targetFolder: String,
        isRedundantInstaller: Bool = false,
        installedAppName: String? = nil,
        lastModified: Date = Date()
    ) {
        self.name = name
        self.path = path
        self.sizeBytes = sizeBytes
        self.category = category
        self.targetFolder = targetFolder
        self.isRedundantInstaller = isRedundantInstaller
        self.installedAppName = installedAppName
        self.lastModified = lastModified
    }

    public var formattedSize: String {
        sizeBytes.formattedBytes
    }
}

public struct TidyScanResult: Sendable {
    public let sourcePath: String
    public let items: [TidyItem]
    public let totalFiles: Int
    public let totalBytes: Int64
    public let redundantInstallersCount: Int
    public let redundantInstallersBytes: Int64

    public init(
        sourcePath: String,
        items: [TidyItem],
        totalFiles: Int,
        totalBytes: Int64,
        redundantInstallersCount: Int,
        redundantInstallersBytes: Int64
    ) {
        self.sourcePath = sourcePath
        self.items = items
        self.totalFiles = totalFiles
        self.totalBytes = totalBytes
        self.redundantInstallersCount = redundantInstallersCount
        self.redundantInstallersBytes = redundantInstallersBytes
    }
}

// MARK: - Git Sweeper Models
public struct GitRepoItem: Identifiable, Hashable, Sendable {
    public var id: String { path }
    public let name: String
    public let path: String
    public let gitFolderSizeBytes: Int64
    public let activeBranch: String
    public let mergedBranches: [String]
    public let hasUncommittedChanges: Bool
    public let lastCommitDate: Date

    public init(
        name: String,
        path: String,
        gitFolderSizeBytes: Int64,
        activeBranch: String,
        mergedBranches: [String],
        hasUncommittedChanges: Bool,
        lastCommitDate: Date
    ) {
        self.name = name
        self.path = path
        self.gitFolderSizeBytes = gitFolderSizeBytes
        self.activeBranch = activeBranch
        self.mergedBranches = mergedBranches
        self.hasUncommittedChanges = hasUncommittedChanges
        self.lastCommitDate = lastCommitDate
    }

    public var formattedGitSize: String {
        gitFolderSizeBytes.formattedBytes
    }
}

// MARK: - Format Utilities
public extension Int64 {
    var formattedBytes: String {
        ByteCountFormatter.string(fromByteCount: self, countStyle: .file)
    }
}


