import SwiftUI

public struct MainView: View {
    @State private var state = AppState()

    public init() {}

    public var body: some View {
        NavigationSplitView {
            SidebarView(state: state)
                .navigationSplitViewColumnWidth(min: 200, ideal: 230, max: 280)
        } detail: {
            Group {
                switch state.selectedSection {
                case .dashboard:
                    DashboardView(state: state)
                case .devWorkspace:
                    DevWorkspaceView(state: state)
                case .zombiePorts:
                    ZombiePortsView(state: state)
                case .systemClean:
                    SystemCleanView(state: state)
                case .appUninstaller:
                    AppUninstallerView(appState: state)
                case .fileShredder:
                    FileShredderView(appState: state)
                case .startupItems:
                    StartupItemsView(appState: state)
                default:
                    VStack(spacing: 12) {
                        Image(systemName: state.selectedSection.iconName)
                            .font(.system(size: 48))
                            .foregroundStyle(.secondary)
                        Text(state.selectedSection.rawValue)
                            .font(.title2.bold())
                        Text("Settings & preferences are being integrated.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
        }
        .frame(minWidth: 850, minHeight: 550)
    }
}
