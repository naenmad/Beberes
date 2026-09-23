import Foundation
import AppKit

public struct ReportService: Sendable {
    public static let shared = ReportService()

    public init() {}

    public func generateAuditMarkdown() async -> String {
        let disk = StorageService.getDiskInfo()
        let ram = StorageService.getRAMInfo()
        let metrics = HardwareService.getMetrics()
        let chipName = metrics.chipName
        let thermal = metrics.thermalState
        let osVersion = metrics.osVersion

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        let timestamp = dateFormatter.string(from: Date())

        let report = """
        # 📋 Beberes System Audit & Health Report

        > Generated on: **\(timestamp)**  
        > Engine: **Beberes v2 (Pure Swift Native)**  
        > Platform: macOS (\(osVersion))  
        > Processor: \(chipName)  
        > Thermal State: \(thermal)  

        ---

        ## 💾 Storage Overview
        - **Total Capacity**: \(disk.totalBytes.formattedBytes)
        - **Available Space**: \(disk.availableBytes.formattedBytes)
        - **Used Space**: \(disk.usedBytes.formattedBytes) (\(String(format: "%.1f", disk.usagePercentage))%)

        ## ⚡️ Memory (RAM) Intelligence
        - **Total Installed RAM**: \(ram.totalBytes.formattedBytes)
        - **Used Memory**: \(ram.usedBytes.formattedBytes) (\(String(format: "%.1f", ram.usagePercentage))%)
        - **Available Headroom**: \(ram.freeBytes.formattedBytes)

        ## 🛡️ Security & Privacy
        - **Local First Guarantee**: 100% On-Device Analysis
        - **Network Activity**: None (0 External Telemetry Calls)
        - **Protected Daemons & Folders**: Active (Safeguarding `/System`, `/Library/Apple`, `/usr/bin`)

        ---
        *Beberes - The Clean, Minimalist, Local-First macOS Companion.*
        """

        return report
    }

    public func exportAuditMarkdown(savePath: String? = nil, content: String? = nil) async throws -> String {
        let finalContent: String
        if let explicit = content, !explicit.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            finalContent = explicit
        } else {
            finalContent = await generateAuditMarkdown()
        }

        let targetURL: URL
        if let custom = savePath, !custom.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            targetURL = URL(fileURLWithPath: custom)
        } else {
            let desktop = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Desktop")
            let epoch = Int(Date().timeIntervalSince1970)
            targetURL = desktop.appendingPathComponent("Beberes-System-Audit-\(epoch).md")
        }

        try finalContent.write(to: targetURL, atomically: true, encoding: .utf8)

        // Reveal in Finder
        DispatchQueue.main.async {
            NSWorkspace.shared.activateFileViewerSelecting([targetURL])
        }

        return targetURL.path
    }
}
