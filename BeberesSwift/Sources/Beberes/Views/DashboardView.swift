import SwiftUI

public struct DashboardView: View {
    @Bindable var state: AppState
    @State private var isScanningDashboard = false
    @State private var isPurgingRAM = false

    public init(state: AppState) {
        self.state = state
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                // Header Bar
                HStack(alignment: .center) {
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 8) {
                            Text("System Overview")
                                .font(.system(size: 24, weight: .bold, design: .rounded))

                            let isHighUsage = state.diskInfo.usagePercentage > 85
                            Text(isHighUsage ? "Disk Heavy" : "Optimal")
                                .font(.system(size: 11, weight: .bold))
                                .padding(.horizontal, 7)
                                .padding(.vertical, 3)
                                .background((isHighUsage ? Color.orange : Color.emerald).opacity(0.16))
                                .foregroundStyle(isHighUsage ? Color.orange : Color.emerald)
                                .clipShape(Capsule())
                        }

                        Text("Live diagnostics, hardware metrics, and quick maintenance shortcuts")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Button {
                        Task {
                            isScanningDashboard = true
                            state.refreshSystemStats()
                            await state.scanSystemCategories()
                            isScanningDashboard = false
                        }
                    } label: {
                        HStack(spacing: 6) {
                            if isScanningDashboard {
                                ProgressView()
                                    .controlSize(.small)
                            } else {
                                Image(systemName: "arrow.clockwise")
                            }
                            Text("Refresh Metrics")
                        }
                    }
                    .buttonStyle(.bordered)
                    .disabled(isScanningDashboard)
                }
                .padding(.horizontal, 24)
                .padding(.top, 20)

                // Concentric Hardware Gauges (Disk & RAM)
                HStack(spacing: 16) {
                    // Disk Storage Card
                    VStack(alignment: .leading, spacing: 14) {
                        HStack {
                            Label("Macintosh HD", systemImage: "internaldrive.fill")
                                .font(.system(size: 14, weight: .semibold))
                            Spacer()
                            Text("\(Int(state.diskInfo.usagePercentage))% Used")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(state.diskInfo.usagePercentage > 85 ? .orange : .emerald)
                        }

                        HStack(spacing: 20) {
                            ZStack {
                                Circle()
                                    .stroke(Color.secondary.opacity(0.15), lineWidth: 10)
                                    .frame(width: 86, height: 86)

                                Circle()
                                    .trim(from: 0, to: CGFloat(min(1.0, state.diskInfo.usagePercentage / 100.0)))
                                    .stroke(
                                        LinearGradient(
                                            colors: [
                                                state.diskInfo.usagePercentage > 85 ? .orange : Color.emerald,
                                                state.diskInfo.usagePercentage > 85 ? .red : Color(red: 5/255, green: 150/255, blue: 105/255)
                                            ],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        ),
                                        style: StrokeStyle(lineWidth: 10, lineCap: .round)
                                    )
                                    .rotationEffect(.degrees(-90))
                                    .frame(width: 86, height: 86)
                                    .animation(.spring(response: 0.6), value: state.diskInfo.usagePercentage)

                                VStack(spacing: 0) {
                                    Text("\(Int(state.diskInfo.usagePercentage))%")
                                        .font(.system(size: 18, weight: .bold, design: .rounded))
                                    Text("Used")
                                        .font(.system(size: 9))
                                        .foregroundStyle(.secondary)
                                }
                            }

                            VStack(alignment: .leading, spacing: 6) {
                                StatRow(label: "Available", value: state.diskInfo.availableBytes.formattedBytes, dotColor: .emerald)
                                StatRow(label: "Purgeable", value: state.diskInfo.purgeableBytes.formattedBytes, dotColor: .orange)
                                StatRow(label: "Total Capacity", value: state.diskInfo.totalBytes.formattedBytes, dotColor: .secondary)
                            }
                        }
                    }
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .fill(Color(nsColor: .controlBackgroundColor))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(Color.primary.opacity(0.06), lineWidth: 1)
                    )

