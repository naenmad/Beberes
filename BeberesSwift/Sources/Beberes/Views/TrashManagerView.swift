import SwiftUI

public struct TrashManagerView: View {
    @Bindable var state: AppState
    @State private var showConfirmEmptyTrash: Bool = false
    @State private var itemToDelete: TrashItem? = nil

    public init(appState: AppState) {
        self.state = appState
    }

    public var body: some View {
        VStack(spacing: 0) {

            // Toast Message
            if let msg = state.trashToastMessage {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle")
                        .foregroundStyle(.secondary)
                    Text(msg)
                        .font(.subheadline)
                    Spacer()
                    Button("Dismiss") { state.trashToastMessage = nil }
                        .font(.caption)
                        .buttonStyle(.borderless)
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 8)
                .background(.bar)
                Divider()
            }

            if state.isLoadingTrash {
                VStack(spacing: 12) {
                    ProgressView()
                        .controlSize(.large)
                    Text("Scanning Trash...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if state.trashItems.isEmpty {
                StatusStateView(
                    type: .clean(systemImage: "trash"),
                    title: "Trash is Empty",
                    subtitle: "There are no deleted items waiting in the macOS Trash. Your storage is clean.",
                    actionTitle: "Refresh",
                    actionIcon: "arrow.clockwise"
                ) {
                    Task { await state.fetchTrashItems() }
                }
            } else {
                List {
                    ForEach(state.trashItems) { item in
                        HStack(spacing: 12) {
                            Image(systemName: item.isDirectory ? "folder" : "doc")
                                .font(.system(size: 14))
                                .foregroundStyle(.secondary)
                                .frame(width: 20)

                            VStack(alignment: .leading, spacing: 1) {
                                Text(item.name)
                                    .font(.system(size: 13, weight: .medium))
                                    .lineLimit(1)

                                Text(item.path)
                                    .font(.caption2)
                                    .foregroundStyle(.tertiary)
                                    .lineLimit(1)
                            }

                            Spacer()

                            Text(item.formattedSize)
                                .font(.subheadline.monospacedDigit())
                                .foregroundStyle(.secondary)

                            Button {
                                state.revealTrashItem(item)
                            } label: {
                                Image(systemName: "magnifyingglass")
                                    .font(.system(size: 11))
                            }
                            .buttonStyle(.borderless)
                            .help("Reveal in Finder")

                            Button("Delete", role: .destructive) {
                                itemToDelete = item
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        }
                        .padding(.vertical, 2)
                    }
                }
                .listStyle(.inset)
            }
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .navigationTitle("Trash Manager")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                let totalSize = state.trashItems.reduce(0) { $0 + $1.sizeBytes }

                Button("Empty Trash (\(totalSize.formattedBytes))", role: .destructive) {
                    showConfirmEmptyTrash = true
                }
                .disabled(state.trashItems.isEmpty || state.isLoadingTrash)
            }

            ToolbarItem(placement: .primaryAction) {
                Button {
                    Task { await state.fetchTrashItems() }
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }
                .disabled(state.isLoadingTrash)
            }
        }
        .confirmationDialog(
            "Empty Trash?",
            isPresented: $showConfirmEmptyTrash,
            titleVisibility: .visible
        ) {
            Button("Empty Trash Permanently", role: .destructive) {
                Task { await state.emptyAllTrash() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This action permanently removes all items in the macOS Trash. It cannot be undone.")
        }
        .confirmationDialog(
            "Delete \(itemToDelete?.name ?? "Item")?",
            isPresented: Binding(
                get: { itemToDelete != nil },
                set: { if !$0 { itemToDelete = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Delete Permanently", role: .destructive) {
                if let item = itemToDelete {
                    Task { await state.deleteTrashItemPermanently(item) }
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Permanently delete this item? This action cannot be undone.")
        }
        .task {
            if state.trashItems.isEmpty && !state.isLoadingTrash {
                await state.fetchTrashItems()
            }
        }
    }
}
