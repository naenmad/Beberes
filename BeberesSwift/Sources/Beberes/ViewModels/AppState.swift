import SwiftUI
import Observation

@MainActor
@Observable
public final class AppState {
    public var selectedSection: NavigationSection = .devWorkspace

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

    // Lifetime Stats
    public var lifetimeFreedBytes: Int64 = 0

    // Core Services
    private let portManager = PortManagerService()
    private let devScanner = DeveloperScannerService()
    private let systemCleaner = SystemCleanerService()

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
}
