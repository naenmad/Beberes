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
            // Header Bar
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 8) {
                        Text("Large & Duplicate Files")
                            .font(.system(size: 22, weight: .bold))

                        let count = state.largeFiles.count
                        Text("\(count) Large Files")
                            .font(.system(size: 10, weight: .bold))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.blue.opacity(0.15))
                            .foregroundColor(.blue)
                            .cornerRadius(4)
                    }

                    Text("Detect oversized videos, installers, disk images, and duplicate copies in your home folders.")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }

                Spacer()

                // Tab Switcher
                Picker("", selection: $selectedTab) {
                    Text("Large Files (\(state.largeFiles.count))").tag(0)
                    Text("Duplicates (\(state.duplicateGroups.count))").tag(1)
                }
                .pickerStyle(.segmented)
                .frame(width: 250)

                Button {
                    Task { await state.fetchLargeFiles() }
                } label: {
                    Label("Scan", systemImage: "arrow.clockwise")
                }
                .buttonStyle(.bordered)
                .disabled(state.isLoadingLargeFiles)
            }
            .padding(20)
            .background(Color(nsColor: .controlBackgroundColor))

            Divider()

            // Filter Categories (for Large Files tab)
            if selectedTab == 0 {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(FileCategory.allCases) { cat in
                            Button {
                                state.selectedLargeCategory = cat
                            } label: {
                                HStack(spacing: 5) {
                                    Image(systemName: cat.icon)
                                        .font(.system(size: 11))
                                    Text(cat.rawValue)
                                        .font(.system(size: 12, weight: state.selectedLargeCategory == cat ? .semibold : .regular))
                                }
                                .padding(.horizontal, 10)
                                .padding(.vertical, 5)
                                .background(
                                    state.selectedLargeCategory == cat
                                        ? Color.blue.opacity(0.18)
                                        : Color.secondary.opacity(0.08)
                                )
                                .foregroundColor(state.selectedLargeCategory == cat ? .blue : .primary)
                                .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 8)
                }
                .background(Color(nsColor: .windowBackgroundColor))

                Divider()
            }

            // Main Content Area
            if state.isLoadingLargeFiles {
                VStack(spacing: 16) {
                    ProgressView()
                    Text("Scanning user storage for large files and duplicates...")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if selectedTab == 0 {
                // Large Files List
                if state.filteredLargeFiles.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 40))
                            .foregroundStyle(.green)
                        Text("No large files found")
                            .font(.system(size: 15, weight: .semibold))
                        Text("There are no files larger than 50 MB in your user folders.")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        ForEach(state.filteredLargeFiles) { file in
                            HStack(spacing: 12) {
                                Image(systemName: file.category.icon)
                                    .font(.system(size: 18))
                                    .foregroundStyle(iconColor(for: file.category))
                                    .frame(width: 28)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(file.name)
                                        .font(.system(size: 13, weight: .medium))
                                        .lineLimit(1)

                                    Text(file.path)
                                        .font(.system(size: 10))
                                        .foregroundStyle(.tertiary)
                                        .lineLimit(1)
                                        .truncationMode(.middle)
                                }

                                Spacer()

                                Text(file.formattedSize)
                                    .font(.system(size: 12, weight: .bold, design: .rounded))

                                Button {
                                    state.revealLargeFile(file)
                                } label: {
                                    Image(systemName: "magnifyingglass.circle")
                                        .foregroundStyle(.secondary)
                                }
                                .buttonStyle(.plain)
                                .help("Reveal in Finder")

                                Button {
                                    fileToTrash = file
                                    showConfirmTrash = true
                                } label: {
                                    Image(systemName: "trash")
                                        .foregroundStyle(.red)
                                }
                                .buttonStyle(.plain)
                                .help("Move file to Trash")
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    .listStyle(.inset)
                }
            } else {
                // Duplicates List
                if state.duplicateGroups.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "doc.on.doc")
                            .font(.system(size: 40))
                            .foregroundStyle(.secondary)
                        Text("No duplicate files detected")
                            .font(.system(size: 15, weight: .semibold))
                        Text("Your storage does not have identical duplicate files in user directories.")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        ForEach(state.duplicateGroups) { group in
                            Section {
                                ForEach(Array(group.items.enumerated()), id: \.element.id) { index, item in
                                    HStack(spacing: 12) {
                                        Text(index == 0 ? "MASTER" : "COPY")
                                            .font(.system(size: 9, weight: .bold))
                                            .padding(.horizontal, 5)
                                            .padding(.vertical, 2)
                                            .background(index == 0 ? Color.green.opacity(0.15) : Color.orange.opacity(0.15))
                                            .foregroundColor(index == 0 ? .green : .orange)
                                            .cornerRadius(4)

                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(item.name)
                                                .font(.system(size: 13, weight: .medium))
                                            Text(item.path)
                                                .font(.system(size: 10))
                                                .foregroundStyle(.tertiary)
                                                .lineLimit(1)
                                                .truncationMode(.middle)
                                        }

                                        Spacer()

                                        Button {
                                            state.revealLargeFile(item)
                                        } label: {
                                            Image(systemName: "magnifyingglass.circle")
                                                .foregroundStyle(.secondary)
                                        }
                                        .buttonStyle(.plain)

                                        if index > 0 {
                                            Button {
                                                fileToTrash = item
                                                showConfirmTrash = true
                                            } label: {
                                                Image(systemName: "trash")
                                                    .foregroundStyle(.red)
                                            }
                                            .buttonStyle(.plain)
                                            .help("Trash duplicate copy")
                                        }
                                    }
                                    .padding(.vertical, 2)
                                }
                            } header: {
                                HStack {
                                    Text("\(group.items.first?.name ?? "Duplicate") (\(group.items.count) files)")
                                        .font(.system(size: 12, weight: .bold))
                                    Spacer()
                                    Text("Wasting \(group.formattedWastedSize)")
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundStyle(.orange)
                                }
                            }
                        }
                    }
                    .listStyle(.inset)
                }
            }
        }
        .task {
            if state.largeFiles.isEmpty {
                await state.fetchLargeFiles()
            }
        }
        .confirmationDialog(
            "Move \(fileToTrash?.name ?? "File") to Trash?",
            isPresented: $showConfirmTrash,
            presenting: fileToTrash
        ) { item in
            Button("Move to Trash", role: .destructive) {
                Task { await state.trashLargeFile(item) }
            }
            Button("Cancel", role: .cancel) {}
        } message: { item in
            Text("This will move the file at \(item.path) (\(item.formattedSize)) to macOS Trash. You can recover it if needed.")
        }
        .overlay(alignment: .bottom) {
            if let toast = state.largeFilesToastMessage {
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
                            state.largeFilesToastMessage = nil
                        }
                    }
            }
        }
    }

    private func iconColor(for category: FileCategory) -> Color {
        switch category {
        case .videos: return .purple
        case .archives: return .orange
        case .installers: return .blue
        case .images: return .teal
        case .audio: return .pink
        case .documents: return .indigo
        default: return .secondary
        }
    }
}
