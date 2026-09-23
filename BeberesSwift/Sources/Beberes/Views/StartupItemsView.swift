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

            // Toast feedback
            if let msg = appState.startupToastMessage {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle")
                        .foregroundStyle(.secondary)
                    Text(msg)
                        .font(.subheadline)
                    Spacer()
                    Button("Dismiss") { appState.startupToastMessage = nil }
                        .font(.caption)
                        .buttonStyle(.borderless)
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 8)
                .background(.bar)
                Divider()
            }

            if appState.isLoadingStartup {
                VStack(spacing: 12) {
                    ProgressView()
                        .controlSize(.large)
                    Text("Inspecting LaunchAgents and LaunchDaemons...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if appState.filteredStartupItems.isEmpty {
                ContentUnavailableView(
                    "No Startup Items",
                    systemImage: "bolt",
                    description: Text(appState.startupSearchText.isEmpty ? "No custom background startup items detected." : "No items match '\(appState.startupSearchText)'.")
                )
            } else {
                List {
                    ForEach(appState.filteredStartupItems) { item in
                        HStack(spacing: 14) {
                            Toggle(isOn: Binding(
                                get: { item.isEnabled },
                                set: { newValue in
                                    Task { await appState.toggleStartupItem(item) }
                                }
                            )) {
                                EmptyView()
                            }
                            .labelsHidden()

                            Image(systemName: item.isUser ? "person" : "gearshape")
                                .font(.system(size: 14))
                                .foregroundStyle(.secondary)
                                .frame(width: 20)

                            VStack(alignment: .leading, spacing: 1) {
                                Text(item.name)
                                    .font(.system(size: 13, weight: .medium))
                                Text(item.label)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            Text(item.kindLabel)
                                .font(.caption2)
                                .foregroundStyle(.secondary)

                            Button {
                                itemToRemove = item
                                showConfirmRemove = true
                            } label: {
                                Image(systemName: "trash")
                                    .font(.caption)
                            }
                            .buttonStyle(.borderless)
                            .help("Remove startup item")
                        }
                        .padding(.vertical, 3)
                    }
                }
                .listStyle(.inset)
            }
        }
        .navigationTitle("Startup Items")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    Task { await appState.fetchStartupItems() }
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }
                .disabled(appState.isLoadingStartup)
            }
        }
        .searchable(text: $appState.startupSearchText, prompt: "Filter startup items")
        .background(Color(nsColor: .windowBackgroundColor))
        .confirmationDialog(
            "Remove Startup Item?",
            isPresented: $showConfirmRemove,
            titleVisibility: .visible
        ) {
            Button("Remove Plist File", role: .destructive) {
                if let item = itemToRemove {
                    Task { await appState.removeStartupItem(item) }
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            if let item = itemToRemove {
                Text("This will delete '\(item.name)' configuration plist file and unregister it from launchd.")
            }
        }
    }
}
