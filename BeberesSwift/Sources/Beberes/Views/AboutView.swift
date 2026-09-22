import SwiftUI

public struct AboutView: View {
    @Environment(\.dismiss) private var dismiss

    public init() {}

    public var body: some View {
        VStack(spacing: 14) {
            // App Icon
            AppIconView(size: 72, cornerRadius: 16)
                .padding(.top, 8)

            // App Name & Version
            VStack(spacing: 3) {
                Text("Beberes")
                    .font(.system(size: 18, weight: .bold))

                Text("Version 2.0 (2026)")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }

            Text("Native macOS system cleaner and developer storage optimizer.")
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 20)

            Spacer(minLength: 0)

            VStack(spacing: 2) {
                Text("Swift 6 • SwiftUI Native")
                    .font(.system(size: 10))
                    .foregroundStyle(.tertiary)
                Text("Open source under GPL-3.0 License")
                    .font(.system(size: 10))
                    .foregroundStyle(.tertiary)
            }

            Button("OK") {
                dismiss()
            }
            .keyboardShortcut(.defaultAction)
            .controlSize(.regular)
            .padding(.bottom, 6)
        }
        .padding(20)
        .frame(width: 300, height: 260)
    }
}
