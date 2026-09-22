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
        HSplitView {
            // Left: Apps list
            VStack(spacing: 0) {
                // Header with search & refresh
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)
                    TextField("Search installed applications...", text: $appState.appSearchText)
                        .textFieldStyle(.plain)

                    if !appState.appSearchText.isEmpty {
                        Button {
                            appState.appSearchText = ""
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.secondary)
                        }
                        .buttonStyle(.plain)
                    }

                    Spacer()

                    Button {
                        Task { await appState.fetchInstalledApps() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .buttonStyle(.borderless)
                    .help("Refresh applications list")
                }
                .padding(12)
                .background(Color(nsColor: .controlBackgroundColor))

                Divider()

                if appState.isLoadingApps {
                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.2)
                        Text("Scanning installed applications & leftovers...")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if appState.filteredApps.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "app.badge.checkmark")
                            .font(.system(size: 44))
                            .foregroundStyle(.secondary)
                        Text("No applications found")
                            .font(.system(size: 15, weight: .semibold))
                        Text("All detected applications have been listed.")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(appState.filteredApps, selection: $appState.selectedApp) { app in
                        HStack(spacing: 12) {
                            AppBundleIconView(path: app.path)
                                .frame(width: 36, height: 36)

                            VStack(alignment: .leading, spacing: 2) {
                                HStack {
                                    Text(app.name)
                                        .font(.system(size: 13, weight: .semibold))
                                        .lineLimit(1)

                                    if app.isSystemApp {
                                        Text("SYSTEM")
                                            .font(.system(size: 9, weight: .bold))
                                            .padding(.horizontal, 5)
                                            .padding(.vertical, 1)
                                            .background(Color.secondary.opacity(0.15))
                                            .cornerRadius(4)
                                            .foregroundStyle(.secondary)
                                    }
                                }

                                Text("v\(app.version) • \(app.bundleId)")
                                    .font(.system(size: 11))
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                            }

                            Spacer()

                            VStack(alignment: .trailing, spacing: 2) {
                                Text(app.formattedTotalSize)
                                    .font(.system(size: 12, weight: .medium))
                                if !app.leftovers.isEmpty {
                                    Text("+\(app.leftovers.count) leftovers")
                                        .font(.system(size: 10))
                                        .foregroundStyle(.orange)
                                }
                            }
                        }
                        .padding(.vertical, 4)
                        .tag(app)
                    }
                    .listStyle(.inset)
                }
            }
            .frame(minWidth: 320, maxWidth: 420)

            // Right: Detail & leftover breakdown
            if let app = appState.selectedApp {
                AppDetailInspectorView(
                    app: app,
                    onUninstall: {
                        appToUninstall = app
                        showConfirmDialog = true
                    }
                )
                .frame(minWidth: 360, maxWidth: .infinity)
            } else {
                VStack(spacing: 12) {
                    Image(systemName: "sidebar.left")
                        .font(.system(size: 40))
                        .foregroundStyle(.secondary)
                    Text("Select an application to view breakdown")
                        .font(.system(size: 14))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .task {
            if appState.installedApps.isEmpty {
                await appState.fetchInstalledApps()
            }
        }
        .confirmationDialog(
            "Uninstall \(appToUninstall?.name ?? "App")?",
            isPresented: $showConfirmDialog,
            presenting: appToUninstall
        ) { app in
            Button("Uninstall & Trash Leftovers", role: .destructive) {
                Task { await appState.uninstallApp(app) }
            }
            Button("Cancel", role: .cancel) {}
        } message: { app in
            Text("This will move \(app.name) and \(app.leftovers.count) associated leftover files (\(app.formattedTotalSize) total) to macOS Trash. You can recover them from Trash if needed.")
        }
        .overlay(alignment: .bottom) {
            if let toast = appState.appUninstallToastMessage {
                Text(toast)
                    .font(.system(size: 12, weight: .medium))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(.ultraThinMaterial)
                    .cornerRadius(8)
                    .shadow(radius: 4)
                    .padding(.bottom, 20)
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                            appState.appUninstallToastMessage = nil
                        }
                    }
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
            Image(systemName: "app.fill")
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
                    .frame(width: 64, height: 64)

                VStack(alignment: .leading, spacing: 4) {
                    Text(app.name)
                        .font(.system(size: 18, weight: .bold))
                    Text("Version \(app.version) (\(app.bundleId))")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                    Text(app.path)
                        .font(.system(size: 11))
                        .foregroundStyle(.tertiary)
                        .lineLimit(1)
                        .truncationMode(.middle)
                }

                Spacer()

                Button(action: onUninstall) {
                    Label(app.isSystemApp ? "Protected" : "Uninstall App", systemImage: "trash")
                }
                .buttonStyle(.borderedProminent)
                .tint(.red)
                .disabled(app.isSystemApp)
                .help(app.isSystemApp ? "System apps cannot be uninstalled" : "Safely trash app and all leftovers")
            }
            .padding(20)
            .background(Color(nsColor: .controlBackgroundColor).opacity(0.5))

            Divider()

            // Space breakdown summary
            HStack(spacing: 24) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("APP BINARY")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.secondary)
                    Text(app.appSizeBytes.formattedBytes)
                        .font(.system(size: 15, weight: .bold))
                }

                Divider()
                    .frame(height: 30)

                VStack(alignment: .leading, spacing: 4) {
                    Text("LEFTOVER DATA")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.secondary)
                    Text(app.leftoversSizeBytes.formattedBytes)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(app.leftovers.isEmpty ? Color.secondary : Color.orange)
                }

                Divider()
                    .frame(height: 30)

                VStack(alignment: .leading, spacing: 4) {
                    Text("TOTAL SPACE")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.secondary)
                    Text(app.formattedTotalSize)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.blue)
                }

                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(Color(nsColor: .windowBackgroundColor))

            Divider()

            // Leftovers List
            VStack(alignment: .leading, spacing: 10) {
                Text("Associated Files & Sandboxes (\(app.leftovers.count))")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 20)
                    .padding(.top, 14)

                if app.leftovers.isEmpty {
                    VStack(spacing: 8) {
                        Image(systemName: "checkmark.seal")
                            .font(.system(size: 28))
                            .foregroundStyle(.green)
                        Text("No lingering leftovers found in ~/Library")
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(app.leftovers) { leftover in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                HStack(spacing: 8) {
                                    Text(leftover.category)
                                        .font(.system(size: 10, weight: .bold))
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color.blue.opacity(0.12))
                                        .cornerRadius(4)
                                        .foregroundStyle(.blue)

                                    Text(leftover.name)
                                        .font(.system(size: 12, weight: .medium))
                                }

                                Text(leftover.path)
                                    .font(.system(size: 10))
                                    .foregroundStyle(.tertiary)
                                    .lineLimit(1)
                                    .truncationMode(.middle)
                            }

                            Spacer()

                            Text(leftover.formattedSize)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 2)
                    }
                    .listStyle(.inset)
                }
            }
        }
    }
}
