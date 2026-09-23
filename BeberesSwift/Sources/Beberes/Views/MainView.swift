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
        }
        .frame(minWidth: 920, minHeight: 580)
    }
}
