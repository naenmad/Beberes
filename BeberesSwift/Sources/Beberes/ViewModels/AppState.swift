import SwiftUI
import Observation

@MainActor
@Observable
public final class AppState {
    public var selectedSection: NavigationSection = .dashboard

    // Zombie Ports State
    public var ports: [ZombiePort] = []
    public var isLoadingPorts: Bool = false
    public var portSearchText: String = ""
    public var portActionMessage: String? = nil

    // Developer Workspace State
    public var dormantProjects: [DormantProject] = []
    public var isLoadingProjects: Bool = false
    public var inactivityThresholdDays: Int = 30
    public var hibernatingPath: String? = nil
    public var hibernateToastMessage: String? = nil

    // Dashboard Storage & RAM State
    public var diskInfo: DiskVolumeInfo = DiskVolumeInfo(totalBytes: 0, availableBytes: 0, purgeableBytes: 0)
    public var ramInfo: RAMUsageInfo = RAMUsageInfo(totalBytes: 0, usedBytes: 0, freeBytes: 0, inactiveBytes: 0)

    // System Clean State
    public var cleanCategories: [CleanCategory] = []
    public var selectedCategoryIDs: Set<String> = []
    public var isLoadingSystemClean: Bool = false
    public var systemCleanToastMessage: String? = nil

    // App Uninstaller State
    public var installedApps: [AppItem] = []
    public var selectedApp: AppItem? = nil
    public var isLoadingApps: Bool = false
    public var appSearchText: String = ""
    public var appUninstallToastMessage: String? = nil

    // Startup Items State
    public var startupItems: [StartupItem] = []
    public var isLoadingStartup: Bool = false
    public var startupSearchText: String = ""
    public var startupToastMessage: String? = nil

    // File Shredder State
    public var shredQueue: [String] = []
    public var shredPass: ShredPassOption = .standard
    public var isShredding: Bool = false
    public var shredToastMessage: String? = nil

    // Lifetime Stats
    public var lifetimeFreedBytes: Int64 = 0

    // Core Services
    private let portManager = PortManagerService()
    private let devScanner = DeveloperScannerService()
    private let systemCleaner = SystemCleanerService()
    private let uninstaller = AppUninstallerService()
    private let startupManager = StartupManagerService()
    private let shredder = FileShredderService()

    public init() {
        self.lifetimeFreedBytes = Int64(UserDefaults.standard.integer(forKey: "beberes_lifetime_freed"))
        refreshSystemStats()
    }

    // MARK: - Port Actions
    public func fetchPorts() async {
        isLoadingPorts = true
        defer { isLoadingPorts = false }
        ports = await portManager.listActivePorts()
    }

    public func killPort(_ target: ZombiePort) async {
        let res = await portManager.killPortProcess(pid: target.pid)
        switch res {
        case .success:
            portActionMessage = "Terminated \(target.processName) (PID: \(target.pid)) on port \(target.port)"
            await fetchPorts()
        case .failure(let err):
            portActionMessage = "Failed: \(err.localizedDescription)"
        }
    }

    // MARK: - Dev Workspace Actions
    public func scanDormantProjects() async {
        isLoadingProjects = true
        defer { isLoadingProjects = false }
        dormantProjects = await devScanner.scanDormantProjects(daysThreshold: inactivityThresholdDays)
    }

    public func hibernate(project: DormantProject) async {
        hibernatingPath = project.path
        defer { hibernatingPath = nil }

        do {
            let res = try await devScanner.hibernateProject(project: project)
            recordCleanResult(freedBytes: res.freedBytes)
            hibernateToastMessage = res.message
            await scanDormantProjects()
        } catch {
            hibernateToastMessage = "Hibernate error: \(error.localizedDescription)"
        }
    }

    public func recordCleanResult(freedBytes: Int64) {
        guard freedBytes > 0 else { return }
        lifetimeFreedBytes += freedBytes
        UserDefaults.standard.set(lifetimeFreedBytes, forKey: "beberes_lifetime_freed")
    }

    // MARK: - Storage & System Clean Actions
    public func refreshSystemStats() {
        diskInfo = StorageService.getDiskInfo()
        ramInfo = StorageService.getRAMInfo()
    }

    public func purgeRAM() async {
        let res = await StorageService.purgeInactiveMemory()
        switch res {
        case .success:
            refreshSystemStats()
        case .failure:
            break
        }
    }

    public func scanSystemCategories() async {
        isLoadingSystemClean = true
        defer { isLoadingSystemClean = false }
        cleanCategories = await systemCleaner.scanCategories()
        // By default select all safe categories
        selectedCategoryIDs = Set(cleanCategories.filter { $0.isSafe }.map(\.id))
    }

