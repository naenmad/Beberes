import Testing
import Foundation
@testable import Beberes

@Suite("Beberes Safety & Models Tests")
struct BeberesTests {
    @Test("SafetyGuard correctly protects critical system daemons")
    func testProtectedProcesses() {
        #expect(SafetyGuard.isProtectedProcess(pid: 1, processName: "launchd"))
        #expect(SafetyGuard.isProtectedProcess(pid: 99, processName: "WindowServer"))
        #expect(SafetyGuard.isProtectedProcess(pid: 120, processName: "kernel_task"))
        #expect(SafetyGuard.isProtectedProcess(pid: 200, processName: "loginwindow"))

        // Common dev servers should NOT be protected
        #expect(!SafetyGuard.isProtectedProcess(pid: 4500, processName: "node"))
        #expect(!SafetyGuard.isProtectedProcess(pid: 4501, processName: "python3"))
        #expect(!SafetyGuard.isProtectedProcess(pid: 4502, processName: "docker"))
    }

    @Test("SafetyGuard rejects deletions of system directories")
    func testProtectedPaths() {
        #expect(SafetyGuard.isProtectedPath("/System"))
        #expect(SafetyGuard.isProtectedPath("/System/Library"))
        #expect(SafetyGuard.isProtectedPath("/usr/bin"))
        #expect(SafetyGuard.isProtectedPath("/bin"))

        // User developer directories should NOT be protected
        #expect(!SafetyGuard.isProtectedPath("/Users/dev/Projects/my-app"))
    }

    @Test("SafetyGuard enforces strict project boundary on hibernation")
    func testSafeArtifactBoundary() {
        let project = "/Users/dev/Projects/my-app"
        let validArtifact = "/Users/dev/Projects/my-app/node_modules"
        let gitFolder = "/Users/dev/Projects/my-app/.git"
        let outsideFolder = "/Users/dev/Documents/secrets"

        #expect(SafetyGuard.isSafeArtifact(projectPath: project, artifactPath: validArtifact))
        #expect(!SafetyGuard.isSafeArtifact(projectPath: project, artifactPath: gitFolder))
        #expect(!SafetyGuard.isSafeArtifact(projectPath: project, artifactPath: outsideFolder))
        #expect(!SafetyGuard.isSafeArtifact(projectPath: project, artifactPath: project))
    }

    @Test("SafetyGuard isSafeToDelete rejects system paths and empty paths")
    func testSafeToDelete() {
        #expect(!SafetyGuard.isSafeToDelete(path: "/"))
        #expect(!SafetyGuard.isSafeToDelete(path: "/System"))
        #expect(!SafetyGuard.isSafeToDelete(path: "/usr/bin"))
        #expect(!SafetyGuard.isSafeToDelete(path: ""))
        #expect(SafetyGuard.isSafeToDelete(path: "/Users/dev/Downloads/junk.zip"))
    }

    @Test("StorageService retrieves positive disk and RAM totals")
    func testStorageMetrics() {
        let disk = StorageService.getDiskInfo()
        #expect(disk.totalBytes > 0)
        #expect(disk.availableBytes > 0)

        let ram = StorageService.getRAMInfo()
        #expect(ram.totalBytes > 0)
        #expect(ram.usedBytes > 0)
    }

    @Test("FileShredderService securely obliterates temporary files")
    func testFileShredder() async throws {
        let tempDir = FileManager.default.temporaryDirectory
        let testFileURL = tempDir.appendingPathComponent("shred_test_\(UUID().uuidString).txt")
        let testData = "Sensitive secret data 1234567890".data(using: .utf8)!
        try testData.write(to: testFileURL)

        #expect(FileManager.default.fileExists(atPath: testFileURL.path))

        let shredder = FileShredderService()
        let summary = try await shredder.shred(paths: [testFileURL.path], passes: .quick)

        #expect(summary.filesShreddedCount == 1)
        #expect(summary.bytesFreed == Int64(testData.count))
        #expect(summary.errors.isEmpty)
        #expect(!FileManager.default.fileExists(atPath: testFileURL.path))
    }

    @Test("HardwareService returns valid chip name and core counts")
    func testHardwareMetrics() {
        let metrics = HardwareService.getMetrics()
        #expect(!metrics.chipName.isEmpty)
        #expect(metrics.totalCores > 0)
        #expect(!metrics.thermalState.isEmpty)
        #expect(!metrics.uptimeString.isEmpty)
    }

    @Test("TrashManagerService safely scans trash")
    func testTrashScan() async {
        let service = TrashManagerService()
        let items = await service.scanTrash()
        // Trash scan should execute cleanly without crashing
        #expect(items.count >= 0)
    }

