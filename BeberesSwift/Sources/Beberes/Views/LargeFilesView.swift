import SwiftUI
import AppKit

public struct LargeFilesView: View {
    @Bindable var state: AppState
    @State private var selectedTab: Int = 0 // 0 = Large Files, 1 = Duplicates, 2 = Old Files
    @State private var showConfirmDeleteSelected: Bool = false
    @State private var deleteTargetTab: Int = 0

    public init(appState: AppState) {
        self.state = appState
    }

    private var selectedDuplicatesBytes: Int64 {
        var total: Int64 = 0
        for group in state.duplicateGroups {
            for item in group.items where state.selectedDuplicatePaths.contains(item.path) {
                total += item.sizeBytes
            }
        }
        return total
    }

    private var selectedLargeFilesBytes: Int64 {
        state.largeFiles
            .filter { state.selectedLargeFilePaths.contains($0.path) }
            .reduce(Int64(0)) { $0 + $1.sizeBytes }
    }

    private var selectedOldFilesBytes: Int64 {
        state.oldFiles
            .filter { state.selectedOldFilePaths.contains($0.path) }
            .reduce(Int64(0)) { $0 + $1.sizeBytes }
    }

    public var body: some View {
        VStack(spacing: 0) {
            subHeaderBar
            Divider()

            if let msg = state.largeFilesToastMessage {
                toastBar(message: msg)
                Divider()
            }

            if state.isLoadingLargeFiles {
                loadingView
            } else {
                tabContentView
            }
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .navigationTitle("Large & Duplicates")
        .confirmationDialog(
            confirmDialogTitle,
            isPresented: $showConfirmDeleteSelected,
            titleVisibility: .visible
        ) {
            Button(confirmActionTitle, role: .destructive) {
                Task {
                    if deleteTargetTab == 0 {
                        await state.cleanSelectedLargeFiles()
                    } else if deleteTargetTab == 1 {
                        await state.cleanSelectedDuplicates()
                    } else {
                        await state.cleanSelectedOldFiles()
                    }
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(confirmDialogMessage)
        }
        .task {
            if state.largeFiles.isEmpty && !state.isLoadingLargeFiles {
                await state.fetchLargeFiles()
            }
        }
    }

    // MARK: - Subviews

    private var subHeaderBar: some View {
        HStack(spacing: 12) {
            Picker("View", selection: $selectedTab) {
                Text("Large Files (\(state.largeFiles.count))").tag(0)
                Text("Duplicates (\(state.duplicateGroups.count))").tag(1)
                Text("Old Files (\(state.oldFiles.count))").tag(2)
            }
            .pickerStyle(.segmented)
            .labelsHidden()
            .frame(width: 330)

            Spacer()

            if selectedTab == 0 {
                largeFilesControls
            } else if selectedTab == 1 {
                duplicatesControls
            } else {
                oldFilesControls
            }

            Button {
                Task { await state.fetchLargeFiles() }
            } label: {
                Label("Rescan", systemImage: "arrow.clockwise")
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
            .disabled(state.isLoadingLargeFiles)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 8)
        .background(Color(nsColor: .controlBackgroundColor).opacity(0.5))
    }

    @ViewBuilder
    private var largeFilesControls: some View {
        Picker("Min Size", selection: $state.largeFileThresholdMb) {
            Text("> 50 MB").tag(50)
            Text("> 100 MB").tag(100)
            Text("> 500 MB").tag(500)
            Text("> 1 GB").tag(1024)
            Text("> 5 GB").tag(5120)
        }
        .labelsHidden()
        .frame(width: 105)
        .controlSize(.small)
        .onChange(of: state.largeFileThresholdMb) { _, _ in
            Task { await state.fetchLargeFiles() }
        }

        if !state.largeFiles.isEmpty {
            Button(state.selectedLargeFilePaths.count == state.largeFiles.count ? "Deselect All" : "Select All") {
                if state.selectedLargeFilePaths.count == state.largeFiles.count {
                    state.selectedLargeFilePaths.removeAll()
                } else {
                    state.selectedLargeFilePaths = Set(state.largeFiles.map(\.path))
                }
            }
            .buttonStyle(.bordered)
            .controlSize(.small)

            if !state.selectedLargeFilePaths.isEmpty {
                Button("Clean (\(selectedLargeFilesBytes.formattedBytes))", role: .destructive) {
                    deleteTargetTab = 0
                    showConfirmDeleteSelected = true
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
            }
        }
    }

    @ViewBuilder
    private var duplicatesControls: some View {
        Menu {
            ForEach(DuplicateStrategy.allCases) { strategy in
                Button {
                    state.autoSelectDuplicates(strategy: strategy)
                } label: {
                    Label(strategy.rawValue, systemImage: iconForStrategy(strategy))
                }
            }
        } label: {
            Label("Auto-Select Duplicates", systemImage: "sparkles")
        }
        .menuStyle(.borderedButton)
        .controlSize(.small)

        if !state.selectedDuplicatePaths.isEmpty {
            Button("Clean (\(selectedDuplicatesBytes.formattedBytes))", role: .destructive) {
                deleteTargetTab = 1
                showConfirmDeleteSelected = true
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.small)
        }
    }

    @ViewBuilder
    private var oldFilesControls: some View {
        if !state.oldFiles.isEmpty {
            Button(state.selectedOldFilePaths.count == state.oldFiles.count ? "Deselect All" : "Select All") {
                if state.selectedOldFilePaths.count == state.oldFiles.count {
                    state.selectedOldFilePaths.removeAll()
                } else {
                    state.selectedOldFilePaths = Set(state.oldFiles.map(\.path))
                }
            }
            .buttonStyle(.bordered)
            .controlSize(.small)

            if !state.selectedOldFilePaths.isEmpty {
                Button("Clean (\(selectedOldFilesBytes.formattedBytes))", role: .destructive) {
                    deleteTargetTab = 2
                    showConfirmDeleteSelected = true
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
            }
        }
    }

    private func toastBar(message: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle")
                .foregroundStyle(.secondary)
            Text(message)
                .font(.subheadline)
            Spacer()
            Button("Dismiss") { state.largeFilesToastMessage = nil }
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
            Text("Scanning files and computing duplicate hash signatures...")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private var tabContentView: some View {
        if selectedTab == 0 {
            largeFilesList
        } else if selectedTab == 1 {
            duplicatesList
        } else {
            oldFilesList
        }
    }

    @ViewBuilder
    private var largeFilesList: some View {
        if state.largeFiles.isEmpty {
            StatusStateView(
                type: .clean(systemImage: "doc.on.doc"),
                title: "No Large Files Found",
                subtitle: "No files larger than \(state.largeFileThresholdMb)MB detected across home folders.",
                actionTitle: "Rescan Storage",
                actionIcon: "arrow.clockwise"
            ) {
                Task { await state.fetchLargeFiles() }
            }
        } else {
            List {
                ForEach(state.filteredLargeFiles) { file in
                    HStack(spacing: 12) {
                        Toggle(isOn: Binding(
                            get: { state.selectedLargeFilePaths.contains(file.path) },
                            set: { isSelected in
                                if isSelected {
                                    state.selectedLargeFilePaths.insert(file.path)
                                } else {
                                    state.selectedLargeFilePaths.remove(file.path)
                                }
                            }
                        )) {
                            EmptyView()
                        }
                        .labelsHidden()

                        Image(systemName: file.category.icon)
                            .font(.system(size: 14))
                            .foregroundStyle(.secondary)
                            .frame(width: 20)

                        VStack(alignment: .leading, spacing: 1) {
                            Text(file.name)
                                .font(.system(size: 13, weight: .medium))
                                .lineLimit(1)
                            Text(file.path)
                                .font(.caption2)
                                .foregroundStyle(.tertiary)
                                .lineLimit(1)
                        }

                        Spacer()

                        Text(file.formattedSize)
                            .font(.subheadline.monospacedDigit())
                            .foregroundStyle(.secondary)

                        Button {
                            state.revealLargeFile(file)
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
    }

    @ViewBuilder
    private var duplicatesList: some View {
        if state.duplicateGroups.isEmpty {
            StatusStateView(
                type: .clean(systemImage: "checkmark.seal"),
                title: "No Duplicates Found",
                subtitle: "No duplicate files with identical content detected. Storage is clean.",
                actionTitle: "Rescan Duplicates",
                actionIcon: "arrow.clockwise"
            ) {
                Task { await state.fetchLargeFiles() }
            }
        } else {
            List {
                ForEach(state.duplicateGroups) { group in
                    Section {
                        ForEach(group.items) { file in
                            let isKeptFirst = (file.path == group.items.first?.path)
                            let isSelected = state.selectedDuplicatePaths.contains(file.path)

                            HStack(spacing: 12) {
                                Toggle(isOn: Binding(
                                    get: { isSelected },
                                    set: { selected in
                                        if selected {
                                            state.selectedDuplicatePaths.insert(file.path)
                                        } else {
                                            state.selectedDuplicatePaths.remove(file.path)
                                        }
                                    }
                                )) {
                                    EmptyView()
                                }
                                .labelsHidden()

                                Image(systemName: "doc")
                                    .font(.system(size: 13))
                                    .foregroundStyle(.secondary)

                                VStack(alignment: .leading, spacing: 2) {
                                    HStack(spacing: 6) {
                                        Text(file.name)
                                            .font(.system(size: 13, weight: .medium))
                                            .lineLimit(1)

                                        if isKeptFirst && !isSelected {
                                            Text("Original Copy")
                                                .font(.system(size: 10, weight: .semibold))
                                                .padding(.horizontal, 6)
                                                .padding(.vertical, 1)
                                                .background(Color.green.opacity(0.15))
                                                .foregroundStyle(.green)
                                                .clipShape(Capsule())
                                        }
                                    }

                                    Text(file.path)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                        .lineLimit(1)
                                }

                                Spacer()

                                Text(file.formattedSize)
                                    .font(.caption.monospacedDigit())
                                    .foregroundStyle(.secondary)

                                Button {
                                    state.revealLargeFile(file)
                                } label: {
                                    Image(systemName: "magnifyingglass")
                                        .font(.system(size: 11))
                                }
                                .buttonStyle(.borderless)
                                .help("Reveal in Finder")
                            }
                            .padding(.vertical, 2)
                        }
                    } header: {
                        HStack {
                            Text("\(group.items.first?.name ?? "Duplicate") (\(group.items.count) copies)")
                                .font(.system(size: 12, weight: .bold))
                            Spacer()
                            Text("Reclaimable: \(group.formattedWastedSize)")
                                .font(.caption.monospacedDigit())
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .listStyle(.inset)
        }
    }

    @ViewBuilder
    private var oldFilesList: some View {
        if state.oldFiles.isEmpty {
            StatusStateView(
                type: .clean(systemImage: "clock.arrow.circlepath"),
                title: "Zero Old Unused Files",
                subtitle: "No files unaccessed or unmodified for more than 6 months detected.",
                actionTitle: "Rescan Storage",
                actionIcon: "arrow.clockwise"
            ) {
                Task { await state.fetchLargeFiles() }
            }
        } else {
            List {
                ForEach(state.oldFiles) { file in
                    HStack(spacing: 12) {
                        Toggle(isOn: Binding(
                            get: { state.selectedOldFilePaths.contains(file.path) },
                            set: { isSelected in
                                if isSelected {
                                    state.selectedOldFilePaths.insert(file.path)
                                } else {
                                    state.selectedOldFilePaths.remove(file.path)
                                }
                            }
                        )) {
                            EmptyView()
                        }
                        .labelsHidden()

                        Image(systemName: file.category.icon)
                            .font(.system(size: 14))
                            .foregroundStyle(.secondary)
                            .frame(width: 20)

                        VStack(alignment: .leading, spacing: 1) {
                            Text(file.name)
                                .font(.system(size: 13, weight: .medium))
                                .lineLimit(1)
                            Text(file.path)
                                .font(.caption2)
                                .foregroundStyle(.tertiary)
                                .lineLimit(1)
                        }

                        Spacer()

                        Text(file.formattedSize)
                            .font(.subheadline.monospacedDigit())
                            .foregroundStyle(.secondary)

                        Button {
                            state.revealLargeFile(file)
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
    }

    private func iconForStrategy(_ strategy: DuplicateStrategy) -> String {
        switch strategy {
        case .keepNewest: return "sparkles"
        case .keepOldest: return "clock"
        case .allCopies: return "doc.on.doc"
        case .deselectAll: return "xmark.circle"
        }
    }

    private var confirmDialogTitle: String {
        if deleteTargetTab == 0 {
            return "Clean \(state.selectedLargeFilePaths.count) Large Files?"
        } else if deleteTargetTab == 1 {
            return "Clean \(state.selectedDuplicatePaths.count) Duplicate Copies?"
        } else {
            return "Clean \(state.selectedOldFilePaths.count) Unused Files?"
        }
    }

    private var confirmActionTitle: String {
        let action = state.deleteToTrash ? "Move to Trash" : "Permanently Delete"
        if deleteTargetTab == 0 {
            return "\(action) (\(selectedLargeFilesBytes.formattedBytes))"
        } else if deleteTargetTab == 1 {
            return "\(action) (\(selectedDuplicatesBytes.formattedBytes))"
        } else {
            return "\(action) (\(selectedOldFilesBytes.formattedBytes))"
        }
    }

    private var confirmDialogMessage: String {
        let mode = state.deleteToTrash ? "macOS Trash" : "permanently obliterate"
        return "This action will \(mode) the selected items. You can easily restore them later if moved to Trash."
    }
}
