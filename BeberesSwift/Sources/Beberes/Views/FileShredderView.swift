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
            // Security Algorithm & Staging Subheader
            HStack(spacing: 12) {
                Picker("Security", selection: $appState.shredPass) {
                    ForEach(ShredPassOption.allCases) { opt in
                        Text(opt.label).tag(opt)
                    }
                }
                .labelsHidden()
                .frame(width: 170)

                Spacer()

                Button {
                    openFilePicker()
                } label: {
                    Label("Add Files...", systemImage: "plus")
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 8)
            .background(Color(nsColor: .controlBackgroundColor).opacity(0.5))

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
                    StatusStateView(
                        type: .ready(systemImage: "lock.shield"),
                        title: "Drag and Drop Files to Shred",
                        subtitle: "Items staged here are overwritten with multi-pass random data and flushed using F_FULLFSYNC with zero chance of recovery.",
                        actionTitle: "Choose Files...",
                        actionIcon: "plus"
                    ) {
                        openFilePicker()
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
        .navigationTitle("File Shredder")
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
