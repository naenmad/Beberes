import SwiftUI

public struct SystemCleanView: View {
    @Bindable var state: AppState
    @State private var expandedCategoryIDs: Set<String> = []

    public init(state: AppState) {
        self.state = state
    }

    private var selectedBytes: Int64 {
        state.cleanCategories
            .filter { state.selectedCategoryIDs.contains($0.id) }
            .reduce(Int64(0)) { $0 + $1.sizeBytes }
    }

    private var totalBytes: Int64 {
        state.cleanCategories.reduce(Int64(0)) { $0 + $1.sizeBytes }
    }

    public var body: some View {
        VStack(spacing: 0) {
            subHeaderBar
            Divider()

            // Status message
            if let msg = state.systemCleanToastMessage {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle")
                        .foregroundStyle(.secondary)
                    Text(msg)
                        .font(.subheadline)
                    Spacer()
                    Button("Dismiss") { state.systemCleanToastMessage = nil }
                        .font(.caption)
                        .buttonStyle(.borderless)
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 8)
                .background(.bar)
                Divider()
            }

            if state.isLoadingSystemClean {
                VStack(spacing: 12) {
                    ProgressView()
                        .controlSize(.large)
                    Text("Analyzing system caches, application leftovers, and logs...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if state.cleanCategories.isEmpty {
                StatusStateView(
                    type: .clean(systemImage: "sparkles"),
                    title: "System Caches Clean",
                    subtitle: "No redundant user caches or system log files detected. Your Mac is in top shape.",
                    actionTitle: "Rescan System",
                    actionIcon: "arrow.clockwise"
                ) {
                    Task { await state.scanSystemCategories() }
                }
            } else {
                categoriesList
            }
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .navigationTitle("System Clean")
        .task {
            if state.cleanCategories.isEmpty && !state.isLoadingSystemClean {
                await state.scanSystemCategories()
                autoSelectSafeCaches()
            }
        }
    }

    private var subHeaderBar: some View {
        HStack(spacing: 12) {
            HStack(spacing: 6) {
                Text("\(state.cleanCategories.count) Categories")
                    .font(.system(size: 12, weight: .semibold))
                Text("(\(totalBytes.formattedBytes) Reclaimable)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Button {
                autoSelectSafeCaches()
            } label: {
                Label("Smart Auto-Select Safe Caches", systemImage: "sparkles")
            }
            .buttonStyle(.bordered)
            .controlSize(.small)

            Button(state.selectedCategoryIDs.count == state.cleanCategories.count ? "Deselect All" : "Select All") {
                if state.selectedCategoryIDs.count == state.cleanCategories.count {
                    state.selectedCategoryIDs.removeAll()
                } else {
                    state.selectedCategoryIDs = Set(state.cleanCategories.map(\.id))
                }
            }
            .buttonStyle(.bordered)
            .controlSize(.small)

            Button {
                Task { await state.cleanSelectedCategories() }
            } label: {
                Label("Clean Selected (\(selectedBytes.formattedBytes))", systemImage: "sparkles")
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.small)
            .disabled(state.isLoadingSystemClean || state.selectedCategoryIDs.isEmpty)

            Button {
                Task {
                    await state.scanSystemCategories()
                    autoSelectSafeCaches()
                }
            } label: {
                Label("Rescan", systemImage: "arrow.clockwise")
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
            .disabled(state.isLoadingSystemClean)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 8)
        .background(Color(nsColor: .controlBackgroundColor).opacity(0.5))
    }

    private var categoriesList: some View {
        List {
            ForEach(state.cleanCategories, id: \.id) { (cat: CleanCategory) in
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 12) {
                        Toggle(isOn: Binding(
                            get: { state.selectedCategoryIDs.contains(cat.id) },
                            set: { selected in
                                if selected {
                                    state.selectedCategoryIDs.insert(cat.id)
                                } else {
                                    state.selectedCategoryIDs.remove(cat.id)
                                }
                            }
                        )) {
                            EmptyView()
                        }
                        .labelsHidden()

                        Image(systemName: cat.iconName)
                            .font(.system(size: 14))
                            .foregroundStyle(.secondary)
                            .frame(width: 22)

                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 8) {
                                Text(cat.title)
                                    .font(.system(size: 13, weight: .medium))

                                if cat.isSafe {
                                    Text("Safe to Clean")
                                        .font(.system(size: 9, weight: .bold))
                                        .padding(.horizontal, 5)
                                        .padding(.vertical, 1)
                                        .background(Color.green.opacity(0.12))
                                        .foregroundStyle(.green)
                                        .clipShape(Capsule())
                                } else {
                                    Text("Developer / Simulator")
                                        .font(.system(size: 9, weight: .bold))
                                        .padding(.horizontal, 5)
                                        .padding(.vertical, 1)
                                        .background(Color.orange.opacity(0.12))
                                        .foregroundStyle(.orange)
                                        .clipShape(Capsule())
                                }
                            }

                            Text(cat.detail)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        Text(cat.formattedSize)
                            .font(.subheadline.monospacedDigit())
                            .foregroundStyle(.secondary)

                        if !cat.paths.isEmpty {
                            Button {
                                if expandedCategoryIDs.contains(cat.id) {
                                    expandedCategoryIDs.remove(cat.id)
                                } else {
                                    expandedCategoryIDs.insert(cat.id)
                                }
                            } label: {
                                Image(systemName: expandedCategoryIDs.contains(cat.id) ? "chevron.up" : "chevron.down")
                                    .font(.system(size: 10))
                                    .foregroundStyle(.secondary)
                            }
                            .buttonStyle(.borderless)
                        }
                    }

                    if expandedCategoryIDs.contains(cat.id) && !cat.paths.isEmpty {
                        VStack(alignment: .leading, spacing: 3) {
                            Text("Target directory paths:")
                                .font(.caption2)
                                .foregroundStyle(.tertiary)
                            ForEach(cat.paths, id: \.self) { path in
                                Text(path)
                                    .font(.system(size: 10, design: .monospaced))
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                            }
                        }
                        .padding(.leading, 34)
                        .padding(.top, 2)
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .listStyle(.inset)
    }

    private func autoSelectSafeCaches() {
        let safeIDs = state.cleanCategories.filter(\.isSafe).map(\.id)
        state.selectedCategoryIDs = Set(safeIDs)
    }
}
