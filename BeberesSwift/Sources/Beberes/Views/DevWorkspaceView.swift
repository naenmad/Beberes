import SwiftUI

public struct DevWorkspaceView: View {
    @Bindable var state: AppState

    public init(state: AppState) {
        self.state = state
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Header Bar
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Developer Workspace")
                        .font(.title2.bold())
                    Text("Hibernate disposable build artifacts in dormant Git repositories")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                // Inactivity Threshold Picker
                Picker("Inactivity Threshold", selection: $state.inactivityThresholdDays) {
                    Text("30 Days").tag(30)
                    Text("60 Days").tag(60)
                    Text("90 Days").tag(90)
                }
                .pickerStyle(.segmented)
                .frame(width: 220)
                .onChange(of: state.inactivityThresholdDays) { _, _ in
                    Task { await state.scanDormantProjects() }
                }

                Button(action: {
                    Task { await state.scanDormantProjects() }
                }) {
                    Label("Scan Projects", systemImage: "arrow.clockwise")
                }
                .disabled(state.isLoadingProjects)
            }
            .padding()
            .background(.bar)

            Divider()

            // Toast Message
            if let msg = state.hibernateToastMessage {
                HStack {
                    Text(msg)
                        .font(.footnote)
                        .foregroundStyle(.primary)
                    Spacer()
                    Button("Dismiss") { state.hibernateToastMessage = nil }
                        .font(.caption)
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(Color.emerald.opacity(0.12))
            }

            // Content
            if state.isLoadingProjects {
                Spacer()
                VStack(spacing: 12) {
                    ProgressView()
                    Text("Scanning Developer folders for git repos and build artifacts...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            } else if state.dormantProjects.isEmpty {
                Spacer()
                VStack(spacing: 8) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 44))
                        .foregroundStyle(.secondary)
                    Text("No dormant projects found")
                        .font(.headline)
                    Text("All your projects have recent commits (within \(state.inactivityThresholdDays) days), or have already been hibernated.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            } else {
                List {
                    // Summary Banner
                    let totalReclaimable = state.dormantProjects.reduce(0) { $0 + $1.totalReclaimableBytes }
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(state.dormantProjects.count) Inactive Projects Found")
                                .font(.headline)
                            Text("Total Reclaimable: \(totalReclaimable.formattedBytes)")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                    }
                    .padding(.vertical, 6)

                    // Project Cards
                    ForEach(state.dormantProjects) { project in
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(project.name)
                                        .font(.headline)
                                    Text(project.path)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .lineLimit(1)
                                }

                                Spacer()

                                StatusBadge("\(project.inactiveDays) days inactive", systemImage: "clock", color: .orange)
                                StatusBadge(project.formattedReclaimable, systemImage: "arrow.down.circle", color: .emerald)

                                Button(action: {
                                    Task { await state.hibernate(project: project) }
                                }) {
                                    if state.hibernatingPath == project.path {
                                        ProgressView().controlSize(.small)
                                    } else {
                                        Text("Hibernate")
                                    }
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(.emerald)
                                .disabled(state.hibernatingPath != nil)
                            }

                            // Commit Subject
                            Text("Last commit: \"\(project.lastCommitSubject)\"")
                                .font(.caption)
                                .italic()
                                .foregroundStyle(.secondary)

                            // Artifacts Tags
                            HStack(spacing: 6) {
                                ForEach(project.artifacts) { art in
                                    Text("\(art.name): \(art.formattedSize)")
                                        .font(.system(size: 11, design: .monospaced))
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color(nsColor: .controlBackgroundColor))
                                        .clipShape(RoundedRectangle(cornerRadius: 4))
                                }
                            }
                        }
                        .padding(.vertical, 8)
                    }
                }
                .listStyle(.inset)
            }
        }
        .task {
            if state.dormantProjects.isEmpty {
                await state.scanDormantProjects()
            }
        }
    }
}

private extension Color {
    static let emerald = Color(red: 16/255, green: 185/255, blue: 129/255)
}
