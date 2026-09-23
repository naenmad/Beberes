import SwiftUI

public enum StatusStateType {
    case clean(systemImage: String = "checkmark.circle")
    case ready(systemImage: String)
    case searchEmpty(query: String)
}

public struct StatusStateView: View {
    public let type: StatusStateType
    public let title: String
    public let subtitle: String
    public let actionTitle: String?
    public let actionIcon: String?
    public let action: (() -> Void)?

    public init(
        type: StatusStateType = .clean(),
        title: String,
        subtitle: String,
        actionTitle: String? = nil,
        actionIcon: String? = nil,
        action: (() -> Void)? = nil
    ) {
        self.type = type
        self.title = title
        self.subtitle = subtitle
        self.actionTitle = actionTitle
        self.actionIcon = actionIcon
        self.action = action
    }

    private var iconName: String {
        switch type {
        case .clean(let img):
            return img
        case .ready(let img):
            return img
        case .searchEmpty:
            return "magnifyingglass"
        }
    }

    public var body: some View {
        VStack(spacing: 16) {
            // Calm Icon Container
            ZStack {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Color(nsColor: .controlBackgroundColor))
                    .frame(width: 56, height: 56)
                    .shadow(color: .black.opacity(0.04), radius: 4, y: 2)

                Image(systemName: iconName)
                    .font(.system(size: 24, weight: .regular))
                    .foregroundStyle(.secondary)
            }

            VStack(spacing: 4) {
                Text(title)
                    .font(.system(size: 15, weight: .semibold))

                Text(subtitle)
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 360)
            }

            if let actionTitle, let action {
                Button {
                    action()
                } label: {
                    HStack(spacing: 6) {
                        if let actionIcon {
                            Image(systemName: actionIcon)
                                .font(.system(size: 11))
                        }
                        Text(actionTitle)
                            .font(.system(size: 12, weight: .medium))
                    }
                }
                .buttonStyle(.bordered)
                .controlSize(.regular)
                .padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(24)
    }
}
