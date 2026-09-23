import SwiftUI
import ServiceManagement

public struct SettingsView: View {
    @Bindable var state: AppState
    @State private var launchAtLogin = false
    @State private var devInactivityDays: Int = 30
    @State private var putBackEnabled = true
    @State private var statusNote: String?

    // Scheduler states
    @State private var scheduleConfig = ScheduleConfig()
    @State private var isRunningScheduledClean = false

    // CLI states
    @State private var isCLIInstalled = false

    // Export states
    @State private var isExportingReport = false

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

                generalSection
                schedulerSection
                cliCompanionSection
                diagnosticReportSection
                developerSection
                safetyWhitelistSection
            }
            .formStyle(.grouped)
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .navigationTitle("Settings")
        .onAppear {
            loadInitialStates()
        }
    }

    @ViewBuilder
    private var generalSection: some View {
        Section("General") {
            Toggle("Launch at Login", isOn: $launchAtLogin)
                .onChange(of: launchAtLogin) { _, newValue in
                    updateLaunchAtLogin(enabled: newValue)
                }

            Toggle("Preserve Native Put-Back Capability", isOn: $putBackEnabled)

            HStack {
                Text("App Location")
                Spacer()
                if AppRelocatorService.shared.isInApplicationsFolder {
                    Label("/Applications", systemImage: "checkmark.seal.fill")
                        .foregroundStyle(.green)
                        .font(.caption)
                } else {
                    Button("Move to /Applications") {
                        try? AppRelocatorService.shared.relocateToApplicationsAndRelaunch()
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                }
            }
        }
    }

    @ViewBuilder
    private var schedulerSection: some View {
        Section("Automated Background Scheduler (LaunchAgent)") {
            Toggle("Enable Automated Background Cleaning", isOn: $scheduleConfig.enabled)
                .onChange(of: scheduleConfig.enabled) { _, _ in
                    saveSchedule()
                }

            if scheduleConfig.enabled {
                Picker("Frequency", selection: $scheduleConfig.intervalType) {
                    Text("Daily").tag("daily")
                    Text("Weekly").tag("weekly")
                    Text("Monthly").tag("monthly")
                }
                .onChange(of: scheduleConfig.intervalType) { _, _ in
                    saveSchedule()
                }

                Toggle("Purge Old Trash (>30 Days)", isOn: Binding(
                    get: { scheduleConfig.cleanTrashOlderDays > 0 },
                    set: { scheduleConfig.cleanTrashOlderDays = $0 ? 30 : 0; saveSchedule() }
                ))

                Toggle("Clean Xcode DerivedData", isOn: $scheduleConfig.cleanXcodeDerivedData)
                    .onChange(of: scheduleConfig.cleanXcodeDerivedData) { _, _ in
                        saveSchedule()
                    }

                Toggle("Clean System & App Logs", isOn: $scheduleConfig.cleanSystemLogs)
                    .onChange(of: scheduleConfig.cleanSystemLogs) { _, _ in
                        saveSchedule()
                    }
            }

            Button {
                triggerManualScheduledClean()
            } label: {
                if isRunningScheduledClean {
                    ProgressView().controlSize(.small)
                } else {
                    Label("Run Scheduled Clean Now", systemImage: "play.circle")
                }
            }
            .disabled(isRunningScheduledClean)
        }
    }

    @ViewBuilder
    private var cliCompanionSection: some View {
        Section("CLI Companion Tool (Terminal Mode)") {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Command Line Interface (`beberes`)")
                        .font(.body)
                    Text("Run `beberes status`, `beberes clean`, or `beberes doctor` in Terminal")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if isCLIInstalled {
                    Label("Installed", systemImage: "terminal.fill")
                        .foregroundStyle(.green)
                        .font(.caption)
                } else {
                    Button("Install to ~/.local/bin") {
                        installCLI()
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
                }
            }
        }
    }

    @ViewBuilder
    private var diagnosticReportSection: some View {
        Section("Diagnostics & Auditing") {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("System Health & Audit Report")
                        .font(.body)
                    Text("Export Markdown diagnostic file with storage, memory, and thermal state")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button {
                    exportReport()
                } label: {
                    if isExportingReport {
                        ProgressView().controlSize(.small)
                    } else {
                        Label("Export to Desktop", systemImage: "arrow.down.doc")
                    }
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
                .disabled(isExportingReport)
            }
        }
    }

    @ViewBuilder
    private var developerSection: some View {
        Section("Developer Workspace") {
            Picker("Dormancy Threshold", selection: $devInactivityDays) {
                Text("30 Days").tag(30)
                Text("60 Days").tag(60)
                Text("90 Days").tag(90)
            }
        }
    }

    @ViewBuilder
    private var safetyWhitelistSection: some View {
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

    private func loadInitialStates() {
        checkLaunchAtLoginStatus()
        scheduleConfig = SchedulerService.shared.loadConfig()
        isCLIInstalled = CLIService.shared.isInstalled
    }

    private func saveSchedule() {
        do {
            try SchedulerService.shared.saveConfig(scheduleConfig)
            statusNote = scheduleConfig.enabled ? "Scheduled background cleaner active." : "Scheduler disabled."
        } catch {
            statusNote = "Failed to update scheduler: \(error.localizedDescription)"
        }
    }

    private func triggerManualScheduledClean() {
        isRunningScheduledClean = true
        DispatchQueue.global(qos: .userInitiated).async {
            let res = SchedulerService.shared.triggerScheduledCleanNow()
            DispatchQueue.main.async {
                isRunningScheduledClean = false
                statusNote = res.message
            }
        }
    }

    private func installCLI() {
        switch CLIService.shared.installSymlink() {
        case .success(let msg):
            isCLIInstalled = true
            statusNote = msg
        case .failure(let err):
            statusNote = "Installation error: \(err.localizedDescription)"
        }
    }

    private func exportReport() {
        isExportingReport = true
        Task {
            do {
                let savedPath = try await ReportService.shared.exportAuditMarkdown()
                await MainActor.run {
                    isExportingReport = false
                    statusNote = "Exported report to \(URL(fileURLWithPath: savedPath).lastPathComponent)"
                }
            } catch {
                await MainActor.run {
                    isExportingReport = false
                    statusNote = "Export failed: \(error.localizedDescription)"
                }
            }
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
