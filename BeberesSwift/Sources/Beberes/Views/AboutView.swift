import SwiftUI

public struct AboutView: View {
    @Environment(\.dismiss) private var dismiss

    public init() {}

    public var body: some View {
        VStack(spacing: 0) {
            // Header with authentic logo
            VStack(spacing: 8) {
                HStack {
                    Spacer()
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(.secondary)
                            .padding(6)
                            .background(Color.secondary.opacity(0.12))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                }

                AppIconView(size: 64, cornerRadius: 14)

                VStack(spacing: 4) {
                    Text("Beberes")
                        .font(.system(size: 20, weight: .bold, design: .rounded))

                    HStack(spacing: 6) {
                        Text("v2.0")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundStyle(Color(red: 16/255, green: 185/255, blue: 129/255))
                        Text("Chandra SwiftUI")
                            .font(.system(size: 10, weight: .medium))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(red: 16/255, green: 185/255, blue: 129/255).opacity(0.15))
                            .foregroundStyle(Color(red: 16/255, green: 185/255, blue: 129/255))
                            .clipShape(Capsule())
                    }

                    Text("High-Performance System Cleaner and Storage Optimizer for macOS and Developers.")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 16)
                        .padding(.top, 2)
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 16)
            .background(Color(nsColor: .windowBackgroundColor))

            Divider()

            // Key Highlights
            VStack(spacing: 12) {
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 6) {
                            Image(systemName: "cpu")
                                .foregroundStyle(Color.accentColor)
                            Text("Core Engine")
                                .font(.system(size: 11, weight: .semibold))
                        }
                        Text("Swift 6 and Pure SwiftUI Native")
                            .font(.system(size: 10))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(10)
                    .background(Color(nsColor: .controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 6) {
                            Image(systemName: "lock.shield")
                                .foregroundStyle(Color(red: 16/255, green: 185/255, blue: 129/255))
                            Text("Privacy First")
                                .font(.system(size: 11, weight: .semibold))
                        }
                        Text("100% On-Device, Fully Offline")
                            .font(.system(size: 10))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(10)
                    .background(Color(nsColor: .controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }

                // Safety specs
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark.seal")
                            .foregroundStyle(Color.accentColor)
                        Text("Safety and Precision Highlights")
                            .font(.system(size: 11, weight: .semibold))
                    }

                    VStack(alignment: .leading, spacing: 5) {
                        Label("Native macOS Trash integration with put-back capability", systemImage: "checkmark.circle.fill")
                        Label("Protected system whitelist prevents accidental OS damage", systemImage: "checkmark.circle.fill")
                        Label("Smart dev workspace cleaner for node_modules, venv, and build caches", systemImage: "checkmark.circle.fill")
                    }
                    .font(.system(size: 10))
                    .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(Color(nsColor: .controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                HStack {
                    Text("License: GPL-3.0 (Open Source)")
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("v2-swiftui build")
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 4)
            }
            .padding(18)

            Spacer(minLength: 0)

            // Footer
            HStack {
                Spacer()
                Button("Close") {
                    dismiss()
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.regular)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .background(Color(nsColor: .windowBackgroundColor))
        }
        .frame(width: 420, height: 430)
    }
}
