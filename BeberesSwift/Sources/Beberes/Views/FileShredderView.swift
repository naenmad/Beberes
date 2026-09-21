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
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text("File Shredder")
                            .font(.system(size: 22, weight: .bold))
                        Text("SECURE")
                            .font(.system(size: 10, weight: .bold))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.red.opacity(0.15))
                            .foregroundColor(.red)
                            .cornerRadius(4)
                    }

                    Text("Permanently overwrite files with cryptographic entropy and hardware flush (F_FULLFSYNC).")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }

                Spacer()

                // Pass Selector
                Picker("Security Level", selection: $appState.shredPass) {
                    ForEach(ShredPassOption.allCases) { opt in
                        Text(opt.label).tag(opt)
                    }
                }
                .pickerStyle(.menu)
                .frame(width: 260)
            }
            .padding(20)
            .background(Color(nsColor: .controlBackgroundColor))

            Divider()

            // Warning Notice
            HStack(spacing: 12) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 16))
                    .foregroundColor(.yellow)

                Text("Warning: Shredded files are permanently obliterated and cannot be recovered by any forensic recovery software.")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.primary)

                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 8)
            .background(Color.yellow.opacity(0.1))

            Divider()

            // Drop Area / Staged Queue
            VStack(spacing: 16) {
                if appState.shredQueue.isEmpty {
                    // Empty state drop zone
                    VStack(spacing: 16) {
                        ZStack {
                            Circle()
                                .fill(isTargeted ? Color.red.opacity(0.15) : Color.secondary.opacity(0.08))
                                .frame(width: 90, height: 90)

                            Image(systemName: isTargeted ? "arrow.down.doc.fill" : "flame.fill")
                                .font(.system(size: 40))
                                .foregroundStyle(isTargeted ? Color.red : Color.secondary)
                        }

                        VStack(spacing: 6) {
                            Text("Drag & Drop Files or Folders Here")
                                .font(.system(size: 16, weight: .semibold))
                            Text("Or select files manually from your storage")
                                .font(.system(size: 12))
                                .foregroundStyle(.secondary)
                        }

                        Button("Browse Files...") {
                            chooseFilesToShred()
                        }
                        .buttonStyle(.bordered)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(
                                isTargeted ? Color.red : Color.secondary.opacity(0.2),
                                style: StrokeStyle(lineWidth: 2, dash: [8])
                            )
                            .padding(24)
                    )
                } else {
                    // Queue list
                    VStack(spacing: 0) {
                        HStack {
                            Text("Staged Items (\(appState.shredQueue.count))")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(.secondary)

                            Spacer()

                            Button("Add More...") {
                                chooseFilesToShred()
                            }
                            .buttonStyle(.borderless)

                            Button("Clear All") {
                                appState.clearShredQueue()
                            }
                            .buttonStyle(.borderless)
                            .foregroundStyle(.secondary)
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)

                        Divider()

                        List {
                            ForEach(appState.shredQueue, id: \.self) { path in
                                HStack(spacing: 12) {
                                    Image(systemName: pathIsDirectory(path) ? "folder.fill" : "doc.fill")
                                        .foregroundColor(pathIsDirectory(path) ? .blue : .secondary)

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text((path as NSString).lastPathComponent)
                                            .font(.system(size: 13, weight: .medium))
                                        Text(path)
                                            .font(.system(size: 10))
                                            .foregroundStyle(.tertiary)
                                            .lineLimit(1)
                                            .truncationMode(.middle)
                                    }

                                    Spacer()

                                    Text(formattedPathSize(path))
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundStyle(.secondary)

                                    Button {
                                        appState.removeFromShredQueue(path: path)
                                    } label: {
                                        Image(systemName: "xmark.circle")
                                            .foregroundStyle(.secondary)
                                    }
                                    .buttonStyle(.plain)
                                }
                                .padding(.vertical, 4)
                            }
                        }
                        .listStyle(.inset)

                        Divider()

                        // Action Bar
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Ready to obliterate")
                                    .font(.system(size: 12, weight: .semibold))
                                Text("\(appState.shredQueue.count) item(s) • \(appState.shredPass.label)")
                                    .font(.system(size: 11))
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            if appState.isShredding {
                                ProgressView()
                                    .scaleEffect(0.9)
                                Text("Shredding in progress...")
                                    .font(.system(size: 12))
                                    .foregroundStyle(.secondary)
                            } else {
                                Button("Shred & Obliterate") {
                                    showConfirmDialog = true
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(.red)
                            }
                        }
                        .padding(16)
                        .background(Color(nsColor: .controlBackgroundColor))
                    }
                }
            }
            .onDrop(of: [.fileURL], isTargeted: $isTargeted) { providers in
                handleDroppedItems(providers)
                return true
            }
        }
        .confirmationDialog(
            "Obliterate \(appState.shredQueue.count) items permanently?",
            isPresented: $showConfirmDialog
        ) {
            Button("Yes, Shred Permanently", role: .destructive) {
                Task { await appState.executeShred() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This action is completely irreversible. Data will be overwritten using \(appState.shredPass.label) and removed from disk.")
        }
        .overlay(alignment: .bottom) {
            if let toast = appState.shredToastMessage {
                Text(toast)
                    .font(.system(size: 12, weight: .medium))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(.ultraThinMaterial)
                    .cornerRadius(8)
                    .shadow(radius: 4)
                    .padding(.bottom, 20)
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 4) {
                            appState.shredToastMessage = nil
                        }
                    }
            }
        }
    }

    private func chooseFilesToShred() {
        let panel = NSOpenPanel()
        panel.canChooseFiles = true
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = true
        panel.prompt = "Select to Shred"

        if panel.runModal() == .OK {
            let paths = panel.urls.map(\.path)
            appState.addToShredQueue(paths: paths)
        }
    }

    private func handleDroppedItems(_ providers: [NSItemProvider]) {
        for provider in providers {
            _ = provider.loadObject(ofClass: URL.self) { url, _ in
                guard let url = url else { return }
                DispatchQueue.main.async {
                    appState.addToShredQueue(paths: [url.path])
                }
            }
        }
    }

    private func pathIsDirectory(_ path: String) -> Bool {
        var isDir: ObjCBool = false
        FileManager.default.fileExists(atPath: path, isDirectory: &isDir)
        return isDir.boolValue
    }

    private func formattedPathSize(_ path: String) -> String {
        let attrs = try? FileManager.default.attributesOfItem(atPath: path)
        let size = (attrs?[.size] as? Int64) ?? 0
        return size.formattedBytes
    }
}
