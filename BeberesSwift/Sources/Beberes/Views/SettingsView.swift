import SwiftUI
import ServiceManagement

public struct SettingsView: View {
    @Bindable var state: AppState
    @State private var launchAtLogin = false
    @State private var devInactivityDays: Int = 30
    @State private var putBackEnabled = true
    @State private var statusNote: String?

    public init(state: AppState) {
        self.state = state
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                // Header
                VStack(alignment: .leading, spacing: 3) {
                    Text("Settings")
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                    Text("Configure system integration, safety guards, and developer preferences.")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }

                Divider()

                if let note = statusNote {
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(Color(red: 16/255, green: 185/255, blue: 129/255))
                        Text(note)
                            .font(.system(size: 11))
                        Spacer()
                    }
                    .padding(10)
                    .background(Color(red: 16/255, green: 185/255, blue: 129/255).opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                }

                // General Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("GENERAL")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.secondary)

                    VStack(spacing: 0) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Launch at Login")
                                    .font(.system(size: 13, weight: .medium))
                                Text("Automatically start Beberes in the background when logging into macOS.")
                                    .font(.system(size: 11))
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Toggle("", isOn: $launchAtLogin)
                                .labelsHidden()
                                .onChange(of: launchAtLogin) { _, newValue in
                                    updateLaunchAtLogin(enabled: newValue)
                                }
                        }
                        .padding(14)

                        Divider()

                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Preserve Native Put-Back Capability")
                                    .font(.system(size: 13, weight: .medium))
                                Text("Use Finder Trash integration so any cleaned item can be restored via macOS Put Back.")
                                    .font(.system(size: 11))
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Toggle("", isOn: $putBackEnabled)
                                .labelsHidden()
                        }
                        .padding(14)
                    }
                    .background(Color(nsColor: .controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }

                // Developer Tools Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("DEVELOPER WORKSPACE")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.secondary)

                    VStack(spacing: 0) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Dormancy Threshold")
                                    .font(.system(size: 13, weight: .medium))
                                Text("Flag build artifacts as dormant when a project has had no git commits for this period.")
                                    .font(.system(size: 11))
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Picker("", selection: $devInactivityDays) {
                                Text("30 Days").tag(30)
                                Text("60 Days").tag(60)
                                Text("90 Days").tag(90)
                            }
                            .frame(width: 120)
                            .labelsHidden()
                        }
                        .padding(14)
                    }
                    .background(Color(nsColor: .controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }

                // Safety Guard Whitelist
                VStack(alignment: .leading, spacing: 12) {
                    Text("SYSTEM SAFETY WHITELIST")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.secondary)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Beberes SafetyGuard strictly prevents file deletion, shredding, or modification inside essential operating system directories:")
                            .font(.system(size: 11))
                            .foregroundStyle(.secondary)

                        VStack(alignment: .leading, spacing: 4) {
                            ForEach(["/System", "/Library/Apple", "/usr/bin", "/bin", "/sbin", "/private/var/db"], id: \.self) { path in
                                HStack(spacing: 6) {
                                    Image(systemName: "lock.shield.fill")
                                        .font(.system(size: 10))
                                        .foregroundStyle(Color(red: 16/255, green: 185/255, blue: 129/255))
                                    Text(path)
                                        .font(.system(size: 11, design: .monospaced))
                                }
                            }
                        }
                        .padding(.top, 4)
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(nsColor: .controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
            }
            .padding(24)
        }
        .onAppear {
            checkLaunchAtLoginStatus()
        }
    }

    private func checkLaunchAtLoginStatus() {
        if #available(macOS 13.0, *) {
            launchAtLogin = SMAppService.mainApp.status == .enabled
        }
    }

    private func updateLaunchAtLogin(enabled: Bool) {
        if #available(macOS 13.0, *) {
            do {
                if enabled {
                    try SMAppService.mainApp.register()
                    statusNote = "Launch at login enabled."
                } else {
                    try SMAppService.mainApp.unregister()
                    statusNote = "Launch at login disabled."
                }
            } catch {
                statusNote = "Could not change login item: \(error.localizedDescription)"
            }
        }
    }
}
