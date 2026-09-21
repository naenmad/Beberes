import SwiftUI
import AppKit

public struct StartupItemsView: View {
    @Bindable var appState: AppState
    @State private var itemToRemove: StartupItem? = nil
    @State private var showConfirmRemove: Bool = false

    public init(appState: AppState) {
        self.appState = appState
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Startup Items")
                        .font(.system(size: 22, weight: .bold))
                    Text("Control background services scheduled to launch automatically at boot or login.")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button {
                    Task { await appState.fetchStartupItems() }
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }
                .buttonStyle(.bordered)
            }
            .padding(20)
            .background(Color(nsColor: .controlBackgroundColor))

            Divider()

            // Filter and summary bar
            HStack {
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)
                    TextField("Filter startup items...", text: $appState.startupSearchText)
                        .textFieldStyle(.plain)
                }
                .padding(8)
                .background(Color(nsColor: .windowBackgroundColor))
                .cornerRadius(8)
                .frame(maxWidth: 300)

                Spacer()

                let total = appState.startupItems.count
                let enabledCount = appState.startupItems.filter(\.isEnabled).count
                Text("\(total) items (\(enabledCount) active)")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 10)

            Divider()

            // List
            if appState.isLoadingStartup {
                VStack(spacing: 16) {
                    ProgressView()
                    Text("Scanning launch agents and daemons...")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if appState.filteredStartupItems.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "bolt.badge.checkmark")
                        .font(.system(size: 40))
                        .foregroundStyle(.secondary)
                    Text("No startup items found")
                        .font(.system(size: 15, weight: .semibold))
                    Text("Your startup and login configuration is completely clean.")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(appState.filteredStartupItems) { item in
                        HStack(spacing: 14) {
                            // Icon
                            ZStack {
                                Circle()
                                    .fill(item.isEnabled ? Color.blue.opacity(0.15) : Color.secondary.opacity(0.1))
                                    .frame(width: 36, height: 36)

                                Image(systemName: item.isUser ? "person.crop.circle" : "gearshape.2.fill")
                                    .font(.system(size: 16))
                                    .foregroundStyle(item.isEnabled ? Color.blue : Color.secondary)
                            }

                            // Details
                            VStack(alignment: .leading, spacing: 3) {
                                HStack(spacing: 8) {
                                    Text(item.name)
                                        .font(.system(size: 13, weight: .semibold))

                                    Text(item.kindLabel.uppercased())
                                        .font(.system(size: 9, weight: .bold))
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(badgeColor(for: item.kindLabel).opacity(0.15))
                                        .foregroundColor(badgeColor(for: item.kindLabel))
                                        .cornerRadius(4)
                                }

                                if let prog = item.program {
                                    Text(prog)
                                        .font(.system(size: 11))
                                        .foregroundStyle(.secondary)
                                        .lineLimit(1)
                                        .truncationMode(.middle)
                                }

                                Text(item.path)
                                    .font(.system(size: 10))
                                    .foregroundStyle(.tertiary)
                                    .lineLimit(1)
                                    .truncationMode(.middle)
                            }

                            Spacer()

                            // Toggle
                            Toggle("", isOn: Binding(
                                get: { item.isEnabled },
                                set: { _ in
                                    Task { await appState.toggleStartupItem(item) }
                                }
                            ))
                            .toggleStyle(.switch)
                            .labelsHidden()

                            // Remove
                            Button {
                                itemToRemove = item
                                showConfirmRemove = true
                            } label: {
                                Image(systemName: "trash")
                                    .foregroundStyle(.secondary)
                            }
                            .buttonStyle(.plain)
                            .help("Remove launch configuration")
                        }
                        .padding(.vertical, 6)
                    }
                }
                .listStyle(.inset)
            }
        }
        .task {
            if appState.startupItems.isEmpty {
                await appState.fetchStartupItems()
            }
        }
        .confirmationDialog(
            "Remove \(itemToRemove?.name ?? "Startup Item")?",
            isPresented: $showConfirmRemove,
            presenting: itemToRemove
        ) { item in
            Button("Remove & Move to Trash", role: .destructive) {
                Task { await appState.removeStartupItem(item) }
            }
            Button("Cancel", role: .cancel) {}
        } message: { item in
            Text("This will deactivate \(item.name) and move the plist file at \(item.path) to macOS Trash.")
        }
        .overlay(alignment: .bottom) {
            if let toast = appState.startupToastMessage {
                Text(toast)
                    .font(.system(size: 12, weight: .medium))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(.ultraThinMaterial)
                    .cornerRadius(8)
                    .shadow(radius: 4)
                    .padding(.bottom, 20)
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                            appState.startupToastMessage = nil
                        }
                    }
            }
        }
    }

    private func badgeColor(for kind: String) -> Color {
        switch kind {
        case "User Agent": return .blue
        case "Global Agent": return .purple
        case "Global Daemon": return .orange
        default: return .secondary
        }
    }
}
