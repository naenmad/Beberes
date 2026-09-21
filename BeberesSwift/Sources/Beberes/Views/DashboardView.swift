import SwiftUI

public struct DashboardView: View {
    @Bindable var state: AppState

    public init(state: AppState) {
        self.state = state
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Top Hero Row: Disk Gauge & Memory Gauge
                HStack(spacing: 20) {
                    // Disk Gauge Card
                    VStack(alignment: .leading, spacing: 16) {
                        HStack {
                            Label("Macintosh HD", systemImage: "internaldrive")
                                .font(.headline)
                            Spacer()
                            StatusBadge("\(Int(state.diskInfo.usagePercentage))% Used", color: state.diskInfo.usagePercentage > 85 ? .orange : .emerald)
                        }

                        HStack(spacing: 20) {
                            // Circular Ring
                            ZStack {
                                Circle()
                                    .stroke(Color.secondary.opacity(0.2), lineWidth: 14)
                                    .frame(width: 100, height: 100)

                                Circle()
                                    .trim(from: 0, to: CGFloat(min(1.0, state.diskInfo.usagePercentage / 100.0)))
                                    .stroke(
                                        state.diskInfo.usagePercentage > 85 ? Color.orange : Color.emerald,
                                        style: StrokeStyle(lineWidth: 14, lineCap: .round)
                                    )
                                    .rotationEffect(.degrees(-90))
                                    .frame(width: 100, height: 100)
                                    .animation(.spring(response: 0.6), value: state.diskInfo.usagePercentage)

                                VStack(spacing: 1) {
                                    Text("\(Int(state.diskInfo.usagePercentage))%")
                                        .font(.system(.title3, design: .rounded).bold())
                                    Text("Used")
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                            }

                            VStack(alignment: .leading, spacing: 6) {
                                MetricRow(label: "Available", value: state.diskInfo.availableBytes.formattedBytes, color: .emerald)
                                MetricRow(label: "Purgeable", value: state.diskInfo.purgeableBytes.formattedBytes, color: .orange)
                                MetricRow(label: "Total Capacity", value: state.diskInfo.totalBytes.formattedBytes, color: .secondary)
                            }
                        }
                    }
                    .padding()
                    .background(Color(nsColor: .controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 14))

                    // RAM Gauge Card
                    VStack(alignment: .leading, spacing: 16) {
                        HStack {
                            Label("Unified Memory (RAM)", systemImage: "memorychip")
                                .font(.headline)
                            Spacer()
                            Button("Purge Inactive") {
                                Task { await state.purgeRAM() }
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        }

                        HStack(spacing: 20) {
                            // Circular Ring
                            ZStack {
                                Circle()
                                    .stroke(Color.secondary.opacity(0.2), lineWidth: 14)
                                    .frame(width: 100, height: 100)

                                Circle()
                                    .trim(from: 0, to: CGFloat(min(1.0, state.ramInfo.usagePercentage / 100.0)))
                                    .stroke(
                                        Color.blue,
                                        style: StrokeStyle(lineWidth: 14, lineCap: .round)
                                    )
                                    .rotationEffect(.degrees(-90))
                                    .frame(width: 100, height: 100)
                                    .animation(.spring(response: 0.6), value: state.ramInfo.usagePercentage)

                                VStack(spacing: 1) {
                                    Text("\(Int(state.ramInfo.usagePercentage))%")
                                        .font(.system(.title3, design: .rounded).bold())
                                    Text("RAM")
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                            }

                            VStack(alignment: .leading, spacing: 6) {
                                MetricRow(label: "Used RAM", value: state.ramInfo.usedBytes.formattedBytes, color: .blue)
                                MetricRow(label: "Inactive Cache", value: state.ramInfo.inactiveBytes.formattedBytes, color: .orange)
                                MetricRow(label: "Total Memory", value: state.ramInfo.totalBytes.formattedBytes, color: .secondary)
                            }
                        }
                    }
                    .padding()
                    .background(Color(nsColor: .controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }

                // Quick Navigation Cards
                VStack(alignment: .leading, spacing: 12) {
                    Text("Quick Actions")
                        .font(.headline)

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                        QuickActionCard(
                            title: "Developer Workspace",
                            subtitle: "Scan dormant Git repos and hibernate build caches",
                            icon: "hammer.fill",
                            color: .emerald
                        ) {
                            state.selectedSection = .devWorkspace
                        }

                        QuickActionCard(
                            title: "Zombie Port Killer",
                            subtitle: "Free stuck ports 3000, 8080, and dev servers",
                            icon: "network",
                            color: .blue
                        ) {
                            state.selectedSection = .zombiePorts
                        }

                        QuickActionCard(
                            title: "System Clean",
                            subtitle: "Purge APFS snapshots, browser and app caches",
                            icon: "sparkles",
                            color: .purple
                        ) {
                            state.selectedSection = .systemClean
                        }
                    }
                }
            }
            .padding(20)
        }
        .task {
            state.refreshSystemStats()
        }
    }
}

// Subviews
private struct MetricRow: View {
    let label: String
    let value: String
    let color: Color

    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
            Text(label + ":")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption.weight(.semibold))
        }
    }
}

private struct QuickActionCard: View {
    let title: String
    let subtitle: String
    let icon: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 10) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundStyle(color)
                    .frame(width: 38, height: 38)
                    .background(color.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.headline)
                        .foregroundStyle(.primary)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(Color(nsColor: .controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }
}

private extension Color {
    static let emerald = Color(red: 16/255, green: 185/255, blue: 129/255)
}
