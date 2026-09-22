import SwiftUI

public struct ZombiePortsView: View {
    @Bindable var state: AppState

    public init(state: AppState) {
        self.state = state
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Standard Native Page Header
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Zombie Ports")
                        .font(.title2.weight(.bold))
                    Text("Identify and terminate processes holding local listening ports.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button {
                    Task { await state.fetchPorts() }
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }
                .buttonStyle(.bordered)
                .disabled(state.isLoadingPorts)
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)
            .padding(.bottom, 16)

            Divider()

            // Status feedback
            if let msg = state.portActionMessage {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle")
                        .foregroundStyle(.secondary)
                    Text(msg)
                        .font(.subheadline)
                    Spacer()
                    Button("Dismiss") { state.portActionMessage = nil }
                        .font(.caption)
                        .buttonStyle(.borderless)
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 8)
                .background(.bar)
                Divider()
            }

            if state.isLoadingPorts {
                VStack(spacing: 12) {
                    ProgressView()
                        .controlSize(.large)
                    Text("Scanning TCP listening ports...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if state.filteredPorts.isEmpty {
                ContentUnavailableView(
                    "No Listening Ports",
                    systemImage: "network",
                    description: Text(state.portSearchText.isEmpty ? "No active TCP listening sockets found." : "No listening ports match '\(state.portSearchText)'.")
                )
            } else {
                List {
                    ForEach(state.filteredPorts) { port in
                        HStack(spacing: 14) {
                            Text(":\(port.port)")
                                .font(.system(size: 13, weight: .bold, design: .monospaced))
                                .frame(width: 64, alignment: .leading)

                            VStack(alignment: .leading, spacing: 1) {
                                Text(port.processName)
                                    .font(.system(size: 13, weight: .semibold))
                                Text("PID: \(port.pid) • \(port.user)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            if port.isProtected {
                                Text("Protected")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            } else {
                                Button("Kill Process") {
                                    Task { await state.killPort(port) }
                                }
                                .buttonStyle(.bordered)
                                .controlSize(.small)
                            }
                        }
                        .padding(.vertical, 3)
                    }
                }
                .listStyle(.inset)
            }
        }
        .searchable(text: $state.portSearchText, prompt: "Filter by port or process name")
        .background(Color(nsColor: .windowBackgroundColor))
    }
}
