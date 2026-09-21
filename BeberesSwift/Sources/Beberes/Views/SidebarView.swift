import SwiftUI

public struct SidebarView: View {
    @Bindable var state: AppState

    public init(state: AppState) {
        self.state = state
    }

    public var body: some View {
        List(selection: $state.selectedSection) {
            Section("Developer Tools") {
                Label(NavigationSection.devWorkspace.rawValue, systemImage: NavigationSection.devWorkspace.iconName)
                    .tag(NavigationSection.devWorkspace)

                Label(NavigationSection.zombiePorts.rawValue, systemImage: NavigationSection.zombiePorts.iconName)
                    .tag(NavigationSection.zombiePorts)
            }

            Section("System & Storage") {
                Label(NavigationSection.dashboard.rawValue, systemImage: NavigationSection.dashboard.iconName)
                    .tag(NavigationSection.dashboard)

                Label(NavigationSection.systemClean.rawValue, systemImage: NavigationSection.systemClean.iconName)
                    .tag(NavigationSection.systemClean)

                Label(NavigationSection.appUninstaller.rawValue, systemImage: NavigationSection.appUninstaller.iconName)
                    .tag(NavigationSection.appUninstaller)
            }
        }
        .listStyle(.sidebar)
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: 4) {
                Divider()
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Lifetime Space Saved")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.secondary)
                        Text(state.lifetimeFreedBytes.formattedBytes)
                            .font(.system(size: 13, weight: .bold, design: .rounded))
                            .foregroundStyle(.primary)
                    }
                    Spacer()
                    Image(systemName: "sparkles")
                        .foregroundStyle(Color.emerald)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
            }
            .background(.bar)
        }
    }
}

private extension Color {
    static let emerald = Color(red: 16/255, green: 185/255, blue: 129/255)
}
