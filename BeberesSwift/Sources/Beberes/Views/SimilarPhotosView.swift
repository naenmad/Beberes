import SwiftUI

public struct SimilarPhotosView: View {
    @Bindable var state: AppState
    @State private var isScanning = false
    @State private var duplicateImages: [SimilarMediaGroup] = []
    @State private var statusMessage: String?

    public init(state: AppState) {
        self.state = state
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Standard Native Page Header
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Similar Photos")
                        .font(.title2.weight(.bold))
                    Text("Identify redundant screenshots and duplicate media across Pictures and Desktop.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button {
                    Task { await scanMedia() }
                } label: {
                    Label(isScanning ? "Scanning..." : "Scan Media", systemImage: "photo.stack")
                }
                .disabled(isScanning)
                .buttonStyle(.borderedProminent)
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)
            .padding(.bottom, 16)

            Divider()

            if isScanning {
                VStack(spacing: 12) {
                    ProgressView()
                        .controlSize(.large)
                    Text("Analyzing image libraries and screenshots for redundant captures...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if duplicateImages.isEmpty {
                ContentUnavailableView(
                    "No Similar Photos",
                    systemImage: "photo.stack",
                    description: Text("Scan media to detect duplicate photos or redundant screenshots.")
                )
            } else {
                List {
                    ForEach(duplicateImages) { group in
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text(group.label)
                                    .font(.system(size: 13, weight: .semibold))
                                Spacer()
                                Text("\(group.items.count) items • \(group.wastedBytes.formattedBytes) reclaimable")
                                    .font(.subheadline.monospacedDigit())
                                    .foregroundStyle(.secondary)
                            }

                            ForEach(group.items, id: \.self) { path in
                                HStack {
                                    Image(systemName: "photo")
                                        .foregroundStyle(.secondary)
                                    Text(URL(fileURLWithPath: path).lastPathComponent)
                                        .font(.system(size: 12))
                                    Spacer()
                                    Button {
                                        NSWorkspace.shared.selectFile(path, inFileViewerRootedAtPath: "")
                                    } label: {
                                        Image(systemName: "magnifyingglass")
                                            .font(.system(size: 11))
                                    }
                                    .buttonStyle(.borderless)
                                    .help("Reveal in Finder")
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
                .listStyle(.inset)
            }
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .task {
            if duplicateImages.isEmpty {
                await scanMedia()
            }
        }
    }

    private func scanMedia() async {
        isScanning = true
        let home = FileManager.default.homeDirectoryForCurrentUser
        let searchDirs = [
            home.appendingPathComponent("Pictures"),
            home.appendingPathComponent("Desktop")
        ]

        var sizeMap: [Int64: [String]] = [:]
        let fileManager = FileManager.default
        let imageExtensions: Set<String> = ["png", "jpg", "jpeg", "heic", "webp"]

        for dir in searchDirs {
            guard let enumerator = fileManager.enumerator(
                at: dir,
                includingPropertiesForKeys: [.isRegularFileKey, .fileSizeKey],
                options: [.skipsHiddenFiles, .skipsPackageDescendants]
            ) else { continue }

            var checked = 0
            while let url = enumerator.nextObject() as? URL {
                if imageExtensions.contains(url.pathExtension.lowercased()),
                   let values = try? url.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey]),
                   values.isRegularFile == true,
                   let size = values.fileSize, size > 200_000 { // images > 200KB
                    sizeMap[Int64(size), default: []].append(url.path)
                }
                checked += 1
                if checked > 5000 { break }
            }
        }

        var groups: [SimilarMediaGroup] = []
        for (size, paths) in sizeMap where paths.count > 1 {
            let firstFileName = URL(fileURLWithPath: paths[0]).lastPathComponent
            groups.append(SimilarMediaGroup(
                id: "\(size)_\(paths.count)",
                label: "Identical file size match: \(firstFileName)",
                items: paths,
                fileSizeBytes: size
            ))
        }

        duplicateImages = groups.sorted(by: { $0.wastedBytes > $1.wastedBytes })
        isScanning = false
    }
}

public struct SimilarMediaGroup: Identifiable, Sendable {
    public let id: String
    public let label: String
    public let items: [String]
    public let fileSizeBytes: Int64

    public var wastedBytes: Int64 {
        max(0, Int64(items.count - 1) * fileSizeBytes)
    }
}
