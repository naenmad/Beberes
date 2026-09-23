import SwiftUI

public struct DevWorkspaceView: View {
    @Bindable var state: AppState

    public init(state: AppState) {
        self.state = state
    }

    public var body: some View {
        VStack(spacing: 0) {

            // Feedback Message
            if let msg = state.hibernateToastMessage {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle")
                        .foregroundStyle(.secondary)
                    Text(msg)
                        .font(.subheadline)
                    Spacer()
                    Button("Dismiss") { state.hibernateToastMessage = nil }
                        .font(.caption)
                        .buttonStyle(.borderless)
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 8)
                .background(.bar)
                Divider()
            }

            if state.isLoadingProjects {
                VStack(spacing: 12) {
                    ProgressView()
                        .controlSize(.large)
                    Text("Scanning Developer directories for dormant build artifacts...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if state.dormantProjects.isEmpty {
                StatusStateView(
                    type: .clean(systemImage: "hammer"),
                    title: "Workspace is Clean",
                    subtitle: "No dormant developer projects found. All repositories have active Git commits within \(state.inactivityThresholdDays) days or are already hibernated.",
                    actionTitle: "Rescan Projects",
                    actionIcon: "arrow.clockwise"
                ) {
                    Task { await state.scanDormantProjects() }
                }
            } else {
                List {
                    ForEach(state.dormantProjects) { project in
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(alignment: .center) {
                                Image(systemName: "folder")
                                    .font(.system(size: 14))
                                    .foregroundStyle(.secondary)

                                VStack(alignment: .leading, spacing: 1) {
                                    Text(project.name)
                                        .font(.system(size: 13, weight: .semibold))
                                    Text(project.path)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .lineLimit(1)
                                }

                                Spacer()

                                Text(project.formattedReclaimable)
                                    .font(.subheadline.monospacedDigit())
                                    .foregroundStyle(.secondary)

                                Button("Hibernate") {
                                    Task { await state.hibernate(project: project) }
                                }
                                .buttonStyle(.bordered)
                                .controlSize(.small)
                                .disabled(state.hibernatingPath == project.path)
                            }

                            // Artifacts list
                            HStack(spacing: 6) {
                                ForEach(project.artifacts) { art in
                                    Text("\(art.name) (\(art.formattedSize))")
                                        .font(.caption2.monospaced())
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color.secondary.opacity(0.1))
                                        .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
                .listStyle(.inset)
            }
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .navigationTitle("Dev Workspace")
        .toolbar {
            ToolbarItem(placement: .principal) {
                Picker("Threshold", selection: $state.inactivityThresholdDays) {
                    Text("30 Days").tag(30)
                    Text("60 Days").tag(60)
                    Text("90 Days").tag(90)
                }
                .pickerStyle(.segmented)
                .labelsHidden()
                .frame(width: 210)
                .onChange(of: state.inactivityThresholdDays) { _, _ in
                    Task { await state.scanDormantProjects() }
                }
            }

            ToolbarItem(placement: .primaryAction) {
                Button {
                    Task { await state.scanDormantProjects() }
                } label: {
                    Label("Rescan", systemImage: "arrow.clockwise")
                }
                .disabled(state.isLoadingProjects)
            }
        }
        .task {
            if state.dormantProjects.isEmpty && !state.isLoadingProjects {
                await state.scanDormantProjects()
            }
        }
    }
}
