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
        VStack(spacing: 0) {

            Form {
                if let note = statusNote {
                    Section {
                        Label(note, systemImage: "checkmark.circle")
                            .foregroundStyle(.secondary)
                    }
                }

                Section("General") {
                    Toggle("Launch at Login", isOn: $launchAtLogin)
                        .onChange(of: launchAtLogin) { _, newValue in
                            updateLaunchAtLogin(enabled: newValue)
                        }

                    Toggle("Preserve Native Put-Back Capability", isOn: $putBackEnabled)
                }

                Section("Developer Workspace") {
                    Picker("Dormancy Threshold", selection: $devInactivityDays) {
                        Text("30 Days").tag(30)
                        Text("60 Days").tag(60)
                        Text("90 Days").tag(90)
                    }
                }

                Section("Safety Whitelist") {
                    Text("Protected system directories are safeguarded from deletion:")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    ForEach(["/System", "/Library/Apple", "/usr/bin", "/bin", "/sbin", "/private/var/db"], id: \.self) { path in
                        HStack {
                            Image(systemName: "lock.shield")
                                .foregroundStyle(.secondary)
                            Text(path)
                                .font(.system(.body, design: .monospaced))
                        }
                    }
                }
            }
            .formStyle(.grouped)
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .navigationTitle("Settings")
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
