import SwiftUI
import AppKit

public struct SimilarPhotosView: View {
    @Bindable var state: AppState
    @State private var isScanning = false
    @State private var groups: [SimilarPhotoGroup] = []
    @State private var statusMessage: String?
    @State private var showConfirmDeleteAll = false
    @State private var groupToDelete: SimilarPhotoGroup? = nil

    public init(state: AppState) {
        self.state = state
    }

    private var totalReclaimable: Int64 {
        groups.reduce(0) { $0 + $1.reclaimableBytes }
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Subheader
            HStack(spacing: 12) {
                Text("\(groups.count) Visual Duplicate Clusters")
                    .font(.system(size: 12, weight: .semibold))

                Spacer()

                if !groups.isEmpty && totalReclaimable > 0 {
                    Button("Clean All Redundant (\(totalReclaimable.formattedBytes))", role: .destructive) {
                        showConfirmDeleteAll = true
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
                    .disabled(isScanning)
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

            Divider()

            // Toast Message
            if let msg = statusMessage {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle")
                        .foregroundStyle(.secondary)
                    Text(msg)
                        .font(.subheadline)
                    Spacer()
                    Button("Dismiss") { statusMessage = nil }
                        .font(.caption)
                        .buttonStyle(.borderless)
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 8)
                .background(.bar)
                Divider()
            }

            if isScanning {
                VStack(spacing: 12) {
                    ProgressView()
                        .controlSize(.large)
                    Text("Computing perceptual difference hashes (dHash) across image libraries...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if groups.isEmpty {
                StatusStateView(
                    type: .clean(systemImage: "photo.stack"),
                    title: "Photos & Screenshots Clean",
                    subtitle: "No visually redundant duplicate images, burst captures, or resized copies detected.",
                    actionTitle: "Rescan Media",
                    actionIcon: "arrow.clockwise"
                ) {
                    Task { await runScan() }
                }
            } else {
                List {
                    ForEach(groups) { group in
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Text(group.label)
                                    .font(.system(size: 13, weight: .semibold))

                                Spacer()

                                if group.reclaimableBytes > 0 {
                                    Button("Clean Duplicates (\(group.reclaimableBytes.formattedBytes))", role: .destructive) {
                                        groupToDelete = group
                                    }
                                    .buttonStyle(.bordered)
                                    .controlSize(.mini)
                                }
                            }

                            // Items in Cluster
                            ForEach(group.items) { item in
                                HStack(spacing: 12) {
                                    // Thumbnail
                                    PhotoThumbnailView(path: item.path)
                                        .frame(width: 36, height: 36)
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
                                                    .background(Color.secondary.opacity(0.12))
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
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .navigationTitle("Similar Photos")
        .confirmationDialog(
            "Clean Redundant Copies in Cluster?",
            isPresented: Binding(
                get: { groupToDelete != nil },
                set: { if !$0 { groupToDelete = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Clean Copies (\(groupToDelete?.reclaimableBytes.formattedBytes ?? ""))", role: .destructive) {
                if let g = groupToDelete {
                    Task { await deleteDuplicatesInGroup(g) }
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            if let g = groupToDelete {
                Text("This will remove \(g.items.count - 1) duplicate copy while preserving the highest quality original.")
            }
        }
        .confirmationDialog(
            "Clean All Redundant Media?",
            isPresented: $showConfirmDeleteAll,
            titleVisibility: .visible
        ) {
            Button("Clean All (\(totalReclaimable.formattedBytes))", role: .destructive) {
                Task { await deleteAllDuplicates() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will clean redundant copies across all clusters while preserving the best quality version of each image.")
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("BeberesRefreshTriggered"))) { _ in
            Task { await runScan() }
        }
        .task {
            if groups.isEmpty {
                await runScan()
            }
        }
    }

    private func runScan() async {
        isScanning = true
        statusMessage = nil
        groups = await SimilarMediaService.shared.scanSimilarMedia()
        isScanning = false
    }

    private func deleteDuplicatesInGroup(_ group: SimilarPhotoGroup) async {
        let toDelete = group.items.filter { !$0.isRecommendedKeep }.map(\.path)
        let freed = await SimilarMediaService.shared.deleteItems(paths: toDelete, preferTrash: state.deleteToTrash)
        state.recordCleanResult(freedBytes: freed)
        statusMessage = "Cleaned \(toDelete.count) duplicate photos and freed \(freed.formattedBytes)."
        await runScan()
        state.refreshSystemStats()
    }

    private func deleteAllDuplicates() async {
        var toDelete: [String] = []
        for g in groups {
            let redundant = g.items.filter { !$0.isRecommendedKeep }.map(\.path)
            toDelete.append(contentsOf: redundant)
        }
        let freed = await SimilarMediaService.shared.deleteItems(paths: toDelete, preferTrash: state.deleteToTrash)
        state.recordCleanResult(freedBytes: freed)
        statusMessage = "Cleaned \(toDelete.count) duplicate files and freed \(freed.formattedBytes)."
        await runScan()
        state.refreshSystemStats()
    }
}

// MARK: - Native Photo Thumbnail View
private struct PhotoThumbnailView: View {
    let path: String

    var body: some View {
        if let img = NSImage(contentsOfFile: path) {
            Image(nsImage: img)
                .resizable()
                .scaledToFill()
        } else {
            Rectangle()
                .fill(Color.secondary.opacity(0.12))
                .overlay {
                    Image(systemName: "photo")
                        .font(.system(size: 14))
                        .foregroundStyle(.secondary)
                }
        }
    }
}
