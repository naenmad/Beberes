import SwiftUI
import AppKit

public enum TidyFolder: String, CaseIterable, Identifiable, Sendable {
    case downloads = "Downloads"
    case desktop = "Desktop"
    case maintenance = "Empty & Broken"

    public var id: String { rawValue }

    public var url: URL {
        let home = FileManager.default.homeDirectoryForCurrentUser
        switch self {
        case .downloads:
            return home.appendingPathComponent("Downloads")
        case .desktop:
            return home.appendingPathComponent("Desktop")
        case .maintenance:
            return home
        }
    }
}

public struct TidyUpView: View {
    @Bindable var state: AppState
    @State private var selectedFolder: TidyFolder = .downloads
    @State private var scanResult: TidyScanResult?
    @State private var maintenanceResult: MaintenanceScanResult?
    @State private var isScanning = false
    @State private var isProcessing = false
    @State private var statusMessage: String?
    @State private var selectedCategory: String = "All"
    @State private var showConfirmMaintenanceClean = false

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
            subHeaderBar
            Divider()

            if let msg = statusMessage {
                toastBar(message: msg)
                Divider()
            }

            mainContent
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .navigationTitle("Tidy Up")
        .confirmationDialog(
            "Clean \(maintenanceResult?.totalCount ?? 0) Maintenance Items?",
            isPresented: $showConfirmMaintenanceClean,
            titleVisibility: .visible
        ) {
            Button("Clean Items", role: .destructive) {
                Task { await cleanMaintenanceItems() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will remove empty directories and broken symbolic links across user folders.")
        }
        .onChange(of: selectedFolder) {
            Task { await runScan() }
        }
        .task {
            if scanResult == nil && maintenanceResult == nil {
                await runScan()
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("BeberesRefreshTriggered"))) { _ in
            Task { await runScan() }
        }
    }

    // MARK: - Subviews
    private var subHeaderBar: some View {
        HStack(spacing: 12) {
            Picker("Target Folder", selection: $selectedFolder) {
                ForEach(TidyFolder.allCases) { folder in
                    Text(folder.rawValue).tag(folder)
                }
            }
            .pickerStyle(.segmented)
            .labelsHidden()
            .frame(width: 320)

            Spacer()

            if selectedFolder == .maintenance {
                if let res = maintenanceResult, res.totalCount > 0 {
                    Button("Clean \(res.totalCount) Items", role: .destructive) {
                        showConfirmMaintenanceClean = true
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
                    .disabled(isScanning || isProcessing)
                }
            }

            Button {
                Task { await runScan() }
            } label: {
                Label("Rescan", systemImage: "arrow.clockwise")
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
            .disabled(isScanning || isProcessing)
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

    @ViewBuilder
    private var mainContent: some View {
        if isScanning {
            loadingView
        } else if selectedFolder == .maintenance {
            maintenanceContent
        } else if let result = scanResult, !result.items.isEmpty {
            tidyResultContent(result: result)
        } else {
            folderCleanView
        }
    }

    private var loadingView: some View {
        VStack(spacing: 12) {
            ProgressView()
                .controlSize(.large)
            Text(selectedFolder == .maintenance ? "Scanning for empty folders and broken symlinks..." : "Analyzing \(selectedFolder.rawValue)...")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private var maintenanceContent: some View {
        if let res = maintenanceResult, res.totalCount > 0 {
            List {
                if !res.brokenSymlinks.isEmpty {
                    Section("Broken Symbolic Links (\(res.brokenSymlinks.count))") {
                        ForEach(res.brokenSymlinks) { item in
                            maintenanceItemRow(item: item)
                        }
                    }
                }

                if !res.emptyFolders.isEmpty {
                    Section("Empty Folders (\(res.emptyFolders.count))") {
                        ForEach(res.emptyFolders) { item in
                            maintenanceItemRow(item: item)
                        }
                    }
                }
            }
            .listStyle(.inset)
        } else {
            StatusStateView(
                type: .clean(systemImage: "link.badge.plus"),
                title: "Filesystem Trees Clean",
                subtitle: "No broken symlinks or empty directories detected in user directories.",
                actionTitle: "Rescan Filesystem",
                actionIcon: "arrow.clockwise"
            ) {
                Task { await runScan() }
            }
        }
    }

    private func maintenanceItemRow(item: MaintenanceItem) -> some View {
        HStack(spacing: 12) {
            Image(systemName: item.kind.iconName)
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
                .frame(width: 20)

            VStack(alignment: .leading, spacing: 1) {
                Text(item.name)
                    .font(.system(size: 13, weight: .medium))
                Text(item.details)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .lineLimit(1)
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

    private func tidyResultContent(result: TidyScanResult) -> some View {
        VStack(spacing: 0) {
            organizationBar(result: result)
            Divider()
            itemsList
        }
    }

    private func organizationBar(result: TidyScanResult) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("\(result.totalFiles) loose files (\(result.totalBytes.formattedBytes))")
                    .font(.headline)

                if result.redundantInstallersCount > 0 {
                    Text("\(result.redundantInstallersCount) redundant installers (\(result.redundantInstallersBytes.formattedBytes))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
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
                Button("Trash Installers (\(result.redundantInstallersBytes.formattedBytes))", role: .destructive) {
                    Task { await cleanRedundantInstallers() }
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
                .disabled(isProcessing)
            }

            Button {
                Task { await organizeAll() }
            } label: {
                Label("Organize All", systemImage: "folder.badge.gearshape")
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.small)
            .disabled(isProcessing)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 10)
        .background(Color(nsColor: .controlBackgroundColor).opacity(0.3))
    }

    private var itemsList: some View {
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

                            if item.isRedundantInstaller {
                                Text("Installer")
                                    .font(.caption2)
                                    .padding(.horizontal, 5)
                                    .padding(.vertical, 1)
                                    .background(Color.secondary.opacity(0.12))
                                    .clipShape(Capsule())
                            }
                        }

                        Text(item.category)
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

    private var folderCleanView: some View {
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

    // MARK: - Actions
    private func runScan() async {
        isScanning = true
        statusMessage = nil

        if selectedFolder == .maintenance {
            maintenanceResult = await MaintenanceService.shared.scanMaintenanceItems()
        } else {
            scanResult = await TidyUpService.shared.scan(sourceDirectory: selectedFolder.url)
            selectedCategory = "All"
        }

        isScanning = false
    }

    private func cleanMaintenanceItems() async {
        guard let res = maintenanceResult else { return }
        isProcessing = true
        let allItems = res.emptyFolders + res.brokenSymlinks
        let cleaned = await MaintenanceService.shared.cleanItems(allItems, preferTrash: state.deleteToTrash)
        statusMessage = "Cleaned \(cleaned) empty folders and broken symlinks."
        await runScan()
        isProcessing = false
    }

    private func cleanRedundantInstallers() async {
        guard let result = scanResult else { return }
        isProcessing = true
        let redundantItems = result.items.filter { $0.isRedundantInstaller }
        var trashedCount = 0
        var trashedBytes: Int64 = 0

        for item in redundantItems {
            do {
                try TrashService.shared.remove(at: item.path, preferTrash: state.deleteToTrash)
                trashedCount += 1
                trashedBytes += item.sizeBytes
            } catch {}
        }

        state.lifetimeFreedBytes += trashedBytes
        statusMessage = state.deleteToTrash
            ? "Moved \(trashedCount) redundant installers (\(trashedBytes.formattedBytes)) to Trash."
            : "Permanently deleted \(trashedCount) redundant installers (\(trashedBytes.formattedBytes))."
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
