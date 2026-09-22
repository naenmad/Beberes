import SwiftUI

public struct QuickReviewView: View {
    var state: AppState
    @State private var isReviewing = false
    @State private var reviewDone = false

    public init(state: AppState) {
        self.state = state
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Header Bar
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Quick Review")
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                    Text("All-in-one comprehensive assessment of reclaimable space and system health.")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button {
                    Task { await performFullAssessment() }
                } label: {
                    Label(isReviewing ? "Assessing System..." : "Run Assessment", systemImage: "bolt.badge.sparkle")
                }
                .disabled(isReviewing)
                .buttonStyle(.borderedProminent)
            }
            .padding(.horizontal, 24)
            .padding(.top, 18)
            .padding(.bottom, 14)

            Divider()

            if isReviewing {
                VStack(spacing: 14) {
                    ProgressView()
                        .controlSize(.large)
                    Text("Scanning storage volumes, trash, caches, and developer environments...")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(spacing: 16) {
                        // Overview Cards Grid
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                            ReviewModuleCard(
                                title: "System Caches & Logs",
                                icon: "sparkles",
                                status: "User caches, system logs, and development artifacts",
                                actionTitle: "Open System Clean",
                                onAction: { state.selectedSection = .systemClean }
                            )

                            ReviewModuleCard(
                                title: "Trash Can Items",
                                icon: "trash",
                                status: "\(state.trashItems.count) items in Trash",
                                actionTitle: "Open Trash Manager",
                                onAction: { state.selectedSection = .trashManager }
                            )

                            ReviewModuleCard(
                                title: "Dormant Dev Workspaces",
                                icon: "hammer",
                                status: "\(state.dormantProjects.count) inactive projects detected",
                                actionTitle: "Open Dev Workspace",
                                onAction: { state.selectedSection = .devWorkspace }
                            )

                            ReviewModuleCard(
                                title: "Desktop & Downloads Clutter",
                                icon: "folder.badge.gearshape",
                                status: "Installers, redundant files, and screenshots",
                                actionTitle: "Open Tidy Up",
                                onAction: { state.selectedSection = .tidyUp }
                            )

                            ReviewModuleCard(
                                title: "Large & Duplicate Files",
                                icon: "doc.on.doc",
                                status: "\(state.largeFiles.count) files scanned",
                                actionTitle: "Open Large Files",
                                onAction: { state.selectedSection = .largeFiles }
                            )

                            ReviewModuleCard(
                                title: "Listening Network Ports",
                                icon: "network",
                                status: "\(state.ports.count) active TCP listeners",
                                actionTitle: "Open Zombie Ports",
                                onAction: { state.selectedSection = .zombiePorts }
                            )
                        }
                    }
                    .padding(20)
                }
            }
        }
    }

    private func performFullAssessment() async {
        isReviewing = true
        // Refresh all background services concurrently
        await state.refreshAll()
        isReviewing = false
        reviewDone = true
    }
}

private struct ReviewModuleCard: View {
    let title: String
    let icon: String
    let status: String
    let actionTitle: String
    let onAction: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundStyle(.secondary)
                    .frame(width: 20)

                Text(title)
                    .font(.system(size: 13, weight: .semibold))

                Spacer()
            }

            Text(status)
                .font(.system(size: 11))
                .foregroundStyle(.secondary)

            Divider()

            Button(action: onAction) {
                HStack {
                    Text(actionTitle)
                        .font(.system(size: 11))
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 10))
                        .foregroundStyle(.tertiary)
                }
            }
            .buttonStyle(.plain)
            .foregroundStyle(Color.accentColor)
        }
        .padding(14)
        .background(Color(nsColor: .controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}
