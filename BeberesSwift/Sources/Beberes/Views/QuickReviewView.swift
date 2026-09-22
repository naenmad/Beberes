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
                                color: Color(red: 16/255, green: 185/255, blue: 129/255),
                                status: "Ready to analyze",
                                actionTitle: "Open System Clean",
                                onAction: { state.selectedSection = .systemClean }
                            )

                            ReviewModuleCard(
                                title: "Trash Can Items",
                                icon: "trash.fill",
                                color: .orange,
                                status: "\(state.trashItems.count) items ready to purge",
                                actionTitle: "Open Trash Manager",
                                onAction: { state.selectedSection = .trashManager }
                            )

                            ReviewModuleCard(
                                title: "Dormant Dev Workspaces",
                                icon: "hammer.fill",
                                color: .blue,
                                status: "\(state.dormantProjects.count) dormant projects detected",
                                actionTitle: "Open Dev Workspace",
                                onAction: { state.selectedSection = .devWorkspace }
                            )

                            ReviewModuleCard(
                                title: "Desktop & Downloads Clutter",
                                icon: "folder.badge.gearshape",
                                color: .purple,
                                status: "Analyze installers and redundant files",
                                actionTitle: "Open Tidy Up",
                                onAction: { state.selectedSection = .tidyUp }
                            )

                            ReviewModuleCard(
                                title: "Large & Duplicate Files",
                                icon: "square.stack.3d.up.fill",
                                color: .indigo,
                                status: "\(state.largeFiles.count) files scanned",
                                actionTitle: "Open Large Files",
                                onAction: { state.selectedSection = .largeFiles }
                            )

                            ReviewModuleCard(
                                title: "Listening Network Ports",
                                icon: "network",
                                color: .cyan,
                                status: "\(state.ports.count) active TCP listeners",
                                actionTitle: "Open Zombie Ports",
                                onAction: { state.selectedSection = .zombiePorts }
                            )
                        }
                    }
                    .padding(24)
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
    let color: Color
    let status: String
    let actionTitle: String
    let onAction: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(color)
                    .frame(width: 28, height: 28)
                    .background(color.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))

                Text(title)
                    .font(.system(size: 13, weight: .bold))

                Spacer()
            }

            Text(status)
                .font(.system(size: 11))
                .foregroundStyle(.secondary)

            Divider()

            Button(action: onAction) {
                HStack {
                    Text(actionTitle)
                        .font(.system(size: 11, weight: .medium))
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 10, weight: .semibold))
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
