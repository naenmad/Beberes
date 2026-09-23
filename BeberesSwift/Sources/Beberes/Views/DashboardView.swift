import SwiftUI

public struct DashboardView: View {
    @Bindable var state: AppState
    @State private var isScanning = false
    @State private var isPurgingRAM = false

    public init(state: AppState) {
        self.state = state
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                // Storage & Memory Gauges (Apple Disk Utility Style)
                HStack(spacing: 16) {
                    // Macintosh HD Card
                    VStack(alignment: .leading, spacing: 14) {
                        HStack {
                            Label("Macintosh HD", systemImage: "internaldrive")
                                .font(.headline)
                            Spacer()
                            Text("\(Int(state.diskInfo.usagePercentage))% Used")
                                .font(.subheadline.monospacedDigit())
                                .foregroundStyle(.secondary)
                        }

                        HStack(spacing: 18) {
                            ZStack {
                                Circle()
                                    .stroke(Color.secondary.opacity(0.15), lineWidth: 8)
                                    .frame(width: 76, height: 76)

                                Circle()
                                    .trim(from: 0, to: CGFloat(min(1.0, state.diskInfo.usagePercentage / 100.0)))
                                    .stroke(Color.accentColor, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                                    .rotationEffect(.degrees(-90))
                                    .frame(width: 76, height: 76)

                                VStack(spacing: 0) {
                                    Text("\(Int(state.diskInfo.usagePercentage))%")
                                        .font(.system(size: 16, weight: .bold))
                                    Text("Used")
                                        .font(.system(size: 9))
                                        .foregroundStyle(.secondary)
                                }
                            }

                            VStack(alignment: .leading, spacing: 4) {
                                NativeStatLine(label: "Available", value: state.diskInfo.availableBytes.formattedBytes)
                                NativeStatLine(label: "Purgeable", value: state.diskInfo.purgeableBytes.formattedBytes)
                                NativeStatLine(label: "Capacity", value: state.diskInfo.totalBytes.formattedBytes)
                            }
                        }
                    }
                    .padding(16)
                    .background(Color(nsColor: .controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                    // Unified RAM Card
                    VStack(alignment: .leading, spacing: 14) {
                        HStack {
                            Label("Unified Memory", systemImage: "memorychip")
                                .font(.headline)
                            Spacer()
                            Button("Purge RAM") {
                                Task {
                                    isPurgingRAM = true
                                    await state.purgeRAM()
                                    isPurgingRAM = false
                                }
                            }
                            .controlSize(.small)
                            .buttonStyle(.bordered)
                            .disabled(isPurgingRAM)
                        }

                        HStack(spacing: 18) {
                            ZStack {
                                Circle()
                                    .stroke(Color.secondary.opacity(0.15), lineWidth: 8)
                                    .frame(width: 76, height: 76)

                                Circle()
                                    .trim(from: 0, to: CGFloat(min(1.0, state.ramInfo.usagePercentage / 100.0)))
                                    .stroke(Color.accentColor, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                                    .rotationEffect(.degrees(-90))
                                    .frame(width: 76, height: 76)

                                VStack(spacing: 0) {
                                    Text("\(Int(state.ramInfo.usagePercentage))%")
                                        .font(.system(size: 16, weight: .bold))
                                    Text("RAM")
                                        .font(.system(size: 9))
                                        .foregroundStyle(.secondary)
                                }
                            }

                            VStack(alignment: .leading, spacing: 4) {
                                NativeStatLine(label: "Active", value: state.ramInfo.usedBytes.formattedBytes)
                                NativeStatLine(label: "Inactive", value: state.ramInfo.inactiveBytes.formattedBytes)
                                NativeStatLine(label: "Total RAM", value: state.ramInfo.totalBytes.formattedBytes)
                            }
                        }
                    }
                    .padding(16)
                    .background(Color(nsColor: .controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .padding(.horizontal, 24)

                // Storage Breakdown Bar
                VStack(alignment: .leading, spacing: 10) {
                    Text("Storage Allocation")
                        .font(.headline)

                    GeometryReader { geo in
                        let total = max(1, Double(state.diskInfo.totalBytes))
                        let usedFrac = Double(state.diskInfo.usedBytes) / total
                        let purgeFrac = Double(state.diskInfo.purgeableBytes) / total
                        let freeFrac = max(0, 1.0 - usedFrac - purgeFrac)

                        HStack(spacing: 2) {
                            RoundedRectangle(cornerRadius: 3)
                                .fill(Color.primary.opacity(0.7))
                                .frame(width: max(6, geo.size.width * CGFloat(usedFrac)))

                            RoundedRectangle(cornerRadius: 3)
                                .fill(Color.secondary.opacity(0.4))
                                .frame(width: max(4, geo.size.width * CGFloat(purgeFrac)))

                            RoundedRectangle(cornerRadius: 3)
                                .fill(Color.secondary.opacity(0.15))
                                .frame(width: max(6, geo.size.width * CGFloat(freeFrac)))
                        }
                    }
                    .frame(height: 10)
                    .clipShape(RoundedRectangle(cornerRadius: 5))

                    HStack(spacing: 24) {
                        NativeLegendItem(label: "Used System & Apps", value: state.diskInfo.usedBytes.formattedBytes)
                        NativeLegendItem(label: "Purgeable Caches", value: state.diskInfo.purgeableBytes.formattedBytes)
                        NativeLegendItem(label: "Free Available", value: state.diskInfo.availableBytes.formattedBytes)
                        Spacer()
                    }
                }
                .padding(16)
                .background(Color(nsColor: .controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                .padding(.horizontal, 24)

                // Lifetime Saved Bar (Native Apple HIG)
                HStack(spacing: 12) {
                    Image(systemName: "checkmark.seal")
                        .font(.title2)
                        .foregroundStyle(.secondary)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Lifetime Space Saved")
                            .font(.subheadline.weight(.semibold))
                        Text("Cleaned securely using native macOS Trash and file system operations.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Text(state.lifetimeFreedBytes.formattedBytes)
                        .font(.title3.weight(.bold).monospacedDigit())
                }
                .padding(14)
                .background(Color(nsColor: .controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
            }
            .padding(.top, 20)
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .navigationTitle("Dashboard")
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("BeberesRefreshTriggered"))) { _ in
            Task {
                isScanning = true
                state.refreshSystemStats()
                await state.scanSystemCategories()
                isScanning = false
            }
        }
    }
}

private struct NativeStatLine: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.caption.monospacedDigit().weight(.medium))
        }
    }
}

private struct NativeLegendItem: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption.monospacedDigit().weight(.semibold))
        }
    }
}
