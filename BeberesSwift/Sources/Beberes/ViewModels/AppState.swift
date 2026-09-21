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

    // Lifetime Stats
    public var lifetimeFreedBytes: Int64 = 0

    // Core Services
    private let portManager = PortManagerService()
    private let devScanner = DeveloperScannerService()

    public init() {
        // Load stored lifetime if available
        self.lifetimeFreedBytes = Int64(UserDefaults.standard.integer(forKey: "beberes_lifetime_freed"))
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
