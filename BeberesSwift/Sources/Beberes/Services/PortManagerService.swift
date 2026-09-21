import Foundation
import Darwin

public actor PortManagerService {
    public init() {}

    public func listActivePorts() async -> [ZombiePort] {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/sbin/lsof")
        task.arguments = ["-iTCP", "-sTCP:LISTEN", "-P", "-n"]

        let pipe = Pipe()
        task.standardOutput = pipe
        task.standardError = Pipe()

        do {
            try task.run()
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            task.waitUntilExit()

            guard let output = String(data: data, encoding: .utf8) else {
                return []
            }

            var results: [ZombiePort] = []
            var seen = Set<String>()

            let lines = output.components(separatedBy: .newlines)
            // Skip the header line (COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME)
            for line in lines.dropFirst() {
                let parts = line.split(whereSeparator: { $0.isWhitespace }).map(String.init)
                guard parts.count >= 9 else { continue }

                let command = parts[0]
                guard let pid = Int32(parts[1]) else { continue }
                let user = parts[2]
                let name = parts[8] // e.g. *:3000 or 127.0.0.1:8080

                // Extract port number from name (after last colon)
                guard let colonIdx = name.lastIndex(of: ":"),
                      let port = Int(name[name.index(after: colonIdx)...]) else {
                    continue
                }

                let key = "\(port)_\(pid)"
                if seen.contains(key) { continue }
                seen.insert(key)

                let isProtected = SafetyGuard.isProtectedProcess(pid: pid, processName: command)

                results.append(ZombiePort(
                    port: port,
                    pid: pid,
                    processName: command,
                    protocolType: "TCP",
                    user: user,
                    command: command,
                    isProtected: isProtected
                ))
            }

            // Sort by port ascending
            return results.sorted(by: { $0.port < $1.port })
        } catch {
            return []
        }
    }

    public func killPortProcess(pid: Int32, force: Bool = false) async -> Result<Void, Error> {
        // Double-check safety guard
        if SafetyGuard.isProtectedProcess(pid: pid, processName: "") {
            return .failure(NSError(
                domain: "BeberesSecurity",
                code: 403,
                userInfo: [NSLocalizedDescriptionKey: "Refusing to kill protected system daemon (PID: \(pid))"]
            ))
        }

        let signal = force ? SIGKILL : SIGTERM
        let res = kill(pid, signal)
        if res == 0 {
            return .success(())
        } else {
            // If SIGTERM failed, try SIGKILL
            if !force {
                let killRes = kill(pid, SIGKILL)
                if killRes == 0 {
                    return .success(())
                }
            }
            return .failure(NSError(
                domain: "BeberesProcess",
                code: Int(errno),
                userInfo: [NSLocalizedDescriptionKey: "Failed to kill process (PID: \(pid)): errno \(errno)"]
            ))
        }
    }
}