    public func cleanSelectedCategories() async {
        isLoadingSystemClean = true
        defer { isLoadingSystemClean = false }

        var totalFreed: Int64 = 0
        for cat in cleanCategories where selectedCategoryIDs.contains(cat.id) {
            do {
                let freed = try await systemCleaner.clean(category: cat)
                totalFreed += freed
            } catch {
                // Continue with remaining
            }
        }

        recordCleanResult(freedBytes: totalFreed)
        systemCleanToastMessage = "Clean complete! Freed \(totalFreed.formattedBytes)."
        await scanSystemCategories()
        refreshSystemStats()
    }

    public var filteredPorts: [ZombiePort] {
        if portSearchText.trimmingCharacters(in: .whitespaces).isEmpty {
            return ports
        }
        let q = portSearchText.lowercased()
        return ports.filter {
            String($0.port).contains(q) ||
            $0.processName.lowercased().contains(q) ||
            $0.user.lowercased().contains(q)
        }
    }

    // MARK: - App Uninstaller Actions
    public func fetchInstalledApps() async {
        isLoadingApps = true
        defer { isLoadingApps = false }
        installedApps = await uninstaller.scanInstalledApps()
        if selectedApp == nil, let first = installedApps.first {
            selectedApp = first
        }
    }

    public func uninstallApp(_ app: AppItem) async {
        do {
            let freed = try await uninstaller.uninstall(app: app)
            recordCleanResult(freedBytes: freed)
            appUninstallToastMessage = "Uninstalled \(app.name) and freed \(freed.formattedBytes)"
            if selectedApp?.id == app.id {
                selectedApp = nil
            }
            await fetchInstalledApps()
            refreshSystemStats()
        } catch {
            appUninstallToastMessage = "Uninstall failed: \(error.localizedDescription)"
        }
    }

    public var filteredApps: [AppItem] {
        if appSearchText.trimmingCharacters(in: .whitespaces).isEmpty {
            return installedApps
        }
        let q = appSearchText.lowercased()
        return installedApps.filter {
            $0.name.lowercased().contains(q) ||
            $0.bundleId.lowercased().contains(q)
        }
    }

    // MARK: - Startup Items Actions
    public func fetchStartupItems() async {
        isLoadingStartup = true
        defer { isLoadingStartup = false }
        startupItems = await startupManager.scanStartupItems()
    }

    public func toggleStartupItem(_ item: StartupItem) async {
        do {
            let updated = try startupManager.toggleItem(item)
            if let idx = startupItems.firstIndex(where: { $0.id == item.id }) {
                startupItems[idx] = updated
            }
            startupToastMessage = "\(updated.name) is now \(updated.isEnabled ? "enabled" : "disabled")"
        } catch {
            startupToastMessage = "Toggle failed: \(error.localizedDescription)"
        }
    }

    public func removeStartupItem(_ item: StartupItem) async {
        do {
            try startupManager.removeItem(item)
            startupItems.removeAll { $0.id == item.id }
            startupToastMessage = "Removed \(item.name) from startup items"
        } catch {
            startupToastMessage = "Remove failed: \(error.localizedDescription)"
        }
    }

    public var filteredStartupItems: [StartupItem] {
        if startupSearchText.trimmingCharacters(in: .whitespaces).isEmpty {
            return startupItems
        }
        let q = startupSearchText.lowercased()
        return startupItems.filter {
            $0.name.lowercased().contains(q) ||
            $0.label.lowercased().contains(q)
        }
    }

    // MARK: - File Shredder Actions
    public func addToShredQueue(paths: [String]) {
        for p in paths {
            if !shredQueue.contains(p) {
                shredQueue.append(p)
            }
        }
    }

    public func removeFromShredQueue(path: String) {
        shredQueue.removeAll { $0 == path }
    }

    public func clearShredQueue() {
        shredQueue.removeAll()
    }

    public func executeShred() async {
        guard !shredQueue.isEmpty else { return }
        isShredding = true
        defer { isShredding = false }

        do {
            let summary = try await shredder.shred(paths: shredQueue, passes: shredPass)
            recordCleanResult(freedBytes: summary.bytesFreed)
            shredQueue.removeAll()
            shredToastMessage = "Shredded \(summary.filesShreddedCount) items permanently (\(summary.bytesFreed.formattedBytes) obliterated)."
            refreshSystemStats()
        } catch {
            shredToastMessage = "Shredding error: \(error.localizedDescription)"
        }
    }
}

