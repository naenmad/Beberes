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
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 8) {
                        Text("Trash Manager")
                            .font(.system(size: 22, weight: .bold))

                        let totalSize = state.trashItems.reduce(0) { $0 + $1.sizeBytes }
                        Text(totalSize.formattedBytes)
                            .font(.system(size: 11, weight: .bold))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.red.opacity(0.15))
                            .foregroundColor(.red)
                            .cornerRadius(4)
                    }

                    Text("Inspect files sitting in ~/.Trash and permanently reclaim disk space.")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button {
                    Task { await state.fetchTrashItems() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
                .buttonStyle(.bordered)
                .help("Refresh Trash")

                Button("Empty Trash") {
                    showConfirmEmptyTrash = true
                }
                .buttonStyle(.borderedProminent)
                .tint(.red)
                .disabled(state.trashItems.isEmpty || state.isLoadingTrash)
            }
            .padding(20)
            .background(Color(nsColor: .controlBackgroundColor))

            Divider()

            // Content
            if state.isLoadingTrash {
                VStack(spacing: 16) {
                    ProgressView()
                    Text("Scanning macOS Trash...")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if state.trashItems.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "trash.slash")
                        .font(.system(size: 40))
                        .foregroundStyle(.secondary)
                    Text("Trash is completely empty")
                        .font(.system(size: 15, weight: .semibold))
                    Text("No lingering files found in your macOS Trash folder.")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(state.trashItems) { item in
                        HStack(spacing: 12) {
                            Image(systemName: item.isDirectory ? "folder.fill" : "doc.fill")
                                .font(.system(size: 18))
                                .foregroundStyle(item.isDirectory ? Color.blue : Color.secondary)
                                .frame(width: 24)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.name)
                                    .font(.system(size: 13, weight: .medium))
                                    .lineLimit(1)

                                Text(item.path)
                                    .font(.system(size: 10))
                                    .foregroundStyle(.tertiary)
                                    .lineLimit(1)
                                    .truncationMode(.middle)
                            }

                            Spacer()

                            Text(item.formattedSize)
                                .font(.system(size: 12, weight: .semibold, design: .rounded))

                            Button {
                                state.revealTrashItem(item)
                            } label: {
                                Image(systemName: "magnifyingglass.circle")
                                    .foregroundStyle(.secondary)
                            }
                            .buttonStyle(.plain)
                            .help("Reveal in Finder")

                            Button {
                                itemToDelete = item
                            } label: {
                                Image(systemName: "xmark.circle")
                                    .foregroundStyle(.red)
                            }
                            .buttonStyle(.plain)
                            .help("Delete permanently now")
                        }
                        .padding(.vertical, 4)
                    }
                }
                .listStyle(.inset)
            }
        }
        .task {
            if state.trashItems.isEmpty {
                await state.fetchTrashItems()
            }
        }
        .confirmationDialog(
            "Empty Trash permanently?",
            isPresented: $showConfirmEmptyTrash
        ) {
            Button("Empty Trash", role: .destructive) {
                Task { await state.emptyAllTrash() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("All \(state.trashItems.count) items in macOS Trash will be permanently deleted and cannot be recovered.")
        }
        .confirmationDialog(
            "Permanently delete \(itemToDelete?.name ?? "item")?",
            isPresented: Binding(
                get: { itemToDelete != nil },
                set: { if !$0 { itemToDelete = nil } }
            ),
            presenting: itemToDelete
        ) { item in
            Button("Delete Permanently", role: .destructive) {
                Task { await state.deleteTrashItemPermanently(item) }
            }
            Button("Cancel", role: .cancel) {}
        } message: { item in
            Text("This item will be permanently removed from disk.")
        }
        .overlay(alignment: .bottom) {
            if let toast = state.trashToastMessage {
                Text(toast)
                    .font(.system(size: 12, weight: .medium))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(.ultraThinMaterial)
                    .cornerRadius(8)
                    .shadow(radius: 4)
                    .padding(.bottom, 20)
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                            state.trashToastMessage = nil
                        }
                    }
            }
        }
    }
}
