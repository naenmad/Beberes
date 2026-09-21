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
}

