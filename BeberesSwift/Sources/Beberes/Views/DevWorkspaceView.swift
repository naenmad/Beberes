import SwiftUI

public struct DevWorkspaceView: View {
    @Bindable var state: AppState
    @State private var selectedProjectPaths: Set<String> = []
    @State private var showConfirmHibernateSelected = false
    @State private var showConfirmHibernateAll = false

    public init(state: AppState) {
        self.state = state
    }

    private var selectedBytes: Int64 {
        state.dormantProjects
            .filter { selectedProjectPaths.contains($0.path) }
            .reduce(0) { $0 + $1.totalReclaimableBytes }
    }

    private var totalReclaimableBytes: Int64 {
        state.dormantProjects.reduce(0) { $0 + $1.totalReclaimableBytes }
    }

    public var body: some View {
        VStack(spacing: 0) {
            subHeaderBar
            Divider()

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
                loadingView
            } else if state.dormantProjects.isEmpty {
                emptyView
            } else {
                projectsList
            }
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .navigationTitle("Dev Workspace")
        .confirmationDialog(
            "Hibernate \(selectedProjectPaths.count) Selected Projects?",
            isPresented: $showConfirmHibernateSelected,
            titleVisibility: .visible
        ) {
            Button("Hibernate (\(selectedBytes.formattedBytes))", role: .destructive) {
                let toHibernate = state.dormantProjects.filter { selectedProjectPaths.contains($0.path) }
                Task {
                    await state.hibernateProjects(toHibernate)
                    selectedProjectPaths.removeAll()
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will safely remove build artifacts (node_modules, target, DerivedData, .gradle) from the selected inactive projects. Source code and git history are 100% preserved.")
        }
        .confirmationDialog(
            "Hibernate All \(state.dormantProjects.count) Dormant Projects?",
            isPresented: $showConfirmHibernateAll,
            titleVisibility: .visible
        ) {
            Button("Hibernate All (\(totalReclaimableBytes.formattedBytes))", role: .destructive) {
                Task {
                    await state.hibernateProjects(state.dormantProjects)
                    selectedProjectPaths.removeAll()
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will safely clean build artifacts across all \(state.dormantProjects.count) dormant repositories, reclaiming \(totalReclaimableBytes.formattedBytes).")
        }
        .task {
            if state.dormantProjects.isEmpty && !state.isLoadingProjects {
                await state.scanDormantProjects()
            }
        }
    }

    // MARK: - Subviews

    private var subHeaderBar: some View {
        HStack(spacing: 12) {
            Text("Dormancy Threshold:")
                .font(.system(size: 12))
                .foregroundStyle(.secondary)

            Picker("Threshold", selection: $state.inactivityThresholdDays) {
                Text("30 Days").tag(30)
                Text("60 Days").tag(60)
                Text("90 Days").tag(90)
            }
            .pickerStyle(.segmented)
            .labelsHidden()
            .frame(width: 210)
            .onChange(of: state.inactivityThresholdDays) { _, _ in
                Task {
                    await state.scanDormantProjects()
                    selectedProjectPaths.removeAll()
                }
            }

            Spacer()

            if !state.dormantProjects.isEmpty {
                Button(selectedProjectPaths.count == state.dormantProjects.count ? "Deselect All" : "Select All") {
                    if selectedProjectPaths.count == state.dormantProjects.count {
                        selectedProjectPaths.removeAll()
                    } else {
                        selectedProjectPaths = Set(state.dormantProjects.map(\.path))
                    }
                }
                .buttonStyle(.bordered)
                .controlSize(.small)

                if !selectedProjectPaths.isEmpty {
                    Button("Hibernate Selected (\(selectedBytes.formattedBytes))", role: .destructive) {
                        showConfirmHibernateSelected = true
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
                } else {
                    Button("Hibernate All (\(totalReclaimableBytes.formattedBytes))", role: .destructive) {
                        showConfirmHibernateAll = true
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                }
            }

            Button {
                Task {
                    await state.scanDormantProjects()
                    selectedProjectPaths.removeAll()
                }
            } label: {
                Label("Rescan", systemImage: "arrow.clockwise")
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
            .disabled(state.isLoadingProjects)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 8)
        .background(Color(nsColor: .controlBackgroundColor).opacity(0.5))
    }

    private var loadingView: some View {
        VStack(spacing: 12) {
            ProgressView()
                .controlSize(.large)
            Text("Scanning Developer directories for dormant build artifacts...")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var emptyView: some View {
        StatusStateView(
            type: .clean(systemImage: "hammer"),
            title: "Workspace is Clean",
            subtitle: "No dormant developer projects found. All repositories have active Git commits within \(state.inactivityThresholdDays) days or are already hibernated.",
            actionTitle: "Rescan Projects",
            actionIcon: "arrow.clockwise"
        ) {
            Task { await state.scanDormantProjects() }
        }
    }

    private var projectsList: some View {
        List {
            ForEach(state.dormantProjects) { project in
                let isSelected = selectedProjectPaths.contains(project.path)

                VStack(alignment: .leading, spacing: 8) {
                    HStack(alignment: .center, spacing: 12) {
                        Toggle(isOn: Binding(
                            get: { isSelected },
                            set: { selected in
                                if selected {
                                    selectedProjectPaths.insert(project.path)
                                } else {
                                    selectedProjectPaths.remove(project.path)
                                }
                            }
                        )) {
                            EmptyView()
                        }
                        .labelsHidden()

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
                    .padding(.leading, 32)
                }
                .padding(.vertical, 4)
            }
        }
        .listStyle(.inset)
    }
}
