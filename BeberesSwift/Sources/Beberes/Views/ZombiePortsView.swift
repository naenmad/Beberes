import SwiftUI

public struct ZombiePortsView: View {
    @Bindable var state: AppState

    public init(state: AppState) {
        self.state = state
    }

    public var body: some View {
        VStack(spacing: 0) {

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
                if !state.portSearchText.isEmpty {
                    StatusStateView(
                        type: .searchEmpty(query: state.portSearchText),
                        title: "No Matching Ports",
                        subtitle: "No listening ports match '\(state.portSearchText)'.",
                        actionTitle: "Clear Search",
                        actionIcon: "xmark.circle"
                    ) {
                        state.portSearchText = ""
                    }
                } else {
                    StatusStateView(
                        type: .clean(systemImage: "network"),
                        title: "All Ports Clean",
                        subtitle: "No rogue or dangling TCP listening sockets detected on your system.",
                        actionTitle: "Refresh Ports",
                        actionIcon: "arrow.clockwise"
                    ) {
                        Task { await state.fetchPorts() }
                    }
                }
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
        .navigationTitle("Zombie Ports")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    Task { await state.fetchPorts() }
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }
                .disabled(state.isLoadingPorts)
            }
        }
        .searchable(text: $state.portSearchText, prompt: "Filter by port or process name")
        .background(Color(nsColor: .windowBackgroundColor))
        .task {
            if state.ports.isEmpty && !state.isLoadingPorts {
                await state.fetchPorts()
            }
        }
    }
}
