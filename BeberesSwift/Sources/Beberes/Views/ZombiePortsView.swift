import SwiftUI

public struct ZombiePortsView: View {
    @Bindable var state: AppState

    public init(state: AppState) {
        self.state = state
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Header Bar
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Zombie Port Killer")
                        .font(.title2.bold())
                    Text("Detect and terminate background processes locking developer ports")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button(action: {
                    Task { await state.fetchPorts() }
                }) {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }
                .disabled(state.isLoadingPorts)
            }
            .padding()
            .background(.bar)

            Divider()

            // Search Filter & Toast
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                TextField("Search by port, process name, or user...", text: $state.portSearchText)
                    .textFieldStyle(.plain)

                if !state.portSearchText.isEmpty {
                    Button(action: { state.portSearchText = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(10)
            .background(Color(nsColor: .controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .padding(.horizontal)
            .padding(.vertical, 8)

            if let msg = state.portActionMessage {
                HStack {
                    Text(msg)
                        .font(.footnote)
                        .foregroundStyle(.primary)
                    Spacer()
                    Button("Dismiss") { state.portActionMessage = nil }
                        .font(.caption)
                }
                .padding(.horizontal)
                .padding(.vertical, 6)
                .background(Color.emerald.opacity(0.12))
            }

            // Port List
            if state.isLoadingPorts {
                Spacer()
                ProgressView("Scanning active listening ports...")
                Spacer()
            } else if state.filteredPorts.isEmpty {
                Spacer()
                VStack(spacing: 8) {
                    Image(systemName: "checkmark.shield")
                        .font(.system(size: 44))
                        .foregroundStyle(.secondary)
                    Text("No zombie or listening ports found")
                        .font(.headline)
                    Text("All network ports are clear or matching your search filter.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            } else {
                List {
                    ForEach(state.filteredPorts) { port in
                        HStack(alignment: .center, spacing: 14) {
                            // Port Number Box
                            VStack(alignment: .center, spacing: 2) {
                                Text(":\(port.port)")
                                    .font(.system(.title3, design: .monospaced).bold())
                                    .foregroundStyle(.primary)
                                Text(port.protocolType)
                                    .font(.system(size: 9, weight: .bold))
                                    .foregroundStyle(.secondary)
                            }
                            .frame(width: 70, height: 48)
                            .background(Color.accentColor.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 8))

                            // Process Details
                            VStack(alignment: .leading, spacing: 3) {
                                HStack(spacing: 8) {
                                    Text(port.processName)
                                        .font(.system(.body, design: .rounded).weight(.semibold))

                                    if port.isProtected {
                                        StatusBadge("Protected System", systemImage: "lock.shield", color: .orange)
                                    } else {
                                        StatusBadge("PID: \(port.pid)", color: .secondary)
                                    }
                                }

                                Text("User: \(port.user) • \(port.command)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                            }

                            Spacer()

                            // Kill Button
                            if !port.isProtected {
                                Button(role: .destructive, action: {
                                    Task { await state.killPort(port) }
                                }) {
                                    Text("Kill Process")
                                        .font(.callout.weight(.medium))
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(.red)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
                .listStyle(.inset)
            }
        }
        .task {
            if state.ports.isEmpty {
                await state.fetchPorts()
            }
        }
    }
}

// Color helper
private extension Color {
    static let emerald = Color(red: 16/255, green: 185/255, blue: 129/255)
}
