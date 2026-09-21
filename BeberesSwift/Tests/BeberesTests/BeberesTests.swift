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

    @Test("Format size utility outputs readable strings")
    func testByteFormatting() {
        let zero: Int64 = 0
        let megabyte: Int64 = 1_048_576
        #expect(!zero.formattedBytes.isEmpty)
        #expect(!megabyte.formattedBytes.isEmpty)
    }
}
