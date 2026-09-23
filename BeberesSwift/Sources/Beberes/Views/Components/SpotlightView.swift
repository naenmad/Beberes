import SwiftUI

public struct SpotlightItem: Identifiable, Sendable {
    public let id: String
    public let title: String
    public let subtitle: String
    public let icon: String
    public let badge: String?
    public let category: String

    public init(id: String, title: String, subtitle: String, icon: String, badge: String? = nil, category: String) {
        self.id = id
        self.title = title
        self.subtitle = subtitle
        self.icon = icon
        self.badge = badge
        self.category = category
    }
}

public struct SpotlightView: View {
    @Bindable var state: AppState
    @State private var query: String = ""
    @FocusState private var isSearchFocused: Bool

    public init(state: AppState) {
        self.state = state
    }

    private var allItems: [SpotlightItem] {
        var items: [SpotlightItem] = []

        // Navigation sections
        for section in NavigationSection.allCases {
            items.append(SpotlightItem(
                id: "nav_\(section.rawValue)",
                title: section.rawValue,
                subtitle: "Navigate to \(section.rawValue)",
                icon: sectionIcon(for: section),
                badge: "Page",
                category: "Pages"
            ))
        }

        // Quick Actions
        items.append(SpotlightItem(
            id: "act_trash_mode",
            title: state.deleteToTrash ? "Switch to Direct Delete Mode" : "Switch to Trash Mode",
            subtitle: state.deleteToTrash ? "Currently using macOS Trash (Safe)" : "Currently using Direct Permanent Deletion",
            icon: state.deleteToTrash ? "trash.slash" : "trash",
            badge: "Action",
            category: "Actions"
        ))

        items.append(SpotlightItem(
            id: "act_refresh",
            title: "Global Refresh / Rescan",
            subtitle: "Rescan active section and reload storage/system statistics",
            icon: "arrow.clockwise",
            badge: "Action",
            category: "Actions"
        ))

        items.append(SpotlightItem(
            id: "act_clean",
            title: "Quick Smart Clean",
            subtitle: "Navigate to System Clean and prepare cache purge",
            icon: "sparkles",
            badge: "Action",
            category: "Actions"
        ))

        items.append(SpotlightItem(
            id: "act_empty_trash",
            title: "Empty macOS Trash",
            subtitle: "Permanently obliterate all items sitting in Trash",
            icon: "trash.fill",
            badge: "Action",
            category: "Actions"
        ))

        // Installed Applications
        for app in state.installedApps {
            items.append(SpotlightItem(
                id: "app_\(app.path)",
                title: app.name,
                subtitle: "\(app.version) • \(app.formattedTotalSize) • Inspect in App Uninstaller",
                icon: "app.badge",
                badge: "App",
                category: "Applications"
            ))
        }

        return items
    }

    private var filteredItems: [SpotlightItem] {
        if query.trimmingCharacters(in: .whitespaces).isEmpty {
            return allItems
        }
        let lower = query.lowercased()
        return allItems.filter {
            $0.title.lowercased().contains(lower) ||
            $0.subtitle.lowercased().contains(lower) ||
            $0.category.lowercased().contains(lower)
        }
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Search Input Header
            HStack(spacing: 12) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 16))
                    .foregroundStyle(.secondary)

                TextField("Search pages, actions, installed apps...", text: $query)
                    .textFieldStyle(.plain)
                    .font(.system(size: 15))
                    .focused($isSearchFocused)

                if !query.isEmpty {
                    Button {
                        query = ""
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }

                HStack(spacing: 2) {
                    Text("ESC")
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, 5)
                .padding(.vertical, 2)
                .background(Color.secondary.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 4))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(Color(nsColor: .controlBackgroundColor))

            Divider()

            // Search Results List
            if filteredItems.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 24))
                        .foregroundStyle(.tertiary)
                    Text("No results matching '\(query)'")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding(32)
            } else {
                List(filteredItems) { item in
                    Button {
                        performAction(for: item)
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: item.icon)
                                .font(.system(size: 14))
                                .foregroundStyle(.secondary)
                                .frame(width: 22)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.title)
                                    .font(.system(size: 13, weight: .medium))
                                Text(item.subtitle)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                            }

                            Spacer()

                            if let badge = item.badge {
                                Text(badge)
                                    .font(.system(size: 10, weight: .medium))
                                    .foregroundStyle(.secondary)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.secondary.opacity(0.1))
                                    .clipShape(Capsule())
                            }

                            Image(systemName: "return")
                                .font(.system(size: 11))
                                .foregroundStyle(.tertiary)
                        }
                        .padding(.vertical, 3)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
                .listStyle(.inset)
            }
        }
        .frame(width: 540, height: 380)
        .onAppear {
            isSearchFocused = true
        }
    }

    private func performAction(for item: SpotlightItem) {
        state.isSpotlightOpen = false

        if item.id.starts(with: "nav_") {
            let sectionName = String(item.id.dropFirst(4))
            if let section = NavigationSection.allCases.first(where: { $0.rawValue == sectionName }) {
                state.selectedSection = section
            }
        } else if item.id == "act_trash_mode" {
            state.toggleDeleteToTrash()
        } else if item.id == "act_refresh" {
            Task { await state.triggerGlobalRefresh() }
        } else if item.id == "act_clean" {
            state.selectedSection = .systemClean
        } else if item.id == "act_empty_trash" {
            state.selectedSection = .trashManager
            Task { await state.emptyAllTrash() }
        } else if item.id.starts(with: "app_") {
            let appPath = String(item.id.dropFirst(4))
            if let app = state.installedApps.first(where: { $0.path == appPath }) {
                state.selectedSection = .appUninstaller
                state.selectedApp = app
            }
        }
    }

    private func sectionIcon(for section: NavigationSection) -> String {
        switch section {
        case .dashboard: return "square.grid.2x2"
        case .hardware: return "waveform.path.ecg"
        case .systemClean: return "sparkles"
        case .appUninstaller: return "app.badge"
        case .trashManager: return "trash"
        case .fileShredder: return "lock.shield"
        case .tidyUp: return "folder.badge.gearshape"
        case .largeFiles: return "doc.on.doc"
        case .quickReview: return "eye"
        case .diskVisualizer: return "chart.pie"
        case .similarPhotos: return "photo.stack"
        case .devWorkspace: return "hammer"
        case .gitSweeper: return "arrow.triangle.branch"
        case .startupItems: return "gearshape.2"
        case .zombiePorts: return "network"
        case .plugins: return "puzzlepiece"
        case .settings: return "gearshape"
        }
    }
}
