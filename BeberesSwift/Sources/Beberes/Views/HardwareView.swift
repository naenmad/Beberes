import SwiftUI

public struct HardwareView: View {
    @Bindable var state: AppState

    public init(appState: AppState) {
        self.state = appState
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 8) {
                            Text("Hardware Intelligence")
                                .font(.system(size: 22, weight: .bold))
                            Text("APPLE SILICON")
                                .font(.system(size: 9, weight: .heavy))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.purple.opacity(0.15))
                                .foregroundColor(.purple)
                                .cornerRadius(4)
                        }

                        Text("Direct low-level metrics: thermal throttling, core architecture, and power state.")
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Button {
                        state.refreshHardware()
                        state.refreshSystemStats()
                    } label: {
                        Label("Refresh", systemImage: "arrow.clockwise")
                    }
                    .buttonStyle(.bordered)
                }
                .padding(.horizontal, 24)
                .padding(.top, 20)

                // Hero Chip Card
                HStack(spacing: 20) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(LinearGradient(
                                colors: [Color(red: 30/255, green: 27/255, blue: 75/255), Color(red: 67/255, green: 56/255, blue: 202/255)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ))
                            .frame(width: 72, height: 72)
                            .shadow(color: Color.indigo.opacity(0.3), radius: 8, y: 4)

                        Image(systemName: "cpu.fill")
                            .font(.system(size: 36))
                            .foregroundStyle(.white)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text(state.hardwareMetrics.chipName)
                            .font(.system(size: 20, weight: .bold, design: .rounded))

                        HStack(spacing: 8) {
                            Text("\(state.hardwareMetrics.totalCores) Active Cores")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(.secondary)

                            Text("•")
                                .foregroundStyle(.tertiary)

                            Text("ARM64 Unified Architecture")
                                .font(.system(size: 11))
                                .foregroundStyle(.secondary)
                        }
                    }

                    Spacer()
                }
                .padding(20)
                .background(Color(nsColor: .controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.primary.opacity(0.06), lineWidth: 1)
                )
                .padding(.horizontal, 24)

                // 2x2 Grid of Detailed Metrics
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                    // Thermal State
                    HardwareCard(
                        title: "Thermal State",
                        value: state.hardwareMetrics.thermalState,
                        icon: "thermometer.medium",
                        color: thermalColor(state.hardwareMetrics.thermalState),
                        description: "Kernel dynamic thermal throttling status"
                    )

                    // System Uptime
                    HardwareCard(
                        title: "System Uptime",
                        value: state.hardwareMetrics.uptimeString,
                        icon: "clock.fill",
                        color: .blue,
                        description: "Time elapsed since last cold reboot"
                    )

                    // Operating System
                    HardwareCard(
                        title: "macOS Version",
                        value: state.hardwareMetrics.osVersion,
                        icon: "applelogo",
                        color: .purple,
                        description: "Apple Darwin Kernel release"
                    )

                    // Power & Battery
                    if let battery = state.hardwareMetrics.batteryLevel {
                        HardwareCard(
                            title: "Battery Health",
                            value: "\(battery)% \(state.hardwareMetrics.isCharging == true ? "⚡️ Charging" : "On Battery")",
                            icon: "battery.100",
                            color: battery > 20 ? .green : .red,
                            description: "Smart power controller metrics"
                        )
                    } else {
                        HardwareCard(
                            title: "Power Source",
                            value: "AC Power Connected",
                            icon: "powerplug.fill",
                            color: .green,
                            description: "Desktop power supply mode"
                        )
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
            }
        }
    }

    private func thermalColor(_ state: String) -> Color {
        if state.contains("Cool") {
            return .green
        } else if state.contains("Fair") {
            return .orange
        } else {
            return .red
        }
    }
}

private struct HardwareCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    let description: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                ZStack {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(color.opacity(0.14))
                        .frame(width: 32, height: 32)

                    Image(systemName: icon)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(color)
                }

                Spacer()
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.secondary)

                Text(value)
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)

                Text(description)
                    .font(.system(size: 10))
                    .foregroundStyle(.tertiary)
                    .lineLimit(1)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .background(Color(nsColor: .controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.primary.opacity(0.06), lineWidth: 1)
        )
    }
}
