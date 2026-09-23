import SwiftUI

public struct MainView: View {
    @State private var state = AppState()

    public init() {}

    public var body: some View {
        NavigationSplitView {
            SidebarView(state: state)
                .navigationSplitViewColumnWidth(min: 210, ideal: 235, max: 280)
        } detail: {
            Group {
                switch state.selectedSection {
                // OVERVIEW
                case .dashboard:
                    DashboardView(state: state)
                case .hardware:
                    HardwareView(appState: state)

                // CLEANING
                case .systemClean:
                    SystemCleanView(state: state)
                case .appUninstaller:
                    AppUninstallerView(appState: state)
                case .trashManager:
                    TrashManagerView(appState: state)
                case .fileShredder:
                    FileShredderView(appState: state)

                // ORGANIZATION
                case .tidyUp:
                    TidyUpView(state: state)
                case .largeFiles:
                    LargeFilesView(appState: state)
                case .quickReview:
                    QuickReviewView(state: state)
                case .diskVisualizer:
                    DiskVisualizerView(state: state)
                case .similarPhotos:
                    SimilarPhotosView(state: state)

                // DEVELOPER
                case .devWorkspace:
                    DevWorkspaceView(state: state)
                case .gitSweeper:
                    GitSweeperView(state: state)
                case .startupItems:
                    StartupItemsView(appState: state)
                case .zombiePorts:
                    ZombiePortsView(state: state)
                case .plugins:
                    PluginsView(state: state)

                // PREFERENCES
                case .settings:
                    SettingsView(state: state)
                }
            }
            .navigationTitle(state.selectedSection.rawValue)
            .toolbar {
                // Left Title Accessory: Storage Free Pill
                ToolbarItem(placement: .navigation) {
                    Button {
                        state.selectedSection = .dashboard
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "internaldrive")
                                .font(.system(size: 11))
                            Text("\(state.diskInfo.availableBytes.formattedBytes) free")
                                .font(.system(size: 11, weight: .medium))
                        }
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(Color.secondary.opacity(0.12))
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    .help("Macintosh HD free space • Click to view Dashboard")
                }

                // Center: Universal Spotlight Search Pill (Cmd+K)
                ToolbarItem(placement: .principal) {
                    Button {
                        state.isSpotlightOpen = true
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "magnifyingglass")
                                .font(.system(size: 11))
                                .foregroundStyle(.secondary)

                            Text("Search apps, actions, files...")
                                .font(.system(size: 12))
                                .foregroundStyle(.secondary)

                            Spacer(minLength: 6)

                            HStack(spacing: 2) {
                                Image(systemName: "command")
                                    .font(.system(size: 9))
                                Text("K")
                                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                            }
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 4)
                            .padding(.vertical, 1)
                            .background(Color.secondary.opacity(0.12))
                            .clipShape(RoundedRectangle(cornerRadius: 3))
                        }
                        .frame(width: 250, height: 26)
                        .padding(.horizontal, 8)
                        .background(Color(nsColor: .controlBackgroundColor))
                        .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 7, style: .continuous)
                                .stroke(Color.secondary.opacity(0.15), lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                    .keyboardShortcut("k", modifiers: .command)
                    .help("Spotlight Search (⌘K)")
                }

                // Right Toolbar Controls: Global Refresh, Deletion Mode, Smart Clean
                ToolbarItemGroup(placement: .primaryAction) {
                    // Global Refresh Button
                    Button {
                        Task { await state.triggerGlobalRefresh() }
                    } label: {
                        Label(state.isGlobalScanning ? "Scanning..." : "Refresh", systemImage: "arrow.clockwise")
                    }
                    .disabled(state.isGlobalScanning)
                    .help("Scan / Refresh current page and storage stats")

                    // Deletion Mode Switcher (Trash Mode vs Direct Delete)
                    Button {
                        state.toggleDeleteToTrash()
                    } label: {
                        HStack(spacing: 5) {
                            Image(systemName: state.deleteToTrash ? "trash" : "trash.slash.fill")
                                .foregroundStyle(state.deleteToTrash ? Color.secondary : Color.red)
                            Text(state.deleteToTrash ? "Trash Mode" : "Direct Delete")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(state.deleteToTrash ? Color.secondary : Color.red)
                        }
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(state.deleteToTrash ? Color.secondary.opacity(0.1) : Color.red.opacity(0.14))
                        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .help(state.deleteToTrash
                        ? "Trash Mode: Moves deleted files to macOS Trash (Put-back supported). Click to switch to Direct Delete."
                        : "Direct Delete: Permanently obliterates files without using Trash. Click to switch to Trash Mode."
                    )

                    // Quick Smart Clean Trigger
                    Button {
                        state.selectedSection = .systemClean
                    } label: {
                        Label("Smart Clean", systemImage: "sparkles")
                    }
                    .help("Jump to System Clean")
                }
            }
        }
        .frame(minWidth: 960, minHeight: 620)
        .sheet(isPresented: $state.isSpotlightOpen) {
            SpotlightView(state: state)
        }
    }
}
