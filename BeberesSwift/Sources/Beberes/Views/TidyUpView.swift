import SwiftUI

public struct TidyUpView: View {
    @Bindable var state: AppState
    @State private var selectedSource: URL = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first!
    @State private var scanResult: TidyScanResult?
    @State private var isScanning = false
    @State private var isProcessing = false
    @State private var statusMessage: String?
    @State private var selectedCategory: String = "All"

    public init(state: AppState) {
        self.state = state
    }

    private var downloadsURL: URL {
        FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first ?? URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Downloads")
    }

    private var desktopURL: URL {
        FileManager.default.urls(for: .desktopDirectory, in: .userDomainMask).first ?? URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Desktop")
    }

    private var filteredItems: [TidyItem] {
        guard let items = scanResult?.items else { return [] }
        if selectedCategory == "All" {
            return items
        }
        return items.filter { $0.category == selectedCategory }
    }

    private var availableCategories: [String] {
        guard let items = scanResult?.items else { return ["All"] }
        let categories = Set(items.map { $0.category })
        return ["All"] + categories.sorted()
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Standard Native Page Header
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Tidy Up")
                        .font(.title2.weight(.bold))
                    Text("Organize Desktop and Downloads, and eliminate obsolete disk installers.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Picker("Folder", selection: $selectedSource) {
                    Text("Downloads").tag(downloadsURL)
                    Text("Desktop").tag(desktopURL)
                }
                .pickerStyle(.segmented)
                .frame(width: 180)
                .onChange(of: selectedSource) {
                    Task { await runScan() }
                }

                Button {
                    Task { await runScan() }
                } label: {
                    Label("Rescan", systemImage: "arrow.clockwise")
                }
                .buttonStyle(.bordered)
                .disabled(isScanning || isProcessing)
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)
            .padding(.bottom, 16)

            Divider()

            // Status message
            if let status = statusMessage {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle")
                        .foregroundStyle(.secondary)
                    Text(status)
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
                    Text("Analyzing files in folder...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let result = scanResult {
                // Summary Bar
                HStack(spacing: 20) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Clutter Found")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(result.totalBytes.formattedBytes)
                            .font(.headline.monospacedDigit())
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Redundant Installers")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text("\(result.redundantInstallersCount) files (\(result.redundantInstallersBytes.formattedBytes))")
                            .font(.headline.monospacedDigit())
                    }

                    Spacer()

                    Picker("Category", selection: $selectedCategory) {
                        ForEach(availableCategories, id: \.self) { cat in
                            Text(cat).tag(cat)
                        }
                    }
                    .frame(width: 140)

                    if result.redundantInstallersCount > 0 {
                        Button("Trash Redundant (\(result.redundantInstallersBytes.formattedBytes))", role: .destructive) {
                            Task { await cleanRedundantInstallers() }
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(isProcessing)
                    }

                    Button("Organize Into Folders") {
                        Task { await organizeAll() }
                    }
                    .buttonStyle(.bordered)
                    .disabled(result.items.isEmpty || isProcessing)
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 10)
                .background(Color(nsColor: .controlBackgroundColor))

                Divider()

                if filteredItems.isEmpty {
                    ContentUnavailableView(
                        "No Items in Category",
                        systemImage: "folder",
                        description: Text("No files match the selected category.")
                    )
                } else {
                    List {
                        ForEach(filteredItems) { item in
                            HStack(spacing: 12) {
                                Image(systemName: item.isRedundantInstaller ? "shippingbox" : "doc")
                                    .font(.system(size: 14))
                                    .foregroundStyle(.secondary)
                                    .frame(width: 20)

                                VStack(alignment: .leading, spacing: 1) {
                                    HStack(spacing: 6) {
                                        Text(item.name)
                                            .font(.system(size: 13, weight: .medium))
                                            .lineLimit(1)

                                        if item.isRedundantInstaller, let appName = item.installedAppName {
                                            Text("Already installed: \(appName)")
                                                .font(.caption2)
                                                .foregroundStyle(.secondary)
                                        }
                                    }

                                    Text("Category: \(item.category) • Moves to: \(item.targetFolder)/")
                                        .font(.caption2)
                                        .foregroundStyle(.tertiary)
                                }

                                Spacer()

                                Text(item.formattedSize)
                                    .font(.subheadline.monospacedDigit())
                                    .foregroundStyle(.secondary)

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
                    .listStyle(.inset)
                }
            } else {
                ContentUnavailableView(
                    "Select Folder to Tidy Up",
                    systemImage: "folder.badge.gearshape",
                    description: Text("Scan Downloads or Desktop to discover unorganized clutter and redundant installers.")
                )
            }
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .task {
            if scanResult == nil {
                await runScan()
            }
        }
    }

    private func runScan() async {
        isScanning = true
        statusMessage = nil
        let res = await TidyUpService.shared.scan(sourceDirectory: selectedSource)
        scanResult = res
        isScanning = false
    }

    private func cleanRedundantInstallers() async {
        guard let result = scanResult else { return }
        isProcessing = true
        let redundantItems = result.items.filter { $0.isRedundantInstaller }
        var trashedCount = 0
        var trashedBytes: Int64 = 0

        for item in redundantItems {
            do {
                try TrashService.moveToTrash(at: item.path)
                trashedCount += 1
                trashedBytes += item.sizeBytes
            } catch {
                // Continue
            }
        }

        state.lifetimeFreedBytes += trashedBytes
        statusMessage = "Moved \(trashedCount) redundant installers (\(trashedBytes.formattedBytes)) to Trash."
        await runScan()
        isProcessing = false
    }

    private func organizeAll() async {
        guard let result = scanResult else { return }
        isProcessing = true
        let nonRedundant = result.items.filter { !$0.isRedundantInstaller }
        let (moved, _, _) = await TidyUpService.shared.organizeItems(nonRedundant, sourceDirectory: selectedSource)
        statusMessage = "Organized \(moved) files into folders."
        await runScan()
        isProcessing = false
    }
}
