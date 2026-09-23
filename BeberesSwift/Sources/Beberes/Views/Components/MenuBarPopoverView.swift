import SwiftUI
import AppKit

public struct MenuBarPopoverView: View {
    @Bindable var state: AppState
    @State private var isPurgingRAM = false
    @State private var isEmptyingTrash = false
    @State private var actionFeedback: String? = nil

    public init(state: AppState = AppState.shared) {
        self.state = state
    }

    private var diskUsedPct: Int {
        guard state.diskInfo.totalBytes > 0 else { return 0 }
        return Int(state.diskInfo.usagePercentage.rounded())
    }

    private var ramUsedPct: Int {
        guard state.ramInfo.totalBytes > 0 else { return 0 }
        return Int(state.ramInfo.usagePercentage.rounded())
    }

    public var body: some View {
        VStack(spacing: 12) {
            // Header
            HStack(spacing: 8) {
                if let icon = getAppIcon() {
                    Image(nsImage: icon)
                        .resizable()
                        .frame(width: 20, height: 20)
                        .clipShape(RoundedRectangle(cornerRadius: 5, style: .continuous))
                } else {
                    Image(systemName: "sparkles")
                        .font(.system(size: 14))
                        .foregroundStyle(.secondary)
                }

                VStack(alignment: .leading, spacing: 1) {
                    Text("Beberes Mini")
                        .font(.system(size: 12, weight: .bold))
                    Text("Status Bar Widget")
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button {
                    openMainWindow(section: .dashboard)
                } label: {
                    Image(systemName: "arrow.up.forward.app")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .help("Open Full Beberes Window")
            }
            .padding(.bottom, 2)

            // Feedback Pill
            if let feedback = actionFeedback {
                Text(feedback)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .frame(maxWidth: .infinity)
                    .background(Color.secondary.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                    .transition(.opacity)
            }

            // Memory Card
            VStack(spacing: 8) {
                HStack {
                    HStack(spacing: 5) {
                        Image(systemName: "cpu")
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                        Text("Unified Memory")
                            .font(.system(size: 12, weight: .medium))
                    }
                    Spacer()
                    Text("\(ramUsedPct)%")
                        .font(.system(size: 12, weight: .semibold).monospacedDigit())
                        .foregroundStyle(.secondary)
                }

                ProgressView(value: Double(ramUsedPct), total: 100)
                    .tint(ramUsedPct > 85 ? Color.orange : Color.secondary)

                HStack {
                    Text("\(state.ramInfo.usedBytes.formattedBytes) / \(state.ramInfo.totalBytes.formattedBytes)")
                        .font(.system(size: 10).monospacedDigit())
                        .foregroundStyle(.tertiary)

                    Spacer()

                    Button {
                        handlePurgeRAM()
                    } label: {
                        if isPurgingRAM {
                            ProgressView()
                                .controlSize(.mini)
                        } else {
                            Text("Purge RAM")
                                .font(.system(size: 10, weight: .medium))
                        }
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.mini)
                    .disabled(isPurgingRAM)
                }
            }
            .padding(10)
            .background(Color(nsColor: .controlBackgroundColor).opacity(0.6))
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            // Storage Card
            VStack(spacing: 8) {
                HStack {
                    HStack(spacing: 5) {
                        Image(systemName: "internaldrive")
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                        Text("Internal Storage")
                            .font(.system(size: 12, weight: .medium))
                    }
                    Spacer()
                    Text("\(diskUsedPct)%")
                        .font(.system(size: 12, weight: .semibold).monospacedDigit())
                        .foregroundStyle(.secondary)
                }

                ProgressView(value: Double(diskUsedPct), total: 100)
                    .tint(diskUsedPct > 90 ? Color.red : Color.secondary)

                HStack {
                    Text("\(state.diskInfo.availableBytes.formattedBytes) Free")
                        .font(.system(size: 10).monospacedDigit())
                        .foregroundStyle(.tertiary)

                    Spacer()

                    Button {
                        handleEmptyTrash()
                    } label: {
                        if isEmptyingTrash {
                            ProgressView()
                                .controlSize(.mini)
                        } else {
                            Text("Empty Trash")
                                .font(.system(size: 10, weight: .medium))
                        }
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.mini)
                    .disabled(isEmptyingTrash)
                }
            }
            .padding(10)
            .background(Color(nsColor: .controlBackgroundColor).opacity(0.6))
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            Divider()

            // Footer Actions
            VStack(spacing: 6) {
                Button {
                    openMainWindow(section: .systemClean)
                } label: {
                    HStack {
                        Image(systemName: "sparkles")
                        Text("Smart Clean System...")
                        Spacer()
                    }
                    .font(.system(size: 11, weight: .medium))
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)

                HStack(spacing: 8) {
                    Button("Open Full Beberes") {
                        openMainWindow(section: .dashboard)
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                    .frame(maxWidth: .infinity)

                    Button("Quit") {
                        NSApp.terminate(nil)
                    }
                    .buttonStyle(.borderless)
                    .controlSize(.small)
                    .foregroundStyle(.secondary)
                }
            }
        }
        .padding(12)
        .frame(width: 280)
        .onAppear {
            state.refreshSystemStats()
        }
    }

    private func handlePurgeRAM() {
        guard !isPurgingRAM else { return }
        isPurgingRAM = true
        actionFeedback = nil

        let beforeUsed = state.ramInfo.usedBytes
        Task {
            await state.purgeRAM()
            let afterUsed = state.ramInfo.usedBytes
            let freed = max(0, beforeUsed - afterUsed)
            isPurgingRAM = false

            withAnimation {
                if freed > 10_000_000 {
                    actionFeedback = "Freed \(freed.formattedBytes) RAM"
                } else {
                    actionFeedback = "Unified Memory optimized"
                }
            }

            try? await Task.sleep(nanoseconds: 3_000_000_000)
            withAnimation { actionFeedback = nil }
        }
    }

    private func handleEmptyTrash() {
        guard !isEmptyingTrash else { return }
        isEmptyingTrash = true
        actionFeedback = nil

        Task {
            await state.emptyAllTrash()
            isEmptyingTrash = false

            withAnimation {
                actionFeedback = "Trash emptied successfully"
            }

            try? await Task.sleep(nanoseconds: 3_000_000_000)
            withAnimation { actionFeedback = nil }
        }
    }

    private func openMainWindow(section: NavigationSection) {
        state.selectedSection = section
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)

        for window in NSApp.windows {
            if window.canBecomeMain {
                window.makeKeyAndOrderFront(nil)
                window.deminiaturize(nil)
            }
        }
    }

    private func getAppIcon() -> NSImage? {
        let iconURL = Bundle.main.url(forResource: "AppIcon", withExtension: "png") ?? Bundle.module.url(forResource: "AppIcon", withExtension: "png")
        if let iconURL {
            return NSImage(contentsOf: iconURL)
        }
        return nil
    }
}
