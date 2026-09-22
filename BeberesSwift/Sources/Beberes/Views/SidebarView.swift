import SwiftUI

public struct SidebarView: View {
    @Bindable var state: AppState
    @State private var showAboutSheet = false

    public init(state: AppState) {
        self.state = state
    }

    public var body: some View {
        List(selection: $state.selectedSection) {
            // Group 1: OVERVIEW
            Section("Overview") {
                NavigationRow(
                    section: .dashboard,
                    icon: "square.grid.2x2",
                    badge: nil
                )

                NavigationRow(
                    section: .hardware,
                    icon: "waveform.path.ecg",
                    badge: nil
                )
            }

            // Group 2: CLEANING
            Section("Cleaning") {
                NavigationRow(
                    section: .systemClean,
                    icon: "sparkles",
                    badge: nil
                )

                NavigationRow(
                    section: .appUninstaller,
                    icon: "app.badge",
                    badge: state.installedApps.isEmpty ? nil : "\(state.installedApps.count)"
                )

                NavigationRow(
                    section: .trashManager,
                    icon: "trash",
                    badge: state.trashItems.isEmpty ? nil : "\(state.trashItems.count)"
                )

                NavigationRow(
                    section: .fileShredder,
                    icon: "lock.shield",
                    badge: state.shredQueue.isEmpty ? nil : "\(state.shredQueue.count)"
                )
            }

            // Group 3: ORGANIZATION
            Section("Organization") {
                NavigationRow(
                    section: .tidyUp,
                    icon: "folder.badge.gearshape",
                    badge: nil
                )

                NavigationRow(
                    section: .largeFiles,
                    icon: "doc.on.doc",
                    badge: state.largeFiles.isEmpty ? nil : "\(state.largeFiles.count)"
                )

                NavigationRow(
                    section: .quickReview,
                    icon: "eye",
                    badge: nil
                )

                NavigationRow(
                    section: .diskVisualizer,
                    icon: "chart.pie",
                    badge: nil
                )

                NavigationRow(
                    section: .similarPhotos,
                    icon: "photo.stack",
                    badge: nil
                )
            }

            // Group 4: DEVELOPER
            Section("Developer") {
                NavigationRow(
                    section: .devWorkspace,
                    icon: "hammer",
                    badge: state.dormantProjects.isEmpty ? nil : "\(state.dormantProjects.count)"
                )

                NavigationRow(
                    section: .gitSweeper,
                    icon: "arrow.triangle.branch",
                    badge: nil
                )

                NavigationRow(
                    section: .startupItems,
                    icon: "bolt",
                    badge: nil
                )

                NavigationRow(
                    section: .zombiePorts,
                    icon: "network",
                    badge: state.ports.isEmpty ? nil : "\(state.ports.count)"
                )

                NavigationRow(
                    section: .plugins,
                    icon: "puzzlepiece.extension",
                    badge: nil
                )
            }

            // Preferences
            Section {
                NavigationRow(
                    section: .settings,
                    icon: "gearshape",
                    badge: nil
                )
            }
        }
        .listStyle(.sidebar)
        .safeAreaInset(edge: .top) {
            // Clean Native Apple Sidebar Header
            HStack(spacing: 9) {
                AppIconView(size: 24, cornerRadius: 5)

                Text("Beberes")
                    .font(.system(size: 13, weight: .semibold))

                Text("2.0")
                    .font(.system(size: 11))
                    .foregroundStyle(.tertiary)

                Spacer()

                Button {
                    showAboutSheet = true
                } label: {
                    Image(systemName: "info.circle")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .help("About Beberes")
            }
            .padding(.horizontal, 16)
            .padding(.top, 10)
            .padding(.bottom, 6)
        }
        .safeAreaInset(edge: .bottom) {
            // Clean Minimalist Status Bar
            HStack(spacing: 6) {
                Image(systemName: "internaldrive")
                    .font(.system(size: 11))
                    .foregroundStyle(.tertiary)

                Text("Macintosh HD")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.secondary)

                Text("•")
                    .font(.system(size: 10))
                    .foregroundStyle(.tertiary)

                Text("\(state.diskInfo.availableBytes.formattedBytes) free")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)

                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(.bar)
        }
        .sheet(isPresented: $showAboutSheet) {
            AboutView()
        }
    }
}

private struct NavigationRow: View {
    let section: NavigationSection
    let icon: String
    let badge: String?

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
                .frame(width: 18)

            Text(section.rawValue)
                .font(.system(size: 13))

            Spacer()

            if let badge = badge {
                Text(badge)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 5)
                    .padding(.vertical, 1)
                    .background(Color.secondary.opacity(0.12))
                    .clipShape(Capsule())
            }
        }
        .tag(section)
    }
}
