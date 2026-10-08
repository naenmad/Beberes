import SwiftUI
import AppKit

public struct SimilarPhotosView: View {
    @Bindable var state: AppState
    @State private var isScanning = false
    @State private var groups: [SimilarPhotoGroup] = []
    @State private var selectedPhotoPaths: Set<String> = []
    @State private var statusMessage: String?
    @State private var showConfirmDeleteSelected = false

    public init(state: AppState) {
        self.state = state
    }

    private var selectedBytes: Int64 {
        var total: Int64 = 0
        for group in groups {
            for item in group.items where selectedPhotoPaths.contains(item.path) {
                total += item.sizeBytes
            }
        }
        return total
    }

    private var totalDuplicatesCount: Int {
        groups.reduce(0) { sum, g in
            sum + max(0, g.items.count - 1)
        }
    }

    public var body: some View {
        VStack(spacing: 0) {
            subHeaderBar
            Divider()

            if let msg = statusMessage {
                toastBar(message: msg)
                Divider()
            }

            if isScanning {
                loadingView
            } else if groups.isEmpty {
                emptyView
            } else {
                clustersList
            }
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .navigationTitle("Similar Photos")
        .confirmationDialog(
            "Clean \(selectedPhotoPaths.count) Selected Duplicate Photos?",
            isPresented: $showConfirmDeleteSelected,
            titleVisibility: .visible
        ) {
            Button("Clean Photos (\(selectedBytes.formattedBytes))", role: .destructive) {
                Task { await deleteSelectedPhotos() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            let mode = state.deleteToTrash ? "macOS Trash" : "permanently delete"
            Text("This will move the \(selectedPhotoPaths.count) selected duplicate photos (\(selectedBytes.formattedBytes)) to \(mode). Best quality photos are preserved.")
        }
        .task {
            if groups.isEmpty && !isScanning {
                await runScan()
            }
        }
    }

    // MARK: - Subviews

    private var subHeaderBar: some View {
        HStack(spacing: 12) {
            Text("\(groups.count) Visual Clusters (\(totalDuplicatesCount) Duplicates)")
                .font(.system(size: 12, weight: .semibold))

            Spacer()

            if !groups.isEmpty {
                Button(selectedPhotoPaths.isEmpty ? "Select All Duplicates" : "Deselect All") {
                    if selectedPhotoPaths.isEmpty {
                        autoSelectDuplicates()
                    } else {
                        selectedPhotoPaths.removeAll()
                    }
                }
                .buttonStyle(.bordered)
                .controlSize(.small)

                if !selectedPhotoPaths.isEmpty {
                    Button("Clean Selected (\(selectedBytes.formattedBytes))", role: .destructive) {
                        showConfirmDeleteSelected = true
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
                    .disabled(isScanning)
                }
            }

            Button {
                Task { await runScan() }
            } label: {
                Label(isScanning ? "Scanning..." : "Rescan Media", systemImage: "arrow.clockwise")
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
            .disabled(isScanning)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 8)
        .background(Color(nsColor: .controlBackgroundColor).opacity(0.5))
    }

    private func toastBar(message: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle")
                .foregroundStyle(.secondary)
            Text(message)
                .font(.subheadline)
            Spacer()
            Button("Dismiss") { statusMessage = nil }
                .font(.caption)
                .buttonStyle(.borderless)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 8)
        .background(.bar)
    }

    private var loadingView: some View {
        VStack(spacing: 12) {
            ProgressView()
                .controlSize(.large)
            Text("Computing perceptual difference hashes (dHash) across image libraries...")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var emptyView: some View {
        StatusStateView(
            type: .clean(systemImage: "photo.stack"),
            title: "Photos & Screenshots Clean",
            subtitle: "No visually redundant duplicate images, burst captures, or resized copies detected.",
            actionTitle: "Rescan Media",
            actionIcon: "arrow.clockwise"
        ) {
            Task { await runScan() }
        }
    }

    private var clustersList: some View {
        List {
            ForEach(groups) { group in
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        HStack(spacing: 8) {
                            Text(group.label)
                                .font(.system(size: 13, weight: .semibold))

                            Text("\(group.similarityPercentage)% Match")
                                .font(.system(size: 10, weight: .bold))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 1)
                                .background(Color.accentColor.opacity(0.12))
                                .foregroundStyle(Color.accentColor)
                                .clipShape(Capsule())
                        }

                        Spacer()

                        Button("Select Duplicates in Cluster") {
                            for item in group.items where !item.isRecommendedKeep {
                                selectedPhotoPaths.insert(item.path)
                            }
                        }
                        .buttonStyle(.borderless)
                        .font(.caption)
                    }

                    // Items in Cluster
                    ForEach(group.items) { item in
                        let isSelected = selectedPhotoPaths.contains(item.path)

                        HStack(spacing: 12) {
                            Toggle(isOn: Binding(
                                get: { isSelected },
                                set: { selected in
                                    if selected {
                                        selectedPhotoPaths.insert(item.path)
                                    } else {
                                        selectedPhotoPaths.remove(item.path)
                                    }
                                }
                            )) {
                                EmptyView()
                            }
                            .labelsHidden()

                            // Thumbnail
                            PhotoThumbnailView(path: item.path)
                                .frame(width: 40, height: 40)
                                .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))

                            VStack(alignment: .leading, spacing: 2) {
                                HStack(spacing: 6) {
                                    Text(item.filename)
                                        .font(.system(size: 12, weight: .medium))
                                        .lineLimit(1)

                                    if item.isRecommendedKeep {
                                        Text("Keep (Best Quality)")
                                            .font(.system(size: 10, weight: .semibold))
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 1)
                                            .background(Color.green.opacity(0.15))
                                            .foregroundStyle(.green)
                                            .clipShape(Capsule())
                                    }
                                }

                                HStack(spacing: 8) {
                                    if !item.dimensionsString.isEmpty {
                                        Text(item.dimensionsString)
                                            .font(.caption2.monospacedDigit())
                                            .foregroundStyle(.tertiary)
                                    }

                                    Text(item.formattedSize)
                                        .font(.caption2.monospacedDigit())
                                        .foregroundStyle(.secondary)
                                }
                            }

                            Spacer()

                            Button {
                                NSWorkspace.shared.selectFile(item.path, inFileViewerRootedAtPath: "")
                            } label: {
                                Image(systemName: "magnifyingglass")
                                    .font(.system(size: 11))
                            }
                            .buttonStyle(.borderless)
                            .help("Reveal in Finder")
                        }
                        .padding(.vertical, 2)
                    }
                }
                .padding(.vertical, 6)
            }
        }
        .listStyle(.inset)
    }

