import SwiftUI

public struct SystemCleanView: View {
    @Bindable var state: AppState

    public init(state: AppState) {
        self.state = state
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Standard Native Page Header
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("System Clean")
                        .font(.title2.weight(.bold))
                    Text("Purgeable caches, temporary logs, and diagnostic files.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button {
                    Task { await state.scanSystemCategories() }
                } label: {
                    Label("Rescan", systemImage: "arrow.clockwise")
                }
                .buttonStyle(.bordered)
                .disabled(state.isLoadingSystemClean)

                let selectedBytes = state.cleanCategories
                    .filter { state.selectedCategoryIDs.contains($0.id) }
                    .reduce(0) { $0 + $1.sizeBytes }

                Button {
                    Task { await state.cleanSelectedCategories() }
                } label: {
                    Label("Clean (\(selectedBytes.formattedBytes))", systemImage: "sparkles")
                }
                .buttonStyle(.borderedProminent)
                .disabled(state.isLoadingSystemClean || state.selectedCategoryIDs.isEmpty)
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)
            .padding(.bottom, 16)

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
                    Text("Analyzing system caches and logs...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(state.cleanCategories, id: \.id) { (cat: CleanCategory) in
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
                                Text(cat.title)
                                    .font(.system(size: 13, weight: .medium))
                                Text(cat.detail)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            Text(cat.formattedSize)
                                .font(.subheadline.monospacedDigit())
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 3)
                    }
                }
                .listStyle(.inset)
            }
        }
        .background(Color(nsColor: .windowBackgroundColor))
    }
}
