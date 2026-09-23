import SwiftUI
import AppKit

public struct EcosystemPlugin: Identifiable, Sendable {
    public let id: String
    public let name: String
    public let description: String
    public let icon: String
    public let isInstalled: Bool
    public let command: String
    public let args: [String]

    public init(
        id: String,
        name: String,
        description: String,
        icon: String,
        isInstalled: Bool,
        command: String,
        args: [String]
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.icon = icon
        self.isInstalled = isInstalled
        self.command = command
        self.args = args
    }
}

public struct PluginsView: View {
    @Bindable var state: AppState

    enum PluginTab: String, CaseIterable, Identifiable {
        case extensions = "Browser & System Extensions"
        case devTools = "Developer Tool Cleaners"
        var id: String { rawValue }
    }

    @State private var currentTab: PluginTab = .extensions
    @State private var extensions: [SystemExtensionItem] = []
    @State private var plugins: [EcosystemPlugin] = []
    @State private var isChecking = false
    @State private var statusMessage: String?
    @State private var itemToRemove: SystemExtensionItem? = nil

    public init(state: AppState) {
        self.state = state
    }

    public var body: some View {
        VStack(spacing: 0) {
            subHeaderBar
            Divider()

            if let status = statusMessage {
                toastBar(status: status)
                Divider()
            }

            mainContent
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .navigationTitle("Plugins")
        .confirmationDialog(
            "Remove \(itemToRemove?.name ?? "Extension")?",
            isPresented: Binding(
                get: { itemToRemove != nil },
                set: { if !$0 { itemToRemove = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Remove Extension", role: .destructive) {
                if let item = itemToRemove {
                    Task { await deleteExtension(item) }
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            if let item = itemToRemove {
                Text("This will remove the extension folder from \(item.hostAppOrType). You may need to restart the application.")
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("BeberesRefreshTriggered"))) { _ in
            Task { await reloadCurrentTab() }
        }
        .task {
            if extensions.isEmpty {
                await detectExtensions()
            }
            if plugins.isEmpty {
                await detectPlugins()
            }
        }
        .onChange(of: currentTab) {
            if currentTab == .extensions && extensions.isEmpty {
                Task { await detectExtensions() }
            } else if currentTab == .devTools && plugins.isEmpty {
                Task { await detectPlugins() }
            }
        }
    }

    // MARK: - Subviews
    private var subHeaderBar: some View {
        HStack(spacing: 12) {
            Picker("Plugin View", selection: $currentTab) {
                Text("Browser & System Extensions (\(extensions.count))").tag(PluginTab.extensions)
                Text("Developer Tool Cleaners (\(plugins.count))").tag(PluginTab.devTools)
            }
            .pickerStyle(.segmented)
            .labelsHidden()
            .frame(width: 380)

            Spacer()

            Button {
                Task { await reloadCurrentTab() }
            } label: {
                Label(isChecking ? "Checking..." : "Refresh", systemImage: "arrow.clockwise")
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
            .disabled(isChecking)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 8)
        .background(Color(nsColor: .controlBackgroundColor).opacity(0.5))
    }

    private func toastBar(status: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle")
                .foregroundStyle(.secondary)
            Text(status)
                .font(.subheadline)
            Spacer()
            Button("Dismiss") { statusMessage = nil }
                .font(.caption)
                .buttonStyle(.borderless)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 8)
        .background(.bar)
    }

    @ViewBuilder
    private var mainContent: some View {
        if currentTab == .extensions {
            extensionsView
        } else {
            devToolsView
        }
    }

    @ViewBuilder
    private var extensionsView: some View {
        if isChecking {
            VStack(spacing: 12) {
                ProgressView()
                    .controlSize(.large)
                Text("Inspecting Chrome, Arc, Brave, Edge extensions and macOS plugins...")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if extensions.isEmpty {
            StatusStateView(
                type: .clean(systemImage: "puzzlepiece"),
                title: "No Extensions Detected",
                subtitle: "No third-party browser extensions or macOS QuickLook/Spotlight plugins found.",
                actionTitle: "Rescan Plugins",
                actionIcon: "arrow.clockwise"
            ) {
                Task { await detectExtensions() }
            }
        } else {
            List {
                ForEach(extensions) { ext in
                    extensionRow(ext: ext)
                }
            }
            .listStyle(.inset)
        }
    }

    private func extensionRow(ext: SystemExtensionItem) -> some View {
        HStack(spacing: 12) {
            Image(systemName: ext.isSystemPlugin ? "puzzlepiece.extension" : "globe")
                .font(.system(size: 15))
                .foregroundStyle(.secondary)
                .frame(width: 24, height: 24)

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 8) {
                    Text(ext.name)
                        .font(.system(size: 13, weight: .semibold))

                    Text(ext.version)
                        .font(.caption2.monospacedDigit())
                        .foregroundStyle(.tertiary)

                    Text(ext.hostAppOrType)
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 1)
                        .background(Color.secondary.opacity(0.12))
                        .clipShape(Capsule())
                }

                if !ext.description.isEmpty {
                    Text(ext.description)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }

            Spacer()

            if !ext.formattedSize.isEmpty {
                Text(ext.formattedSize)
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
            }

            Button {
                NSWorkspace.shared.selectFile(ext.path, inFileViewerRootedAtPath: "")
            } label: {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 11))
            }
            .buttonStyle(.borderless)
            .help("Reveal in Finder")

            Button(role: .destructive) {
                itemToRemove = ext
            } label: {
                Image(systemName: "trash")
                    .font(.system(size: 11))
            }
            .buttonStyle(.borderless)
            .help("Remove Extension")
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private var devToolsView: some View {
        List {
            ForEach(plugins) { plugin in
                devToolRow(plugin: plugin)
            }
        }
        .listStyle(.inset)
    }

    private func devToolRow(plugin: EcosystemPlugin) -> some View {
        HStack(spacing: 12) {
            Image(systemName: plugin.icon)
                .font(.system(size: 15))
                .foregroundStyle(.secondary)
                .frame(width: 24, height: 24)

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 8) {
                    Text(plugin.name)
                        .font(.system(size: 13, weight: .semibold))

                    if plugin.isInstalled {
                        Text("Installed")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    } else {
                        Text("Not Installed")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }

                Text(plugin.description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Button("Run Cleanup") {
                Task { await runPlugin(plugin) }
            }
            .disabled(!plugin.isInstalled)
            .buttonStyle(.bordered)
            .controlSize(.small)
        }
        .padding(.vertical, 4)
    }

    // MARK: - Actions
    private func reloadCurrentTab() async {
        if currentTab == .extensions {
            await detectExtensions()
        } else {
            await detectPlugins()
        }
    }

    private func detectExtensions() async {
        isChecking = true
        extensions = await PluginManagerService.shared.scanExtensionsAndPlugins()
        isChecking = false
    }

    private func deleteExtension(_ item: SystemExtensionItem) async {
        do {
            try await PluginManagerService.shared.removeExtension(path: item.path, preferTrash: state.deleteToTrash)
            extensions.removeAll { $0.id == item.id }
            statusMessage = "Removed \(item.name)"
        } catch {
            statusMessage = "Failed to remove: \(error.localizedDescription)"
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
            statusMessage = "Execution failed: \(error.localizedDescription)"
        }
    }
}
