import Foundation
import AppKit

public struct AppRelocatorService: Sendable {
    public static let shared = AppRelocatorService()

    public init() {}

    public var isInApplicationsFolder: Bool {
        guard let bundlePath = Bundle.main.bundleURL.path as String? else { return true }

        // If running in development / debug / SPM runner, don't nag
        if bundlePath.contains("/.build/") || bundlePath.contains("/DerivedData/") {
            return true
        }

        let systemApps = "/Applications"
        let userApps = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Applications").path

        if bundlePath.hasPrefix(systemApps) || bundlePath.hasPrefix(userApps) {
            return true
        }

        return false
    }

    public func relocateToApplicationsAndRelaunch() throws {
        let currentBundle = Bundle.main.bundleURL
        let targetBundle = URL(fileURLWithPath: "/Applications").appendingPathComponent(currentBundle.lastPathComponent)

        let fm = FileManager.default

        if fm.fileExists(atPath: targetBundle.path) {
            try fm.removeItem(at: targetBundle)
        }

        try fm.copyItem(at: currentBundle, to: targetBundle)

        // Launch the copied app
        let config = NSWorkspace.OpenConfiguration()
        NSWorkspace.shared.openApplication(at: targetBundle, configuration: config) { _, error in
            if error == nil {
                DispatchQueue.main.async {
                    NSApp.terminate(nil)
                }
            }
        }
    }
}
