import SwiftUI

public struct SystemCleanView: View {
    @Bindable var state: AppState

    public init(state: AppState) {
        self.state = state
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("System Clean")
                        .font(.title2.bold())
                    Text("Remove purgeable system caches, APFS snapshots, and diagnostic logs")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button(action: {
                    Task { await state.scanSystemCategories() }
                }) {
                    Label("Rescan", systemImage: "arrow.clockwise")
                }
                .disabled(state.isLoadingSystemClean)

                Button(action: {
                    Task { await state.cleanSelectedCategories() }
                }) {
                    Label("Clean Selected", systemImage: "sparkles")
                }
                .buttonStyle(.borderedProminent)
                .tint(Color.emerald)
                .disabled(state.isLoadingSystemClean || state.selectedCategoryIDs.isEmpty)
            }
            .padding()
            .background(.bar)

            Divider()

            // Toast feedback
            if let msg = state.systemCleanToastMessage {
                HStack {
                    Text(msg)
                        .font(.footnote)
                        .foregroundStyle(.primary)
                    Spacer()
                    Button("Dismiss") { state.systemCleanToastMessage = nil }
                        .font(.caption)
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(Color.emerald.opacity(0.12))
            }

            // Categories List
            if state.isLoadingSystemClean {
                Spacer()
                VStack(spacing: 12) {
                    ProgressView()
                    Text("Analyzing system storage and local caches...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            } else {
                List {
                    // Summary Banner
                    let totalBytes = state.cleanCategories
                        .filter { state.selectedCategoryIDs.contains($0.id) }
                        .reduce(0) { $0 + $1.sizeBytes }

                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(state.selectedCategoryIDs.count) of \(state.cleanCategories.count) Categories Selected")
                                .font(.headline)
                            Text("Selected for cleanup: \(totalBytes.formattedBytes)")
                                .font(.subheadline)
                                .foregroundStyle(Color.emerald)
                        }
                        Spacer()
                    }
                    .padding(.vertical, 4)

                    ForEach(state.cleanCategories) { cat in
                        HStack(spacing: 14) {
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
                            .toggleStyle(.checkbox)

                            Image(systemName: cat.iconName)
                                .font(.title2)
                                .frame(width: 36, height: 36)
                                .background(Color.accentColor.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 8))

                            VStack(alignment: .leading, spacing: 2) {
                                Text(cat.title)
                                    .font(.headline)
                                Text(cat.detail)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            VStack(alignment: .trailing, spacing: 2) {
                                Text(cat.formattedSize)
                                    .font(.system(.body, design: .rounded).weight(.bold))
                                Text("\(cat.itemCount) items")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 6)
                    }
                }
                .listStyle(.inset)
            }
        }
        .task {
            if state.cleanCategories.isEmpty {
                await state.scanSystemCategories()
            }
        }
    }
}

private extension Color {
    static let emerald = Color(red: 16/255, green: 185/255, blue: 129/255)
}
