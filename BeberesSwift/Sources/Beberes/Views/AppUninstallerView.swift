import SwiftUI
import AppKit

public struct AppUninstallerView: View {
    @Bindable var appState: AppState
    enum AppSubtab: String, CaseIterable, Identifiable {
        case installed = "Installed Apps"
        case orphaned = "Orphaned Leftovers"
        var id: String { rawValue }
    }

    @State private var currentTab: AppSubtab = .installed
    @State private var appToUninstall: AppItem? = nil
    @State private var showConfirmDialog = false
    @State private var showConfirmOrphanedClean = false

    public init(appState: AppState) {
        self.appState = appState
    }

    private var selectedOrphanedBytes: Int64 {
        appState.orphanedItems
            .filter { appState.selectedOrphanedIDs.contains($0.id) }
            .reduce(0) { $0 + $1.sizeBytes }
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Mode Subheader
            HStack(spacing: 12) {
                Picker("View", selection: $currentTab) {
                    Text("Installed Apps (\(appState.installedApps.count))").tag(AppSubtab.installed)
                    Text("Orphaned Leftovers (\(appState.orphanedItems.count))").tag(AppSubtab.orphaned)
                }
                .pickerStyle(.segmented)
                .labelsHidden()
                .frame(width: 300)

                Spacer()

                if currentTab == .orphaned && !appState.orphanedItems.isEmpty {
                    Button(appState.selectedOrphanedIDs.count == appState.orphanedItems.count ? "Deselect All" : "Select All") {
                        if appState.selectedOrphanedIDs.count == appState.orphanedItems.count {
                            appState.selectedOrphanedIDs.removeAll()
                        } else {
                            appState.selectedOrphanedIDs = Set(appState.orphanedItems.map(\.id))
                        }
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)

                    Button("Clean Selected (\(selectedOrphanedBytes.formattedBytes))", role: .destructive) {
                        showConfirmOrphanedClean = true
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
                    .disabled(appState.selectedOrphanedIDs.isEmpty || appState.isLoadingOrphaned)
                }
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 8)
            .background(Color(nsColor: .controlBackgroundColor).opacity(0.5))

            Divider()

            // Toast Message
            if let msg = appState.appUninstallToastMessage ?? appState.orphanedToastMessage {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle")
                        .foregroundStyle(.secondary)
                    Text(msg)
                        .font(.subheadline)
                    Spacer()
                    Button("Dismiss") {
                        appState.appUninstallToastMessage = nil
                        appState.orphanedToastMessage = nil
                    }
                    .font(.caption)
                    .buttonStyle(.borderless)
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 8)
                .background(.bar)
                Divider()
            }

            if currentTab == .installed {
                // Main Split View for Installed Apps
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
            } else {
                // Orphaned Leftovers List
                VStack(spacing: 0) {
                    if appState.isLoadingOrphaned {
                        VStack(spacing: 12) {
                            ProgressView()
                                .controlSize(.large)
                            Text("Analyzing residual support files from uninstalled applications...")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if appState.orphanedItems.isEmpty {
                        StatusStateView(
                            type: .clean(systemImage: "archivebox.badge.checkmark"),
                            title: "Zero Orphaned Leftovers",
                            subtitle: "No residual support folders, caches, or preferences from old uninstalled apps detected.",
                            actionTitle: "Rescan Leftovers",
                            actionIcon: "arrow.clockwise"
                        ) {
                            Task { await appState.fetchOrphanedLeftovers() }
                        }
                    } else {
                        List {
                            ForEach(appState.orphanedItems) { item in
                                HStack(spacing: 12) {
                                    Toggle(isOn: Binding(
                                        get: { appState.selectedOrphanedIDs.contains(item.id) },
                                        set: { selected in
                                            if selected {
                                                appState.selectedOrphanedIDs.insert(item.id)
                                            } else {
                                                appState.selectedOrphanedIDs.remove(item.id)
                                            }
                                        }
                                    )) {
                                        EmptyView()
                                    }
                                    .labelsHidden()

                                    Image(systemName: iconForKind(item.kind))
                                        .font(.system(size: 14))
                                        .foregroundStyle(.secondary)
                                        .frame(width: 22)

                                    VStack(alignment: .leading, spacing: 2) {
                                        HStack(spacing: 6) {
                                            Text(item.inferredApp)
                                                .font(.system(size: 13, weight: .semibold))
                                            Text(item.name)
                                                .font(.caption)
                                                .foregroundStyle(.secondary)
                                                .lineLimit(1)
                                        }

                                        HStack(spacing: 8) {
                                            Text(item.kind)
                                                .font(.caption2)
                                                .padding(.horizontal, 6)
                                                .padding(.vertical, 1)
                                                .background(Color.secondary.opacity(0.12))
                                                .clipShape(Capsule())

                                            Text("Modified: \(item.lastModified)")
                                                .font(.caption2)
                                                .foregroundStyle(.tertiary)
                                        }
                                    }

                                    Spacer()

                                    Text(item.formattedSize)
                                        .font(.subheadline.monospacedDigit())
                                        .foregroundStyle(.secondary)

                                    Button {
                                        NSWorkspace.shared.selectFile(item.path, inFileViewerRootedAtPath: "")
                                    } label: {
                                        Image(systemName: "magnifyingglass")
                                            .font(.system(size: 11))
                                    }
                                    .buttonStyle(.borderless)
                                    .help("Reveal in Finder")
                                }
                                .padding(.vertical, 3)
                            }
                        }
                        .listStyle(.inset)
                    }
                }
            }
        }
        .navigationTitle("App Uninstaller")
        .searchable(text: $appState.appSearchText, prompt: currentTab == .installed ? "Filter installed applications" : "Filter residual items")
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
        .confirmationDialog(
            "Remove \(appState.selectedOrphanedIDs.count) Orphaned Items?",
            isPresented: $showConfirmOrphanedClean,
            titleVisibility: .visible
        ) {
            Button("Remove Orphaned Items (\(selectedOrphanedBytes.formattedBytes))", role: .destructive) {
                Task { await appState.cleanSelectedOrphanedItems() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("These residual files belong to applications that have already been deleted. Cleaning them will reclaim \(selectedOrphanedBytes.formattedBytes) of storage space.")
        }
        .task {
            if appState.installedApps.isEmpty && !appState.isLoadingApps {
                await appState.fetchInstalledApps()
            }
            if appState.orphanedItems.isEmpty && !appState.isLoadingOrphaned {
                await appState.fetchOrphanedLeftovers()
            }
        }
        .onChange(of: currentTab) {
            if currentTab == .orphaned && appState.orphanedItems.isEmpty && !appState.isLoadingOrphaned {
                Task { await appState.fetchOrphanedLeftovers() }
            }
        }
    }

    private func iconForKind(_ kind: String) -> String {
        switch kind {
        case "Application Support": return "folder.badge.gearshape"
        case "Caches": return "externaldrive.badge.timemachine"
        case "Saved State": return "clock.arrow.circlepath"
        case "Containers": return "shippingbox"
        case "Preferences": return "switch.2"
        default: return "doc"
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
