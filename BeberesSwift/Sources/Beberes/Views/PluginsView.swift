import SwiftUI

public struct PluginsView: View {
    @Bindable var state: AppState
    @State private var plugins: [EcosystemPlugin] = []
    @State private var isChecking = false
    @State private var statusMessage: String?

    public init(state: AppState) {
        self.state = state
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Header Bar
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Cleanup Plugins")
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                    Text("Modular system scripts for specialized developer package managers and runtime caches.")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button {
                    Task { await detectPlugins() }
                } label: {
                    Label(isChecking ? "Checking..." : "Refresh Status", systemImage: "arrow.clockwise")
                }
                .disabled(isChecking)
                .buttonStyle(.bordered)
            }
            .padding(.horizontal, 24)
            .padding(.top, 18)
            .padding(.bottom, 14)

            Divider()

            if let status = statusMessage {
                HStack(spacing: 8) {
                    Image(systemName: "info.circle")
                        .foregroundStyle(Color.accentColor)
                    Text(status)
                        .font(.system(size: 11))
                    Spacer()
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(Color.accentColor.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                .padding(.horizontal, 24)
                .padding(.top, 10)
            }

            List {
                ForEach(plugins) { plugin in
                    HStack(spacing: 14) {
                        Image(systemName: plugin.icon)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(plugin.isInstalled ? Color(red: 16/255, green: 185/255, blue: 129/255) : Color.secondary)
                            .frame(width: 32, height: 32)
                            .background(Color(nsColor: .controlBackgroundColor))
                            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 6) {
                                Text(plugin.name)
                                    .font(.system(size: 13, weight: .semibold))

                                if plugin.isInstalled {
                                    Text("Installed")
                                        .font(.system(size: 9, weight: .bold))
                                        .padding(.horizontal, 5)
                                        .padding(.vertical, 1.5)
                                        .background(Color(red: 16/255, green: 185/255, blue: 129/255).opacity(0.15))
                                        .foregroundStyle(Color(red: 16/255, green: 185/255, blue: 129/255))
                                        .clipShape(Capsule())
                                } else {
                                    Text("Not Found")
                                        .font(.system(size: 9, weight: .medium))
                                        .padding(.horizontal, 5)
                                        .padding(.vertical, 1.5)
                                        .background(Color.secondary.opacity(0.12))
                                        .foregroundStyle(.secondary)
                                        .clipShape(Capsule())
                                }
                            }

                            Text(plugin.description)
                                .font(.system(size: 11))
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        Button("Execute Cleanup") {
                            Task { await runPlugin(plugin) }
                        }
                        .disabled(!plugin.isInstalled)
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                    }
                    .padding(.vertical, 6)
                }
            }
            .listStyle(.inset)
        }
        .task {
            if plugins.isEmpty {
                await detectPlugins()
            }
        }
    }

    private func detectPlugins() async {
        isChecking = true
        let fileManager = FileManager.default

        let brewExists = fileManager.fileExists(atPath: "/opt/homebrew/bin/brew") || fileManager.fileExists(atPath: "/usr/local/bin/brew")
        let dockerExists = fileManager.fileExists(atPath: "/usr/local/bin/docker") || fileManager.fileExists(atPath: "/opt/homebrew/bin/docker")
        let cargoExists = fileManager.fileExists(atPath: NSHomeDirectory() + "/.cargo/bin/cargo")
        let cocoapodsExists = fileManager.fileExists(atPath: "/usr/local/bin/pod") || fileManager.fileExists(atPath: "/opt/homebrew/bin/pod")

        plugins = [
            EcosystemPlugin(
                id: "brew",
                name: "Homebrew Cache Cleaner",
                description: "Runs 'brew cleanup -s' to purge obsolete downloaded formulae bottles and casks.",
                icon: "mug.fill",
                isInstalled: brewExists,
                command: brewExists ? "/opt/homebrew/bin/brew" : "/usr/local/bin/brew",
                args: ["cleanup", "-s"]
            ),
            EcosystemPlugin(
                id: "cargo",
                name: "Rust Cargo Cache Pruner",
                description: "Purges dangling crate git checkouts and registry index caches in ~/.cargo.",
                icon: "gearshape.2.fill",
                isInstalled: cargoExists,
                command: NSHomeDirectory() + "/.cargo/bin/cargo",
                args: ["cache", "--autoclean"]
            ),
            EcosystemPlugin(
                id: "docker",
                name: "Docker Container & Builder Pruner",
                description: "Executes 'docker builder prune' to reclaim dangling build cache layers.",
                icon: "shippingbox.circle.fill",
                isInstalled: dockerExists,
                command: dockerExists ? "/opt/homebrew/bin/docker" : "/usr/local/bin/docker",
                args: ["builder", "prune", "-f"]
            ),
            EcosystemPlugin(
                id: "cocoapods",
                name: "CocoaPods Cache Cleaner",
                description: "Executes 'pod cache clean --all' to purge cached iOS and macOS pods.",
                icon: "cube.box.fill",
                isInstalled: cocoapodsExists,
                command: cocoapodsExists ? "/opt/homebrew/bin/pod" : "/usr/local/bin/pod",
                args: ["cache", "clean", "--all"]
            )
        ]
        isChecking = false
    }

    private func runPlugin(_ plugin: EcosystemPlugin) async {
        statusMessage = "Executing \(plugin.name)..."
        let process = Process()
        process.executableURL = URL(fileURLWithPath: plugin.command)
        process.arguments = plugin.args

        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe

        do {
            try process.run()
            process.waitUntilExit()
            if process.terminationStatus == 0 {
                statusMessage = "Successfully completed \(plugin.name)."
            } else {
                statusMessage = "\(plugin.name) exited with code \(process.terminationStatus)."
            }
        } catch {
            statusMessage = "Failed to run \(plugin.name): \(error.localizedDescription)"
        }
    }
}

public struct EcosystemPlugin: Identifiable, Sendable {
    public let id: String
    public let name: String
    public let description: String
    public let icon: String
    public let isInstalled: Bool
    public let command: String
    public let args: [String]
}
