import SwiftUI

public struct HardwareView: View {
    @Bindable var state: AppState

    public init(appState: AppState) {
        self.state = appState
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                // Processor Specification Banner
                HStack(spacing: 16) {
                    Image(systemName: "cpu")
                        .font(.system(size: 32))
                        .foregroundStyle(.secondary)
                        .frame(width: 48, height: 48)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(state.hardwareMetrics.chipName)
                            .font(.headline)

                        Text("\(state.hardwareMetrics.totalCores) Total Cores • ARM64 Apple Silicon")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()
                }
                .padding(16)
                .background(Color(nsColor: .controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                .padding(.horizontal, 24)

                // System Information Grid
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                    HardwareSpecCard(
                        title: "Thermal State",
                        value: state.hardwareMetrics.thermalState,
                        icon: "thermometer.medium",
                        detail: "Kernel dynamic throttling status"
                    )

                    HardwareSpecCard(
                        title: "System Uptime",
                        value: state.hardwareMetrics.uptimeString,
                        icon: "clock",
                        detail: "Continuous uptime since last boot"
                    )

                    HardwareSpecCard(
                        title: "Operating System",
                        value: state.hardwareMetrics.osVersion,
                        icon: "laptopcomputer",
                        detail: "macOS Kernel Darwin"
                    )

                    if let level = state.hardwareMetrics.batteryLevel {
                        HardwareSpecCard(
                            title: "Battery Health",
                            value: "\(level)% \(state.hardwareMetrics.isCharging == true ? "(Charging)" : "")",
                            icon: state.hardwareMetrics.isCharging == true ? "battery.100percent.bolt" : "battery.100percent",
                            detail: "IOKit smart battery controller"
                        )
                    } else {
                        HardwareSpecCard(
                            title: "Power Source",
                            value: "AC Power Connected",
                            icon: "powerplug",
                            detail: "Desktop / Constant power source"
                        )
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
            }
            .padding(.top, 20)
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .navigationTitle("Hardware")
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("BeberesRefreshTriggered"))) { _ in
            state.refreshHardware()
            state.refreshSystemStats()
        }
    }
}

private struct HardwareSpecCard: View {
    let title: String
    let value: String
    let icon: String
    let detail: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundStyle(.secondary)
                    .frame(width: 20)

                Text(title)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Spacer()
            }

            Text(value)
                .font(.title3.weight(.semibold))

            Text(detail)
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
        .padding(14)
        .background(Color(nsColor: .controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}
