import SwiftUI

public enum TidyFolder: String, CaseIterable, Identifiable, Sendable {
    case downloads = "Downloads"
    case desktop = "Desktop"

    public var id: String { rawValue }

    public var url: URL {
        let home = FileManager.default.homeDirectoryForCurrentUser
        switch self {
        case .downloads:
            return home.appendingPathComponent("Downloads")
        case .desktop:
            return home.appendingPathComponent("Desktop")
        }
    }
}

public struct TidyUpView: View {
    @Bindable var state: AppState
    @State private var selectedFolder: TidyFolder = .downloads
    @State private var scanResult: TidyScanResult?
    @State private var isScanning = false
    @State private var isProcessing = false
    @State private var statusMessage: String?
    @State private var selectedCategory: String = "All"

    public init(state: AppState) {
        self.state = state
    }

    private var filteredItems: [TidyItem] {
        guard let items = scanResult?.items else { return [] }
        if selectedCategory == "All" {
            return items
        }
        return items.filter { $0.category == selectedCategory }
    }

    private var availableCategories: [String] {
        guard let items = scanResult?.items, !items.isEmpty else { return ["All"] }
        let categories = Set(items.map { $0.category })
        return ["All"] + categories.sorted()
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Status Feedback Toast
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
                    Text("Scanning \(selectedFolder.rawValue)...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let result = scanResult, !result.items.isEmpty {
                // Summary Action Bar (Only shown when items exist)
                HStack(spacing: 18) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Clutter Found")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text("\(result.totalBytes.formattedBytes) (\(result.items.count) files)")
                            .font(.subheadline.monospacedDigit().weight(.semibold))
                    }

                    if result.redundantInstallersCount > 0 {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Redundant Installers")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text("\(result.redundantInstallersCount) files (\(result.redundantInstallersBytes.formattedBytes))")
                                .font(.subheadline.monospacedDigit().weight(.semibold))
                        }
                    }

                    Spacer()

                    if availableCategories.count > 2 {
                        Picker("Category", selection: $selectedCategory) {
                            ForEach(availableCategories, id: \.self) { cat in
                                Text(cat).tag(cat)
                            }
                        }
                        .labelsHidden()
                        .frame(width: 130)
                    }

                    if result.redundantInstallersCount > 0 {
                        Button("Trash Redundant (\(result.redundantInstallersBytes.formattedBytes))", role: .destructive) {
                            Task { await cleanRedundantInstallers() }
                        }
                        .buttonStyle(.bordered)
                        .disabled(isProcessing)
                    }

                    Button("Organize Into Folders") {
                        Task { await organizeAll() }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(isProcessing)
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 10)
                .background(Color(nsColor: .controlBackgroundColor))

                Divider()

                if filteredItems.isEmpty {
                    StatusStateView(
                        type: .clean(systemImage: "folder"),
                        title: "No Files in \(selectedCategory)",
                        subtitle: "No items match the '\(selectedCategory)' category filter.",
                        actionTitle: "Show All Categories",
                        actionIcon: "xmark.circle"
                    ) {
                        selectedCategory = "All"
                    }
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
                                            Text("Installed: \(appName)")
                                                .font(.caption2)
                                                .foregroundStyle(.secondary)
                                        }
                                    }

                                    Text("Moves to: \(item.targetFolder)/ • Category: \(item.category)")
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
                            .padding(.vertical, 3)
                        }
                    }
                    .listStyle(.inset)
                }
            } else {
                // Folder is clean empty state
                StatusStateView(
                    type: .clean(systemImage: "folder.badge.checkmark"),
                    title: "\(selectedFolder.rawValue) is Organised",
                    subtitle: "All loose files in your \(selectedFolder.rawValue) folder are already organized. No clutter detected.",
                    actionTitle: selectedFolder == .downloads ? "Switch to Desktop" : "Switch to Downloads",
                    actionIcon: "arrow.left.arrow.right"
                ) {
                    selectedFolder = selectedFolder == .downloads ? .desktop : .downloads
                }
            }
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .navigationTitle("Tidy Up")
        .toolbar {
            ToolbarItem(placement: .principal) {
                Picker("Target Folder", selection: $selectedFolder) {
                    ForEach(TidyFolder.allCases) { folder in
                        Text(folder.rawValue).tag(folder)
                    }
                }
                .pickerStyle(.segmented)
                .labelsHidden()
                .frame(width: 180)
            }

            ToolbarItem(placement: .primaryAction) {
                Button {
                    Task { await runScan() }
                } label: {
                    Label("Rescan", systemImage: "arrow.clockwise")
                }
                .disabled(isScanning || isProcessing)
            }
        }
        .onChange(of: selectedFolder) {
            Task { await runScan() }
        }
        .task {
            if scanResult == nil {
                await runScan()
            }
        }
    }

    private func runScan() async {
        isScanning = true
        statusMessage = nil
        let res = await TidyUpService.shared.scan(sourceDirectory: selectedFolder.url)
        scanResult = res
        selectedCategory = "All"
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
                // Skip if error
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
        let (moved, _, _) = await TidyUpService.shared.organizeItems(nonRedundant, sourceDirectory: selectedFolder.url)
        statusMessage = "Organized \(moved) files into folders."
        await runScan()
        isProcessing = false
    }
}
