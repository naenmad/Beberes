import SwiftUI

public struct SidebarView: View {
    @Bindable var state: AppState

    public init(state: AppState) {
        self.state = state
    }

    public var body: some View {
        VStack(spacing: 0) {
            // App Header
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(LinearGradient(
                            colors: [Color.emerald, Color(red: 5/255, green: 150/255, blue: 105/255)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ))
                        .frame(width: 34, height: 34)
                        .shadow(color: Color.emerald.opacity(0.3), radius: 6, y: 2)

                    Image(systemName: "sparkles")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                }

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text("Beberes")
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                        Text("v2.0")
                            .font(.system(size: 9, weight: .heavy))
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

            // Navigation List
            List(selection: $state.selectedSection) {
                Section("Overview") {
                    NavigationRow(
                        section: .dashboard,
                        icon: "gauge.with.needle.fill",
                        color: .blue,
                        badge: nil
                    )
                }

                Section("Developer Tools") {
                    NavigationRow(
                        section: .devWorkspace,
                        icon: "hammer.fill",
                        color: .orange,
                        badge: state.dormantProjects.isEmpty ? nil : "\(state.dormantProjects.count)"
                    )

                    NavigationRow(
                        section: .zombiePorts,
                        icon: "network",
                        color: .cyan,
                        badge: state.ports.isEmpty ? nil : "\(state.ports.count)"
                    )
                }

                Section("System & Storage") {
                    NavigationRow(
                        section: .systemClean,
                        icon: "sparkles",
                        color: .emerald,
                        badge: nil
                    )

                    NavigationRow(
                        section: .appUninstaller,
                        icon: "trash.fill",
                        color: .red,
                        badge: state.installedApps.isEmpty ? nil : "\(state.installedApps.count)"
                    )

                    NavigationRow(
                        section: .startupItems,
                        icon: "bolt.badge.clock.fill",
                        color: .purple,
                        badge: nil
                    )
                }

                Section("Security & Privacy") {
                    NavigationRow(
                        section: .fileShredder,
                        icon: "flame.fill",
                        color: .red,
                        badge: state.shredQueue.isEmpty ? nil : "\(state.shredQueue.count)"
                    )
                }
            }
            .listStyle(.sidebar)

            // Lifetime Saved Footer
            VStack(spacing: 8) {
                Divider()
                    .padding(.horizontal, 12)

                HStack(spacing: 10) {
                    ZStack {
                        Circle()
                            .fill(Color.emerald.opacity(0.15))
                            .frame(width: 32, height: 32)
                        Image(systemName: "arrow.down.circle.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(Color.emerald)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text("LIFETIME SPACE SAVED")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.secondary)
                        Text(state.lifetimeFreedBytes.formattedBytes)
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundStyle(.primary)
                    }

                    Spacer()
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color(nsColor: .controlBackgroundColor).opacity(0.6))
                )
                .padding(.horizontal, 12)
                .padding(.bottom, 12)
            }
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
                .frame(width: 20)

            Text(section.rawValue)
                .font(.system(size: 13, weight: .medium))

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
        .padding(.vertical, 2)
    }
}

private extension Color {
    static let emerald = Color(red: 16/255, green: 185/255, blue: 129/255)
}