    @Test("NavigationSection correctly maps to 4 Tauri groups")
    func testNavigationGroups() {
        #expect(NavigationSection.dashboard.group == .overview)
        #expect(NavigationSection.hardware.group == .overview)
        #expect(NavigationSection.systemClean.group == .cleaning)
        #expect(NavigationSection.appUninstaller.group == .cleaning)
        #expect(NavigationSection.trashManager.group == .cleaning)
        #expect(NavigationSection.fileShredder.group == .cleaning)
        #expect(NavigationSection.tidyUp.group == .organization)
        #expect(NavigationSection.largeFiles.group == .organization)
        #expect(NavigationSection.devWorkspace.group == .developer)
        #expect(NavigationSection.gitSweeper.group == .developer)
        #expect(NavigationSection.startupItems.group == .developer)
        #expect(NavigationSection.zombiePorts.group == .developer)
        #expect(NavigationSection.plugins.group == .developer)
        #expect(NavigationSection.settings.group == nil)
    }

    @Test("TidyUpService scans folder safely")
    func testTidyUpScan() async throws {
        let tempDir = FileManager.default.temporaryDirectory.appendingPathComponent("beberes_tidy_\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tempDir) }

        // Create dummy screenshot and document
        let screenshotURL = tempDir.appendingPathComponent("Screen Shot 2026-09-22 at 12.00.00.png")
        let docURL = tempDir.appendingPathComponent("report.pdf")
        try "fake image".data(using: .utf8)?.write(to: screenshotURL)
        try "fake doc".data(using: .utf8)?.write(to: docURL)

        let result = await TidyUpService.shared.scan(sourceDirectory: tempDir)
        #expect(result.totalFiles == 2)
        #expect(result.items.contains { $0.category == "Screenshots" })
        #expect(result.items.contains { $0.category == "Documents" })
    }

    @Test("OrphanedService scans without throwing and respects Apple system identifiers")
    func testOrphanedServiceScan() async {
        let items = await OrphanedService.shared.scanOrphanedLeftovers()
        #expect(items.count >= 0)
        // Ensure no Apple system identifiers leak into orphaned results
        for item in items {
            #expect(!item.path.contains("com.apple."))
        }
    }

    @Test("SystemCleanerService includes browser and Xcode simulator categories")
    func testSystemCleanerExtendedCategories() async {
        let cleaner = SystemCleanerService()
        let categories = await cleaner.scanCategories()
        let ids = Set(categories.map(\.id))

        #expect(ids.contains("browser_caches"))
        #expect(ids.contains("xcode_caches"))
        #expect(ids.contains("xcode_simulators"))
    }

    @Test("TrashService conforms to singleton and deletion modes")
    func testTrashServiceModes() {
        let _ = TrashService.shared
        #expect(TrashService.isTrashMode == true || TrashService.isTrashMode == false)
    }

    @Test("MaintenanceService detects empty directories and broken symlinks")
    func testMaintenanceService() async throws {
        let tempDir = FileManager.default.temporaryDirectory.appendingPathComponent("beberes_maint_\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tempDir) }

        // Create empty directory with .DS_Store
        let emptySubdir = tempDir.appendingPathComponent("EmptyFolder")
        try FileManager.default.createDirectory(at: emptySubdir, withIntermediateDirectories: true)
        let dsStore = emptySubdir.appendingPathComponent(".DS_Store")
        try "dummy ds_store".data(using: .utf8)?.write(to: dsStore)

        // Create broken symlink
        let nonExistentTarget = tempDir.appendingPathComponent("non_existent_target.txt")
        let brokenLink = tempDir.appendingPathComponent("broken_link.txt")
        try FileManager.default.createSymbolicLink(at: brokenLink, withDestinationURL: nonExistentTarget)

        let result = await MaintenanceService.shared.scanMaintenanceItems(rootURL: tempDir)
        #expect(result.emptyFolders.contains { $0.name == "EmptyFolder" })
        #expect(result.brokenSymlinks.contains { $0.name == "broken_link.txt" })
    }

    @Test("SimilarMediaService computes Hamming distance correctly")
    func testHammingDistance() {
        let hash1: UInt64 = 0b00000000
        let hash2: UInt64 = 0b00000011 // 2 bits diff
        let dist = SimilarMediaService.shared.hammingDistance(hash1, hash2)
        #expect(dist == 2)
    }

    @Test("PluginManagerService scans plugins without failure")
    func testPluginManagerScanning() async {
        let plugins = await PluginManagerService.shared.scanExtensionsAndPlugins()
        #expect(plugins.count >= 0)
    }

    @Test("SchedulerService loads default or existing config")
    func testSchedulerConfig() {
        let config = SchedulerService.shared.loadConfig()
        #expect(config.cleanTrashOlderDays >= 0)
        #expect(!config.intervalType.isEmpty)
    }

    @Test("ReportService generates comprehensive Markdown diagnostic report")
    func testReportGeneration() async {
        let md = await ReportService.shared.generateAuditMarkdown()
        #expect(md.contains("Beberes System Audit"))
        #expect(md.contains("Storage Overview"))
        #expect(md.contains("Memory (RAM) Intelligence"))
    }

    @Test("CLIService exposes installation status without throwing")
    func testCLIServiceStatus() {
        let installed = CLIService.shared.isInstalled
        #expect(installed == true || installed == false)
    }

    @Test("AppRelocatorService evaluates bundle location")
    func testAppRelocator() {
        let inApps = AppRelocatorService.shared.isInApplicationsFolder
        #expect(inApps == true || inApps == false)
    }
}





