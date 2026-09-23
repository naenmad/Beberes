import SwiftUI

public struct DiskVisualizerView: View {
    @Bindable var state: AppState
    @State private var nodes: [DiskVisualNode] = []
    @State private var isAnalyzing = false
    @State private var totalScannedBytes: Int64 = 0

    public init(state: AppState) {
        self.state = state
    }

    public var body: some View {
        VStack(spacing: 0) {

            if isAnalyzing {
                VStack(spacing: 12) {
                    ProgressView()
                        .controlSize(.large)
                    Text("Calculating directory sizes across user profile...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if nodes.isEmpty {
                StatusStateView(
                    type: .ready(systemImage: "chart.pie"),
                    title: "Ready to Analyze Storage",
                    subtitle: "Scan your primary user profile directories to visualize storage distribution.",
                    actionTitle: "Analyze Home Directory",
                    actionIcon: "arrow.clockwise"
                ) {
                    Task { await analyzeUserStorage() }
                }
            } else {
                VStack(spacing: 16) {
                    // Storage Allocation Bar (macOS System Settings Style)
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("USER DIRECTORIES ALLOCATION")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text(totalScannedBytes.formattedBytes)
                                .font(.subheadline.monospacedDigit().weight(.semibold))
                        }

                        GeometryReader { proxy in
                            HStack(spacing: 2) {
                                ForEach(Array(nodes.enumerated()), id: \.element.id) { index, node in
                                    let ratio = totalScannedBytes > 0 ? CGFloat(node.sizeBytes) / CGFloat(totalScannedBytes) : 0
                                    if ratio > 0.01 {
                                        let opacity = max(0.2, 0.85 - Double(index) * 0.1)
                                        RoundedRectangle(cornerRadius: 2)
                                            .fill(Color.primary.opacity(opacity))
                                            .frame(width: max(4, proxy.size.width * ratio))
                                    }
                                }
                            }
                            .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
                        }
                        .frame(height: 10)
                    }
                    .padding(16)
                    .background(Color(nsColor: .controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .padding(.horizontal, 24)
                    .padding(.top, 14)

                    // Directory list
                    List {
                        ForEach(nodes) { node in
                            HStack(spacing: 12) {
                                Image(systemName: "folder")
                                    .foregroundStyle(.secondary)
                                    .font(.system(size: 14))
                                    .frame(width: 20)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(node.name)
                                        .font(.system(size: 13, weight: .medium))
                                    Text(node.path)
                                        .font(.caption2)
                                        .foregroundStyle(.tertiary)
                                        .lineLimit(1)
                                }

                                Spacer()

                                let percentage = totalScannedBytes > 0 ? (Double(node.sizeBytes) / Double(totalScannedBytes)) * 100 : 0
                                Text(String(format: "%.1f%%", percentage))
                                    .font(.subheadline.monospacedDigit())
                                    .foregroundStyle(.secondary)
                                    .frame(width: 50, alignment: .trailing)

                                Text(node.sizeBytes.formattedBytes)
                                    .font(.subheadline.monospacedDigit().weight(.medium))
                                    .frame(width: 80, alignment: .trailing)

                                Button {
                                    NSWorkspace.shared.selectFile(node.path, inFileViewerRootedAtPath: "")
                                } label: {
                                    Image(systemName: "magnifyingglass")
                                        .font(.system(size: 11))
                                }
                                .buttonStyle(.borderless)
                                .help("Reveal in Finder")
                            }
                            .padding(.vertical, 3)
                        }
                    }
                    .listStyle(.inset)
                }
            }
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .navigationTitle("Disk Visualizer")
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("BeberesRefreshTriggered"))) { _ in
            Task { await analyzeUserStorage() }
        }
        .task {
            if nodes.isEmpty {
                await analyzeUserStorage()
            }
        }
    }

    private func analyzeUserStorage() async {
        isAnalyzing = true
        let home = FileManager.default.homeDirectoryForCurrentUser
        let targetDirs = [
            ("Library", home.appendingPathComponent("Library")),
            ("Developer", home.appendingPathComponent("Developer")),
            ("Downloads", home.appendingPathComponent("Downloads")),
            ("Documents", home.appendingPathComponent("Documents")),
            ("Pictures", home.appendingPathComponent("Pictures")),
            ("Movies", home.appendingPathComponent("Movies")),
            ("Desktop", home.appendingPathComponent("Desktop"))
        ]

        var scannedNodes: [DiskVisualNode] = []
        var total: Int64 = 0

        for (name, url) in targetDirs {
            let size = await calculateDirSize(url)
            if size > 0 {
                scannedNodes.append(DiskVisualNode(name: name, path: url.path, sizeBytes: size))
                total += size
            }
        }

        nodes = scannedNodes.sorted(by: { $0.sizeBytes > $1.sizeBytes })
        totalScannedBytes = total
        isAnalyzing = false
    }

    private func calculateDirSize(_ url: URL) async -> Int64 {
        let fileManager = FileManager.default
        guard let enumerator = fileManager.enumerator(
            at: url,
            includingPropertiesForKeys: [.fileSizeKey],
            options: [.skipsPackageDescendants]
        ) else { return 0 }

        var total: Int64 = 0
        var count = 0
        while let fileURL = enumerator.nextObject() as? URL {
            if let size = try? fileURL.resourceValues(forKeys: [.fileSizeKey]).fileSize {
                total += Int64(size)
            }
            count += 1
            if count > 50000 { break } // Guard against runaway deep traversal
        }
        return total
    }
}

public struct DiskVisualNode: Identifiable, Sendable {
    public var id: String { path }
    public let name: String
    public let path: String
    public let sizeBytes: Int64
}
