import SwiftUI
import AppKit
import UniformTypeIdentifiers

public struct FileShredderView: View {
    @Bindable var appState: AppState
    @State private var isTargeted: Bool = false
    @State private var showConfirmDialog: Bool = false

    public init(appState: AppState) {
        self.appState = appState
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Standard Native Page Header
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("File Shredder")
                        .font(.title2.weight(.bold))
                    Text("Cryptographically overwrite files before permanent deletion.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Picker("Security", selection: $appState.shredPass) {
                    ForEach(ShredPassOption.allCases) { opt in
                        Text(opt.label).tag(opt)
                    }
                }
                .frame(width: 220)

                Button("Add Files...") {
                    openFilePicker()
                }
                .buttonStyle(.bordered)
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)
            .padding(.bottom, 16)

            Divider()

            // Toast Message
            if let msg = appState.shredToastMessage {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle")
                        .foregroundStyle(.secondary)
                    Text(msg)
                        .font(.subheadline)
                    Spacer()
                    Button("Dismiss") { appState.shredToastMessage = nil }
                        .font(.caption)
                        .buttonStyle(.borderless)
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 8)
                .background(.bar)
                Divider()
            }

            // Drop Area / Staged Queue
            VStack(spacing: 16) {
                if appState.shredQueue.isEmpty {
                    ContentUnavailableView {
                        Label("Drag and Drop Files to Shred", systemImage: "lock.shield")
                    } description: {
                        Text("Files dropped here will be multi-pass overwritten and flushed using F_FULLFSYNC.")
                    } actions: {
                        Button("Choose Files...") {
                            openFilePicker()
                        }
                        .buttonStyle(.bordered)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        ForEach(appState.shredQueue, id: \.self) { path in
                            HStack(spacing: 10) {
                                Image(systemName: "doc")
                                    .foregroundStyle(.secondary)

                                VStack(alignment: .leading, spacing: 1) {
                                    Text(URL(fileURLWithPath: path).lastPathComponent)
                                        .font(.system(size: 13, weight: .medium))
                                    Text(path)
                                        .font(.caption2)
                                        .foregroundStyle(.tertiary)
                                        .lineLimit(1)
                                }

                                Spacer()

                                Button {
                                    appState.shredQueue.removeAll { $0 == path }
                                } label: {
                                    Image(systemName: "xmark")
                                        .font(.caption)
                                }
                                .buttonStyle(.borderless)
                                .help("Remove from shred queue")
                            }
                            .padding(.vertical, 2)
                        }
                    }
                    .listStyle(.inset)

                    HStack {
                        Button("Clear Queue") {
                            appState.shredQueue.removeAll()
                        }
                        .buttonStyle(.bordered)

                        Spacer()

                        Button("Shred \(appState.shredQueue.count) Files", role: .destructive) {
                            showConfirmDialog = true
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(appState.isShredding)
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 16)
                }
            }
            .onDrop(of: [.fileURL], isTargeted: $isTargeted) { providers in
                handleDrop(providers: providers)
            }
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .confirmationDialog(
            "Permanently Shred Files?",
            isPresented: $showConfirmDialog,
            titleVisibility: .visible
        ) {
            Button("Obliterate Files", role: .destructive) {
                Task { await appState.executeShred() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("These \(appState.shredQueue.count) files will be overwritten with cryptographic entropy and hardware synced. They cannot be recovered by forensic software.")
        }
    }

    private func openFilePicker() {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = true
        panel.canChooseDirectories = true
        panel.canChooseFiles = true
        if panel.runModal() == .OK {
            for url in panel.urls {
                if !appState.shredQueue.contains(url.path) {
                    appState.shredQueue.append(url.path)
                }
            }
        }
    }

    private func handleDrop(providers: [NSItemProvider]) -> Bool {
        for provider in providers {
            provider.loadItem(forTypeIdentifier: UTType.fileURL.identifier, options: nil) { item, _ in
                if let data = item as? Data,
                   let url = URL(dataRepresentation: data, relativeTo: nil) {
                    Task { @MainActor in
                        if !appState.shredQueue.contains(url.path) {
                            appState.shredQueue.append(url.path)
                        }
                    }
                }
            }
        }
        return true
    }
}
