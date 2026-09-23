import SwiftUI

public struct AboutView: View {
    @Environment(\.dismiss) private var dismiss

    public init() {}

    public var body: some View {
        VStack(spacing: 0) {
            // Header Section
            VStack(spacing: 12) {
                AppIconView(size: 68, cornerRadius: 16)
                    .shadow(color: .black.opacity(0.12), radius: 8, y: 3)

                VStack(spacing: 4) {
                    Text("Beberes")
                        .font(.system(size: 22, weight: .bold))

                    HStack(spacing: 6) {
                        Text("v2.0.0")
                            .font(.system(size: 11, weight: .semibold, design: .monospaced))
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.secondary.opacity(0.12))
                            .clipShape(Capsule())

                        Text("Tahura")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.secondary.opacity(0.08))
                            .clipShape(Capsule())
                    }

                    Text("High-Performance System Cleaner & Storage Optimizer for macOS and Developers.")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                        .padding(.top, 4)
                }
            }
            .padding(.top, 24)
            .padding(.bottom, 16)

            Divider()

            // Info Highlights Cards
            VStack(spacing: 12) {
                HStack(spacing: 12) {
                    // Core Engine Card
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 6) {
                            Image(systemName: "cpu")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(.secondary)
                            Text("Core Engine")
                                .font(.system(size: 12, weight: .semibold))
                        }
                        Text("Swift 6 & SwiftUI Native")
                            .font(.system(size: 11))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(Color(nsColor: .controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                    // Privacy First Card
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 6) {
                            Image(systemName: "lock.shield")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(.secondary)
                            Text("Privacy First")
                                .font(.system(size: 12, weight: .semibold))
                        }
                        Text("100% On-Device & Offline")
                            .font(.system(size: 11))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(Color(nsColor: .controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }

                // Safety Highlights Group
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark.seal")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(.secondary)
                        Text("Safety & Precision Highlights")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(.secondary)
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        HighlightRow(text: "Native macOS Trash integration with put-back capability")
                        HighlightRow(text: "Protected system whitelist prevents accidental OS damage")
                        HighlightRow(text: "Smart dev workspace cleaner for node_modules, build, and caches")
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(Color(nsColor: .controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)

            Spacer(minLength: 0)

            Divider()

            // Footer
            HStack {
                Link(destination: URL(string: "https://github.com/naenmad/Beberes")!) {
                    HStack(spacing: 4) {
                        Image(systemName: "link")
                            .font(.system(size: 11))
                        Text("GitHub Repository")
                            .font(.system(size: 11))
                    }
                }
                .buttonStyle(.link)

                Spacer()

                Text("GPL-3.0 License")
                    .font(.system(size: 11))
                    .foregroundStyle(.tertiary)

                Button("Done") {
                    dismiss()
                }
                .keyboardShortcut(.defaultAction)
                .controlSize(.regular)
                .padding(.leading, 8)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(Color(nsColor: .windowBackgroundColor))
        }
        .frame(width: 440, height: 430)
    }
}

private struct HighlightRow: View {
    let text: String

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
            Text(text)
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
    }
}
