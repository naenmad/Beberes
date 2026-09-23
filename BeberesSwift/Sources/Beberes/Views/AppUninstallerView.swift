import SwiftUI
import AppKit

public struct AppUninstallerView: View {
    @Bindable var appState: AppState
    @State private var appToUninstall: AppItem? = nil
    @State private var showConfirmDialog = false

    public init(appState: AppState) {
        self.appState = appState
    }

    public var body: some View {
        VStack(spacing: 0) {

            // Main Split View
            HSplitView {
                // Apps List
                VStack(spacing: 0) {
                    if appState.isLoadingApps {
                        VStack(spacing: 12) {
                            ProgressView()
                                .controlSize(.large)
                            Text("Scanning applications...")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if appState.filteredApps.isEmpty {
                        if !appState.appSearchText.isEmpty {
                            StatusStateView(
                                type: .searchEmpty(query: appState.appSearchText),
                                title: "No Matching Applications",
                                subtitle: "No installed applications match '\(appState.appSearchText)'.",
                                actionTitle: "Clear Search",
                                actionIcon: "xmark.circle"
                            ) {
                                appState.appSearchText = ""
                            }
                        } else {
                            StatusStateView(
                                type: .clean(systemImage: "app.badge"),
                                title: "No Applications Found",
                                subtitle: "No third-party installed applications detected in /Applications.",
                                actionTitle: "Refresh Applications",
                                actionIcon: "arrow.clockwise"
                            ) {
                                Task { await appState.fetchInstalledApps() }
                            }
                        }
                    } else {
                        List(appState.filteredApps, selection: $appState.selectedApp) { app in
                            HStack(spacing: 12) {
                                AppBundleIconView(path: app.path)
                                    .frame(width: 28, height: 28)

                                VStack(alignment: .leading, spacing: 1) {
                                    HStack(spacing: 6) {
                                        Text(app.name)
                                            .font(.system(size: 13, weight: .medium))
                                            .lineLimit(1)

                                        if app.isSystemApp {
                                            Text("System")
                                                .font(.caption2)
                                                .foregroundStyle(.secondary)
                                        }
                                    }

                                    Text(app.formattedTotalSize)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }

                                Spacer()
                            }
                            .tag(app)
                            .padding(.vertical, 2)
                        }
                        .listStyle(.inset)
                    }
                }
                .frame(minWidth: 260, maxWidth: 380)

                // Detail Inspector
                if let selected = appState.selectedApp {
                    AppDetailInspectorView(app: selected) {
                        appToUninstall = selected
                        showConfirmDialog = true
                    }
                } else {
                    StatusStateView(
                        type: .ready(systemImage: "app.badge"),
                        title: "Select an Application",
                        subtitle: "Choose an application from the list to inspect its size and leftover caches."
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
        }
        .navigationTitle("App Uninstaller")
        .searchable(text: $appState.appSearchText, prompt: "Filter installed applications")
        .background(Color(nsColor: .windowBackgroundColor))
        .confirmationDialog(
            "Uninstall \(appToUninstall?.name ?? "App")?",
            isPresented: $showConfirmDialog,
            titleVisibility: .visible
        ) {
            Button("Move to Trash", role: .destructive) {
                if let app = appToUninstall {
                    Task { await appState.uninstallApp(app) }
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            if let app = appToUninstall {
                Text("This will safely move \(app.name) and \(app.leftovers.count) associated support files (\(app.formattedTotalSize)) to the macOS Trash.")
            }
        }
        .task {
            if appState.installedApps.isEmpty && !appState.isLoadingApps {
                await appState.fetchInstalledApps()
            }
        }
    }
}

// MARK: - App Bundle Icon View
struct AppBundleIconView: View {
    let path: String

    var body: some View {
        if let icon = NSWorkspace.shared.icon(forFile: path) as NSImage? {
            Image(nsImage: icon)
                .resizable()
                .scaledToFit()
        } else {
            Image(systemName: "app")
                .resizable()
                .scaledToFit()
                .foregroundStyle(.secondary)
        }
    }
}

// MARK: - Inspector Detail View
struct AppDetailInspectorView: View {
    let app: AppItem
    let onUninstall: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Header card
            HStack(spacing: 16) {
                AppBundleIconView(path: app.path)
                    .frame(width: 54, height: 54)

                VStack(alignment: .leading, spacing: 2) {
                    Text(app.name)
                        .font(.headline)
                    Text("Version \(app.version) • \(app.bundleId)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(app.path)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                        .lineLimit(1)
                }

                Spacer()

                Button(role: .destructive, action: onUninstall) {
                    Label("Uninstall", systemImage: "trash")
                }
                .buttonStyle(.borderedProminent)
                .disabled(app.isSystemApp)
            }
            .padding(18)
            .background(Color(nsColor: .controlBackgroundColor))

            Divider()

            // Leftover list
            List {
                Section("Leftover Files & Caches (\(app.leftovers.count))") {
                    if app.leftovers.isEmpty {
                        Text("No leftover caches detected in ~/Library.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(app.leftovers) { item in
                            HStack {
                                Image(systemName: "doc")
                                    .font(.system(size: 12))
                                    .foregroundStyle(.secondary)

                                VStack(alignment: .leading, spacing: 1) {
                                    Text(item.name)
                                        .font(.system(size: 12, weight: .medium))
                                    Text(item.category)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }

                                Spacer()

                                Text(item.formattedSize)
                                    .font(.caption.monospacedDigit())
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.vertical, 1)
                        }
                    }
                }
            }
            .listStyle(.inset)
        }
    }
}
