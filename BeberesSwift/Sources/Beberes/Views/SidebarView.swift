import SwiftUI

public struct SidebarView: View {
    @Bindable var state: AppState
    @State private var showAboutModal = false

    public init(state: AppState) {
        self.state = state
    }

    public var body: some View {
        VStack(spacing: 0) {
            // App Header with Authentic Icon
            HStack(spacing: 10) {
                AppIconView(size: 28, cornerRadius: 7)

                VStack(alignment: .leading, spacing: 1) {
                    HStack(spacing: 6) {
                        Text("Beberes")
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                        Text("v2.0")
                            .font(.system(size: 9, weight: .heavy, design: .monospaced))
                            .padding(.horizontal, 5)
                            .padding(.vertical, 1.5)
                            .background(Color.emerald.opacity(0.18))
                            .foregroundStyle(Color.emerald)
                            .clipShape(Capsule())
                    }

                    Text("Native macOS Utility")
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }

                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, 12)

            Divider()
                .padding(.horizontal, 12)

            // Navigation List: 4 Groups from Tauri
            List(selection: $state.selectedSection) {
                // Group 1: OVERVIEW
                Section("OVERVIEW") {
                    NavigationRow(
                        section: .dashboard,
                        icon: "square.grid.2x2.fill",
                        color: .blue,
                        badge: nil
                    )

                    NavigationRow(
                        section: .hardware,
                        icon: "waveform.path.ecg",
                        color: .indigo,
                        badge: nil
                    )
                }

                // Group 2: CLEANING
                Section("CLEANING") {
                    NavigationRow(
                        section: .systemClean,
                        icon: "sparkles",
                        color: .emerald,
                        badge: nil
                    )

                    NavigationRow(
                        section: .appUninstaller,
                        icon: "app.badge",
                        color: .red,
                        badge: state.installedApps.isEmpty ? nil : "\(state.installedApps.count)"
                    )

                    NavigationRow(
                        section: .trashManager,
                        icon: "trash.fill",
                        color: .orange,
                        badge: state.trashItems.isEmpty ? nil : "\(state.trashItems.count)"
                    )

                    NavigationRow(
                        section: .fileShredder,
                        icon: "shield.lefthalf.filled",
                        color: .red,
                        badge: state.shredQueue.isEmpty ? nil : "\(state.shredQueue.count)"
                    )
                }

                // Group 3: ORGANIZATION
                Section("ORGANIZATION") {
                    NavigationRow(
                        section: .tidyUp,
                        icon: "folder.badge.gearshape",
                        color: .purple,
                        badge: nil
                    )

                    NavigationRow(
                        section: .largeFiles,
                        icon: "square.stack.3d.up.fill",
                        color: .blue,
                        badge: state.largeFiles.isEmpty ? nil : "\(state.largeFiles.count)"
                    )

                    NavigationRow(
                        section: .quickReview,
                        icon: "eye.fill",
                        color: .teal,
                        badge: nil
                    )

                    NavigationRow(
                        section: .diskVisualizer,
                        icon: "chart.pie.fill",
                        color: .orange,
                        badge: nil
                    )

                    NavigationRow(
                        section: .similarPhotos,
                        icon: "photo.stack.fill",
                        color: .pink,
                        badge: nil
                    )
                }

                // Group 4: DEVELOPER
                Section("DEVELOPER") {
                    NavigationRow(
                        section: .devWorkspace,
                        icon: "hammer.fill",
                        color: .orange,
                        badge: state.dormantProjects.isEmpty ? nil : "\(state.dormantProjects.count)"
                    )

                    NavigationRow(
                        section: .gitSweeper,
                        icon: "arrow.triangle.branch",
                        color: .purple,
                        badge: nil
                    )

                    NavigationRow(
                        section: .startupItems,
                        icon: "bolt.fill",
                        color: .yellow,
                        badge: nil
                    )

                    NavigationRow(
                        section: .zombiePorts,
                        icon: "network",
                        color: .cyan,
                        badge: state.ports.isEmpty ? nil : "\(state.ports.count)"
                    )

                    NavigationRow(
                        section: .plugins,
                        icon: "puzzlepiece.extension.fill",
                        color: .green,
                        badge: nil
                    )
                }
            }
            .listStyle(.sidebar)

            // Footer Section
            VStack(spacing: 6) {
                Divider()
                    .padding(.horizontal, 12)

                // Volume Status Card
                HStack(spacing: 10) {
                    Image(systemName: "internaldrive.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(.secondary)

                    VStack(alignment: .leading, spacing: 1) {
                        Text("Macintosh HD")
                            .font(.system(size: 11, weight: .semibold))
                        Text("\(state.diskInfo.availableBytes.formattedBytes) available")
                            .font(.system(size: 10))
                            .foregroundStyle(.secondary)
                    }

                    Spacer()
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color(nsColor: .controlBackgroundColor).opacity(0.6))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                .padding(.horizontal, 12)

                // Settings and About
                HStack(spacing: 8) {
                    Button {
                        state.selectedSection = .settings
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "gearshape.fill")
                                .font(.system(size: 12))
                            Text("Settings")
                                .font(.system(size: 11, weight: .medium))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                        .background(state.selectedSection == .settings ? Color.accentColor.opacity(0.15) : Color.clear)
                        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(state.selectedSection == .settings ? Color.accentColor : Color.primary)

                    Button {
                        showAboutModal = true
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "info.circle")
                                .font(.system(size: 12))
                            Text("About")
                                .font(.system(size: 11, weight: .medium))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(.secondary)
                }
                .padding(.horizontal, 12)
                .padding(.bottom, 10)
            }
        }
        .sheet(isPresented: $showAboutModal) {
            AboutView()
        }
    }
}

private struct NavigationRow: View {
    let section: NavigationSection
    let icon: String
    let color: Color
    let badge: String?

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(color)
                .frame(width: 18)

            Text(section.rawValue)
                .font(.system(size: 12, weight: .medium))

            Spacer()

            if let badge = badge {
                Text(badge)
                    .font(.system(size: 10, weight: .bold))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.secondary.opacity(0.18))
                    .clipShape(Capsule())
                    .foregroundStyle(.secondary)
            }
        }
        .tag(section)
        .padding(.vertical, 1)
    }
}

private extension Color {
    static let emerald = Color(red: 16/255, green: 185/255, blue: 129/255)
}
