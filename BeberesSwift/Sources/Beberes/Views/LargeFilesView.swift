import SwiftUI
import AppKit

public struct LargeFilesView: View {
    @Bindable var state: AppState
    @State private var selectedTab: Int = 0 // 0 = Large Files, 1 = Duplicates
    @State private var fileToTrash: LargeFileItem? = nil
    @State private var showConfirmTrash: Bool = false

    public init(appState: AppState) {
        self.state = appState
    }

    public var body: some View {
        VStack(spacing: 0) {

            // Feedback Message
            if let msg = state.largeFilesToastMessage {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle")
                        .foregroundStyle(.secondary)
                    Text(msg)
                        .font(.subheadline)
                    Spacer()
                    Button("Dismiss") { state.largeFilesToastMessage = nil }
                        .font(.caption)
                        .buttonStyle(.borderless)
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 8)
                .background(.bar)
                Divider()
            }

            if state.isLoadingLargeFiles {
                VStack(spacing: 12) {
                    ProgressView()
                        .controlSize(.large)
                    Text("Scanning files >50MB and matching duplicate hashes...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if selectedTab == 0 {
                // Large Files Tab
                if state.largeFiles.isEmpty {
                    StatusStateView(
                        type: .clean(systemImage: "doc.on.doc"),
                        title: "No Large Files Found",
                        subtitle: "No files larger than 50MB detected across your home directory.",
                        actionTitle: "Rescan Storage",
                        actionIcon: "arrow.clockwise"
                    ) {
                        Task { await state.fetchLargeFiles() }
                    }
                } else {
                    List {
                        ForEach(state.filteredLargeFiles) { file in
                            HStack(spacing: 12) {
                                Image(systemName: file.category.icon)
                                    .font(.system(size: 14))
                                    .foregroundStyle(.secondary)
                                    .frame(width: 20)

                                VStack(alignment: .leading, spacing: 1) {
                                    Text(file.name)
                                        .font(.system(size: 13, weight: .medium))
                                        .lineLimit(1)
                                    Text(file.path)
                                        .font(.caption2)
                                        .foregroundStyle(.tertiary)
                                        .lineLimit(1)
                                }

                                Spacer()

                                Text(file.formattedSize)
                                    .font(.subheadline.monospacedDigit())
                                    .foregroundStyle(.secondary)

                                Button {
                                    state.revealLargeFile(file)
                                } label: {
                                    Image(systemName: "magnifyingglass")
                                        .font(.system(size: 11))
                                }
                                .buttonStyle(.borderless)
                                .help("Reveal in Finder")

                                Button("Trash", role: .destructive) {
                                    fileToTrash = file
                                    showConfirmTrash = true
                                }
                                .buttonStyle(.bordered)
                                .controlSize(.small)
                            }
                            .padding(.vertical, 2)
                        }
                    }
                    .listStyle(.inset)
                }
            } else {
                // Duplicates Tab
                if state.duplicateGroups.isEmpty {
                    StatusStateView(
                        type: .clean(systemImage: "checkmark.seal"),
                        title: "No Duplicates Found",
                        subtitle: "No duplicate files with identical content detected. Storage is clean.",
                        actionTitle: "Rescan Duplicates",
                        actionIcon: "arrow.clockwise"
                    ) {
                        Task { await state.fetchLargeFiles() }
                    }
                } else {
                    List {
                        ForEach(state.duplicateGroups) { group in
                            Section("Identical Content: \(group.items.first?.name ?? "File") (\(group.formattedWastedSize) reclaimable)") {
                                ForEach(group.items) { file in
                                    HStack(spacing: 12) {
                                        Image(systemName: "doc")
                                            .font(.system(size: 13))
                                            .foregroundStyle(.secondary)

                                        VStack(alignment: .leading, spacing: 1) {
                                            Text(file.path)
                                                .font(.caption)
                                                .foregroundStyle(.secondary)
                                                .lineLimit(1)
                                        }

                                        Spacer()

                                        Button {
                                            state.revealLargeFile(file)
                                        } label: {
                                            Image(systemName: "magnifyingglass")
                                                .font(.system(size: 11))
                                        }
                                        .buttonStyle(.borderless)

                                        Button("Trash", role: .destructive) {
                                            fileToTrash = file
                                            showConfirmTrash = true
                                        }
                                        .buttonStyle(.bordered)
                                        .controlSize(.small)
                                    }
                                    .padding(.vertical, 1)
                                }
                            }
                        }
                    }
                    .listStyle(.inset)
                }
            }
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .navigationTitle("Large & Duplicates")
        .toolbar {
            ToolbarItem(placement: .principal) {
                Picker("View", selection: $selectedTab) {
                    Text("Large Files (\(state.largeFiles.count))").tag(0)
                    Text("Duplicates (\(state.duplicateGroups.count))").tag(1)
                }
                .pickerStyle(.segmented)
                .labelsHidden()
                .frame(width: 240)
            }

            ToolbarItem(placement: .primaryAction) {
                Button {
                    Task { await state.fetchLargeFiles() }
                } label: {
                    Label("Rescan", systemImage: "arrow.clockwise")
                }
                .disabled(state.isLoadingLargeFiles)
            }
        }
        .confirmationDialog(
            "Move to Trash?",
            isPresented: $showConfirmTrash,
            titleVisibility: .visible
        ) {
            Button("Move to Trash", role: .destructive) {
                if let file = fileToTrash {
                    Task { await state.trashLargeFile(file) }
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            if let file = fileToTrash {
                Text("Are you sure you want to move '\(file.name)' (\(file.formattedSize)) to the macOS Trash?")
            }
        }
        .task {
            if state.largeFiles.isEmpty && !state.isLoadingLargeFiles {
                await state.fetchLargeFiles()
            }
        }
    }
}
