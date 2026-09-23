import Foundation

public struct CLIService: Sendable {
    public static let shared = CLIService()

    public init() {}

    public var isInstalled: Bool {
        let paths = [
            "/usr/local/bin/beberes",
            FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".local/bin/beberes").path
        ]
        return paths.contains { FileManager.default.fileExists(atPath: $0) }
    }

    public func installSymlink() -> Result<String, Error> {
        let fm = FileManager.default

        // Source binary path
        let appBinary = URL(fileURLWithPath: "/Applications/Beberes.app/Contents/MacOS/Beberes")
        let sourcePath: String
        if fm.fileExists(atPath: appBinary.path) {
            sourcePath = appBinary.path
        } else if let exe = Bundle.main.executablePath {
            sourcePath = exe
        } else {
            sourcePath = "/Applications/Beberes.app/Contents/MacOS/Beberes"
        }

        // Try ~/.local/bin first (does not require root/sudo!)
        let home = fm.homeDirectoryForCurrentUser
        let localBinDir = home.appendingPathComponent(".local/bin")
        let userSymlink = localBinDir.appendingPathComponent("beberes")

        do {
            if !fm.fileExists(atPath: localBinDir.path) {
                try fm.createDirectory(at: localBinDir, withIntermediateDirectories: true)
            }
            if fm.fileExists(atPath: userSymlink.path) {
                try fm.removeItem(at: userSymlink)
            }
            try fm.createSymbolicLink(atPath: userSymlink.path, withDestinationPath: sourcePath)
            return .success("Installed CLI symlink to \(userSymlink.path)")
        } catch {
            // Fallback attempt to /usr/local/bin
            let usrLocalSymlink = URL(fileURLWithPath: "/usr/local/bin/beberes")
            do {
                if fm.fileExists(atPath: usrLocalSymlink.path) {
                    try fm.removeItem(at: usrLocalSymlink)
                }
                try fm.createSymbolicLink(atPath: usrLocalSymlink.path, withDestinationPath: sourcePath)
                return .success("Installed CLI symlink to \(usrLocalSymlink.path)")
            } catch let usrError {
                return .failure(usrError)
            }
        }
    }

    /// Checks if CommandLine.arguments was run from terminal. Returns true if CLI handled the invocation.
    public static func handleCommandLineIfNeeded() -> Bool {
        let args = CommandLine.arguments
        guard args.count > 1 else { return false }

        let first = args[1]
        // If launched by macOS LaunchServices, first argument starts with -psn_
        if first.hasPrefix("-psn_") || first == "gui" {
            return false
        }

        switch first {
        case "-h", "--help", "help":
            printHelp()
            return true
        case "-v", "--version", "version":
            print("Beberes v2.0.0 (Pure Swift Native)")
            return true
        case "status":
            runStatus()
            return true
        case "doctor":
            runDoctor()
            return true
        case "clean":
            let subArgs = Array(args.dropFirst(2))
            runClean(subArgs)
            return true
        case "prune-trash":
            runPruneTrash()
            return true
        case "--scheduled-clean":
            runScheduledClean()
            return true
        default:
            print("Unknown command: '\(first)'. Run 'beberes --help' for usage.")
            return true
        }
    }

    private static func printHelp() {
        print("""
        \u{001B}[1;36mBeberes CLI\u{001B}[0m - Premium macOS Performance & Storage Optimizer (Pure Swift Native)

        \u{001B}[1mUSAGE:\u{001B}[0m
          beberes <COMMAND> [OPTIONS]

        \u{001B}[1mCOMMANDS:\u{001B}[0m
          \u{001B}[32mstatus\u{001B}[0m          Display real-time storage, memory, and battery intelligence
          \u{001B}[32mclean\u{001B}[0m           Purge caches and temporary files (--system, --trash, --all)
          \u{001B}[32mprune-trash\u{001B}[0m     Purge items in ~/.Trash older than 30 days
          \u{001B}[32mdoctor\u{001B}[0m          Inspect permissions, disk health, and thermal state
          \u{001B}[32mgui\u{001B}[0m             Launch the Beberes Graphical User Interface

        \u{001B}[1mOPTIONS:\u{001B}[0m
          -h, --help      Display this help menu
          -v, --version   Display current Beberes version
        """)
    }

    private static func runStatus() {
        print("\u{001B}[1;36m=== Beberes System Status ===\u{001B}[0m\n")

        let disk = StorageService.getDiskInfo()
        let ram = StorageService.getRAMInfo()
        let metrics = HardwareService.getMetrics()

        print("\u{001B}[1m[Hardware]\u{001B}[0m")
        print("  Processor: \(metrics.chipName) (\(metrics.totalCores) cores)")
        print("  Thermal: \(metrics.thermalState)\n")

        print("\u{001B}[1m[Memory]\u{001B}[0m")
        print("  Used: \(ram.usedBytes.formattedBytes) / \(ram.totalBytes.formattedBytes) (\(String(format: "%.1f", ram.usagePercentage))%)\n")

        print("\u{001B}[1m[Storage]\u{001B}[0m")
        print("  Used: \(disk.usedBytes.formattedBytes) / \(disk.totalBytes.formattedBytes) (\(String(format: "%.1f", disk.usagePercentage))%)")
        print("  Free: \(disk.availableBytes.formattedBytes)\n")
    }

    private static func runDoctor() {
        print("\u{001B}[1;36m=== Beberes System Doctor ===\u{001B}[0m\n")
        let home = FileManager.default.homeDirectoryForCurrentUser
        let trash = home.appendingPathComponent(".Trash")
        let canAccessTrash = FileManager.default.isReadableFile(atPath: trash.path)
        print("  [\(canAccessTrash ? "\u{001B}[32m✓\u{001B}[0m" : "\u{001B}[31m✗\u{001B}[0m")] Trash Access: \(canAccessTrash ? "Granted" : "Restricted")")

        let devDir = home.appendingPathComponent("Developer")
        let devExists = FileManager.default.fileExists(atPath: devDir.path)
        print("  [\(devExists ? "\u{001B}[32m✓\u{001B}[0m" : "\u{001B}[33m-\u{001B}[0m")] Developer Folder: \(devExists ? "Detected" : "None")")

        let metrics = HardwareService.getMetrics()
        print("  [\u{001B}[32m✓\u{001B}[0m] Thermal State: \(metrics.thermalState)")
        print("\n\u{001B}[32mDiagnostic completed.\u{001B}[0m")
    }

    private static func runClean(_ subArgs: [String]) {
        print("\u{001B}[1;36m=== Beberes System Clean ===\u{001B}[0m")
        let sema = DispatchSemaphore(value: 0)
        Task {
            let cleaner = SystemCleanerService()
            let categories = await cleaner.scanCategories()
            var freed: Int64 = 0
            for cat in categories {
                do {
                    let bytes = try await cleaner.clean(category: cat)
                    freed += bytes
                    print("  • Cleaned \(cat.title): \(bytes.formattedBytes)")
                } catch {
                    print("  • Failed \(cat.title): \(error.localizedDescription)")
                }
            }
            print("\n\u{001B}[32mSuccessfully freed \(freed.formattedBytes)!\u{001B}[0m")
            sema.signal()
        }
        sema.wait()
    }

    private static func runPruneTrash() {
        print("Purging Trash items older than 30 days...")
        var config = SchedulerService.shared.loadConfig()
        config.cleanTrashOlderDays = 30
        let summary = SchedulerService.shared.triggerScheduledCleanNow()
        print(summary.message)
    }

    private static func runScheduledClean() {
        let summary = SchedulerService.shared.triggerScheduledCleanNow()
        print(summary.message)
    }
}