    private func autoSelectDuplicates() {
        var toSelect: Set<String> = []
        for g in groups {
            for item in g.items where !item.isRecommendedKeep {
                toSelect.insert(item.path)
            }
        }
        selectedPhotoPaths = toSelect
    }

    private func runScan() async {
        isScanning = true
        defer { isScanning = false }
        let res = await SimilarMediaService.shared.scanSimilarMedia()
        groups = res
        autoSelectDuplicates()
    }

    private func deleteSelectedPhotos() async {
        guard !selectedPhotoPaths.isEmpty else { return }
        let pathsToDelete = Array(selectedPhotoPaths)
        let count = pathsToDelete.count
        let freed = await SimilarMediaService.shared.deleteItems(paths: pathsToDelete, preferTrash: state.deleteToTrash)
        state.recordCleanResult(freedBytes: freed)
        selectedPhotoPaths.removeAll()
        statusMessage = "Removed \(count) duplicate photos (\(freed.formattedBytes) reclaimed)."
        await runScan()
    }
}

// MARK: - Photo Thumbnail View
struct PhotoThumbnailView: View {
    let path: String
    @State private var thumbnail: NSImage?

    var body: some View {
        ZStack {
            if let img = thumbnail {
                Image(nsImage: img)
                    .resizable()
                    .scaledToFill()
            } else {
                Color.secondary.opacity(0.15)
                Image(systemName: "photo")
                    .font(.system(size: 14))
                    .foregroundStyle(.secondary)
            }
        }
        .task {
            loadThumbnail()
        }
    }

    private func loadThumbnail() {
        DispatchQueue.global(qos: .userInitiated).async {
            let url = URL(fileURLWithPath: path)
            guard let src = CGImageSourceCreateWithURL(url as CFURL, nil) else { return }
            let options: [CFString: Any] = [
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceThumbnailMaxPixelSize: 96
            ]
            guard let cgImg = CGImageSourceCreateThumbnailAtIndex(src, 0, options as CFDictionary) else { return }
            let nsImg = NSImage(cgImage: cgImg, size: NSSize(width: 48, height: 48))
            DispatchQueue.main.async {
                self.thumbnail = nsImg
            }
        }
    }
}