                    // Unified RAM Card
                    VStack(alignment: .leading, spacing: 14) {
                        HStack {
                            Label("Unified Memory (RAM)", systemImage: "memorychip.fill")
                                .font(.system(size: 14, weight: .semibold))
                            Spacer()
                            Button {
                                Task {
                                    isPurgingRAM = true
                                    await state.purgeRAM()
                                    isPurgingRAM = false
                                }
                            } label: {
                                if isPurgingRAM {
                                    ProgressView().controlSize(.small)
                                } else {
                                    Text("Purge RAM")
                                }
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                            .disabled(isPurgingRAM)
                        }

                        HStack(spacing: 20) {
                            ZStack {
                                Circle()
                                    .stroke(Color.secondary.opacity(0.15), lineWidth: 10)
                                    .frame(width: 86, height: 86)

                                Circle()
                                    .trim(from: 0, to: CGFloat(min(1.0, state.ramInfo.usagePercentage / 100.0)))
                                    .stroke(
                                        LinearGradient(
                                            colors: [.blue, Color(red: 79/255, green: 70/255, blue: 229/255)],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        ),
                                        style: StrokeStyle(lineWidth: 10, lineCap: .round)
                                    )
                                    .rotationEffect(.degrees(-90))
                                    .frame(width: 86, height: 86)
                                    .animation(.spring(response: 0.6), value: state.ramInfo.usagePercentage)

                                VStack(spacing: 0) {
                                    Text("\(Int(state.ramInfo.usagePercentage))%")
                                        .font(.system(size: 18, weight: .bold, design: .rounded))
                                    Text("RAM")
                                        .font(.system(size: 9))
                                        .foregroundStyle(.secondary)
                                }
                            }

                            VStack(alignment: .leading, spacing: 6) {
                                StatRow(label: "Active / Wired", value: state.ramInfo.usedBytes.formattedBytes, dotColor: .blue)
                                StatRow(label: "Inactive Cache", value: state.ramInfo.inactiveBytes.formattedBytes, dotColor: .orange)
                                StatRow(label: "Total Memory", value: state.ramInfo.totalBytes.formattedBytes, dotColor: .secondary)
                            }
                        }
                    }
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .fill(Color(nsColor: .controlBackgroundColor))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(Color.primary.opacity(0.06), lineWidth: 1)
                    )
                }
                .padding(.horizontal, 24)

                // Storage Allocation Breakdown Bar
                VStack(alignment: .leading, spacing: 10) {
                    Text("Storage Breakdown")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.secondary)

                    GeometryReader { geo in
                        let total = max(1, Double(state.diskInfo.totalBytes))
                        let usedFrac = Double(state.diskInfo.usedBytes) / total
                        let purgeFrac = Double(state.diskInfo.purgeableBytes) / total
                        let freeFrac = max(0, 1.0 - usedFrac - purgeFrac)

                        HStack(spacing: 2) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color.blue)
                                .frame(width: max(8, geo.size.width * CGFloat(usedFrac)))

                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color.orange)
                                .frame(width: max(4, geo.size.width * CGFloat(purgeFrac)))

                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color.secondary.opacity(0.2))
                                .frame(width: max(8, geo.size.width * CGFloat(freeFrac)))
                        }
                    }
                    .frame(height: 12)
                    .clipShape(RoundedRectangle(cornerRadius: 6))

                    // Breakdown Legend
                    HStack(spacing: 20) {
                        LegendItem(label: "Used System & Apps", size: state.diskInfo.usedBytes.formattedBytes, color: .blue)
                        LegendItem(label: "Purgeable Caches", size: state.diskInfo.purgeableBytes.formattedBytes, color: .orange)
                        LegendItem(label: "Free Available", size: state.diskInfo.availableBytes.formattedBytes, color: .secondary)
                        Spacer()
                    }
                    .font(.system(size: 11))
                }
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Color(nsColor: .controlBackgroundColor))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(Color.primary.opacity(0.06), lineWidth: 1)
                )
                .padding(.horizontal, 24)

                // Quick Navigation Cards
                VStack(alignment: .leading, spacing: 14) {
                    Text("Optimization Tools")
                        .font(.system(size: 15, weight: .bold))

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                        ActionCard(
                            title: "Developer Workspace",
                            subtitle: "Scan dormant Git repos & hibernate build artifacts",
                            icon: "hammer.fill",
                            color: .orange
                        ) {
                            state.selectedSection = .devWorkspace
                        }

                        ActionCard(
                            title: "Zombie Port Killer",
                            subtitle: "Terminate stuck node/python dev server processes",
                            icon: "network",
                            color: .cyan
                        ) {
                            state.selectedSection = .zombiePorts
                        }

                        ActionCard(
                            title: "System Clean",
                            subtitle: "Clear user caches, browser junk, and Xcode caches",
                            icon: "sparkles",
                            color: .emerald
                        ) {
                            state.selectedSection = .systemClean
                        }

                        ActionCard(
                            title: "App Uninstaller",
                            subtitle: "Uninstall apps and obliterate residual library leftovers",
                            icon: "trash.fill",
                            color: .red
                        ) {
                            state.selectedSection = .appUninstaller
                        }

                        ActionCard(
                            title: "Startup Items",
                            subtitle: "Manage login agents & background daemons",
                            icon: "bolt.badge.clock.fill",
                            color: .purple
                        ) {
                            state.selectedSection = .startupItems
                        }

                        ActionCard(
                            title: "File Shredder",
                            subtitle: "Cryptographic multi-pass hardware file destruction",
                            icon: "flame.fill",
                            color: .red
                        ) {
                            state.selectedSection = .fileShredder
                        }
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
            }
        }
        .task {
            state.refreshSystemStats()
        }
    }
}

private struct StatRow: View {
    let label: String
    let value: String
    let dotColor: Color

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(dotColor)
                .frame(width: 7, height: 7)
            Text(label)
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.system(size: 11, weight: .semibold, design: .rounded))
        }
        .frame(minWidth: 160)
    }
}

private struct LegendItem: View {
    let label: String
    let size: String
    let color: Color

    var body: some View {
        HStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 2)
                .fill(color)
                .frame(width: 8, height: 8)
            Text("\(label):")
                .foregroundStyle(.secondary)
            Text(size)
                .fontWeight(.semibold)
        }
    }
}

private struct ActionCard: View {
    let title: String
    let subtitle: String
    let icon: String
    let color: Color
    let action: () -> Void

    @State private var isHovered = false

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    ZStack {
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .fill(color.opacity(0.14))
                            .frame(width: 36, height: 36)

                        Image(systemName: icon)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(color)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.tertiary)
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.primary)

                    Text(subtitle)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, minHeight: 100, alignment: .topLeading)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color(nsColor: .controlBackgroundColor))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(isHovered ? color.opacity(0.4) : Color.primary.opacity(0.06), lineWidth: 1)
            )
            .shadow(color: isHovered ? color.opacity(0.1) : Color.clear, radius: 8, y: 3)
            .onHover { isHovered = $0 }
        }
        .buttonStyle(.plain)
    }
}

private extension Color {
    static let emerald = Color(red: 16/255, green: 185/255, blue: 129/255)
}
