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
            // Header Bar
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Disk Visualizer")
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                    Text("Visual breakdown of user directories and storage utilization.")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button {
                    Task { await analyzeUserStorage() }
                } label: {
                    Label(isAnalyzing ? "Analyzing Space..." : "Analyze Home Directory", systemImage: "chart.pie.fill")
                }
                .disabled(isAnalyzing)
                .buttonStyle(.borderedProminent)
            }
            .padding(.horizontal, 24)
            .padding(.top, 18)
            .padding(.bottom, 14)

            Divider()

            if isAnalyzing {
                VStack(spacing: 12) {
                    ProgressView()
                        .controlSize(.large)
                    Text("Calculating directory sizes across user profile...")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if nodes.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "chart.pie")
                        .font(.system(size: 36))
                        .foregroundStyle(.secondary)
                    Text("Click Analyze Home Directory to see where storage is consumed.")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                VStack(spacing: 16) {
                    // Total bar
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("USER DIRECTORIES USAGE")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text(totalScannedBytes.formattedBytes)
                                .font(.system(size: 13, weight: .bold, design: .monospaced))
                        }

                        GeometryReader { proxy in
                            HStack(spacing: 2) {
                                ForEach(nodes) { node in
                                    let ratio = totalScannedBytes > 0 ? CGFloat(node.sizeBytes) / CGFloat(totalScannedBytes) : 0
                                    if ratio > 0.02 {
                                        Rectangle()
                                            .fill(node.color)
                                            .frame(width: max(4, proxy.size.width * ratio))
                                    }
                                }
                            }
                            .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                        }
                        .frame(height: 14)
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
                                RoundedRectangle(cornerRadius: 3, style: .continuous)
                                    .fill(node.color)
                                    .frame(width: 8, height: 28)

                                Image(systemName: "folder.fill")
                                    .foregroundStyle(node.color)
                                    .font(.system(size: 14))

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(node.name)
                                        .font(.system(size: 13, weight: .semibold))
                                    Text(node.path)
                                        .font(.system(size: 10))
                                        .foregroundStyle(.secondary)
                                        .lineLimit(1)
                                }

                                Spacer()

                                let percentage = totalScannedBytes > 0 ? (Double(node.sizeBytes) / Double(totalScannedBytes)) * 100 : 0
                                Text(String(format: "%.1f%%", percentage))
                                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                                    .foregroundStyle(.secondary)
                                    .frame(width: 50, alignment: .trailing)

                                Text(node.sizeBytes.formattedBytes)
                                    .font(.system(size: 12, weight: .bold, design: .monospaced))
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
                            .padding(.vertical, 4)
                        }
                    }
                    .listStyle(.inset)
                }
            }
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
            ("Library", home.appendingPathComponent("Library"), Color.purple),
            ("Developer", home.appendingPathComponent("Developer"), Color.blue),
            ("Downloads", home.appendingPathComponent("Downloads"), Color.orange),
            ("Documents", home.appendingPathComponent("Documents"), Color.green),
            ("Pictures", home.appendingPathComponent("Pictures"), Color.pink),
            ("Movies", home.appendingPathComponent("Movies"), Color.indigo),
            ("Desktop", home.appendingPathComponent("Desktop"), Color.teal)
        ]

        var scannedNodes: [DiskVisualNode] = []
        var total: Int64 = 0

        for (name, url, color) in targetDirs {
            let size = await calculateDirSize(url)
            if size > 0 {
                scannedNodes.append(DiskVisualNode(name: name, path: url.path, sizeBytes: size, color: color))
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
    public let color: Color
}
