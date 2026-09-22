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
            // Header Bar
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Tidy Up Clutter")
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                    Text("Organize Desktop and Downloads, and eliminate obsolete disk installers.")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }

                Spacer()

                // Source Folder Picker
                Picker("Folder", selection: $selectedSource) {
                    Text("Downloads").tag(downloadsURL)
                    Text("Desktop").tag(desktopURL)
                }
                .pickerStyle(.segmented)
                .frame(width: 190)
                .onChange(of: selectedSource) {
                    Task { await runScan() }
                }

                Button {
                    Task { await runScan() }
                } label: {
                    Label(isScanning ? "Scanning..." : "Scan Folder", systemImage: "arrow.clockwise")
                }
                .disabled(isScanning || isProcessing)
                .buttonStyle(.bordered)
            }
            .padding(.horizontal, 24)
            .padding(.top, 18)
            .padding(.bottom, 14)

            Divider()

            if isScanning {
                VStack(spacing: 12) {
                    ProgressView()
                        .controlSize(.large)
                    Text("Scanning selected directory for unorganized files...")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let result = scanResult {
                // Summary Cards
                HStack(spacing: 14) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("TOTAL CLUTTER")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.secondary)
                        Text(result.totalBytes.formattedBytes)
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                        Text("\(result.totalFiles) files scattered")
                            .font(.system(size: 10))
                            .foregroundStyle(.secondary)
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(nsColor: .controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                    VStack(alignment: .leading, spacing: 4) {
                        Text("REDUNDANT INSTALLERS")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.secondary)
                        Text(result.redundantInstallersBytes.formattedBytes)
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .foregroundStyle(Color(red: 239/255, green: 68/255, blue: 68/255))
                        Text("\(result.redundantInstallersCount) apps already installed in /Applications")
                            .font(.system(size: 10))
                            .foregroundStyle(.secondary)
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(nsColor: .controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                    // Actions
                    VStack(spacing: 8) {
                        Button {
                            Task { await cleanRedundantInstallers() }
                        } label: {
                            HStack {
                                Image(systemName: "trash")
                                Text("Trash Redundant (\(result.redundantInstallersCount))")
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(Color(red: 239/255, green: 68/255, blue: 68/255))
                        .disabled(result.redundantInstallersCount == 0 || isProcessing)

                        Button {
                            Task { await organizeAll() }
                        } label: {
                            HStack {
                                Image(systemName: "folder.badge.plus")
                                Text("Organize Into Folders")
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        .disabled(result.items.isEmpty || isProcessing)
                    }
                    .frame(width: 220)
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 14)

                if let status = statusMessage {
                    HStack(spacing: 8) {
                        Image(systemName: "info.circle")
                            .foregroundStyle(Color.accentColor)
                        Text(status)
                            .font(.system(size: 11))
                        Spacer()
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Color.accentColor.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    .padding(.horizontal, 24)
                    .padding(.bottom, 8)
                }

                // Category Filter Pills
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(availableCategories, id: \.self) { cat in
                            Button {
                                selectedCategory = cat
                            } label: {
                                Text(cat)
                                    .font(.system(size: 11, weight: selectedCategory == cat ? .bold : .regular))
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 4)
                                    .background(selectedCategory == cat ? Color.accentColor : Color.secondary.opacity(0.12))
                                    .foregroundStyle(selectedCategory == cat ? .white : .primary)
                                    .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 4)
                }

                // File List
                if filteredItems.isEmpty {
                    VStack(spacing: 8) {
                        Image(systemName: "checkmark.seal")
                            .font(.system(size: 28))
                            .foregroundStyle(Color(red: 16/255, green: 185/255, blue: 129/255))
                        Text("No items found in this category.")
                            .font(.system(size: 13, weight: .medium))
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        ForEach(filteredItems) { item in
                            HStack(spacing: 12) {
                                Image(systemName: categoryIcon(item.category))
                                    .font(.system(size: 14))
                                    .foregroundStyle(item.isRedundantInstaller ? Color(red: 239/255, green: 68/255, blue: 68/255) : Color.accentColor)
                                    .frame(width: 22)

                                VStack(alignment: .leading, spacing: 2) {
                                    HStack(spacing: 6) {
                                        Text(item.name)
                                            .font(.system(size: 12, weight: .medium))
                                            .lineLimit(1)

                                        if item.isRedundantInstaller, let appName = item.installedAppName {
                                            Text("\(appName) installed")
                                                .font(.system(size: 9, weight: .semibold))
                                                .padding(.horizontal, 5)
                                                .padding(.vertical, 1.5)
                                                .background(Color(red: 239/255, green: 68/255, blue: 68/255).opacity(0.15))
                                                .foregroundStyle(Color(red: 239/255, green: 68/255, blue: 68/255))
                                                .clipShape(Capsule())
                                        }
                                    }

                                    Text("Moves to: \(item.targetFolder)/")
                                        .font(.system(size: 10))
                                        .foregroundStyle(.secondary)
                                }

                                Spacer()

                                Text(item.formattedSize)
                                    .font(.system(size: 11, design: .monospaced))
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
                VStack(spacing: 12) {
                    Image(systemName: "folder.badge.gearshape")
                        .font(.system(size: 36))
                        .foregroundStyle(.secondary)
                    Text("Select a folder and click Scan Folder to discover clutter.")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
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
        statusMessage = "Moved \(trashedCount) redundant installers (\(trashedBytes.formattedBytes)) safely to Trash."
        await runScan()
        isProcessing = false
    }

    private func organizeAll() async {
        guard let result = scanResult else { return }
        isProcessing = true
        let nonRedundant = result.items.filter { !$0.isRedundantInstaller }
        let (moved, bytes, _) = await TidyUpService.shared.organizeItems(nonRedundant, sourceDirectory: selectedSource)
        statusMessage = "Organized \(moved) files (\(bytes.formattedBytes)) into categorized folders."
        await runScan()
        isProcessing = false
    }

    private func categoryIcon(_ category: String) -> String {
        switch category {
        case "Screenshots": return "camera.viewfinder"
        case "Redundant Installers": return "shippingbox.fill"
        case "Installers": return "shippingbox"
        case "Archives": return "archivebox"
        case "Documents": return "doc.text"
        case "Media": return "photo"
        default: return "doc"
        }
    }
}
