import SwiftUI

public struct GitSweeperView: View {
    @Bindable var state: AppState
    @State private var repos: [GitRepoItem] = []
    @State private var isScanning = false
    @State private var statusMessage: String?
    @State private var selectedRepoPath: String?

    public init(state: AppState) {
        self.state = state
    }

    private var defaultScanRoots: [URL] {
        let home = FileManager.default.homeDirectoryForCurrentUser
        return [
            home.appendingPathComponent("Developer"),
            home.appendingPathComponent("Projects"),
            home.appendingPathComponent("Documents"),
            home.appendingPathComponent("Workspace")
        ]
    }

    private var totalMergedBranchesCount: Int {
        repos.reduce(0) { $0 + $1.mergedBranches.count }
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Header Bar
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Git Sweeper")
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                    Text("Detect merged branches and maintain lightweight git repository metadata.")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button {
                    Task { await runScan() }
                } label: {
                    Label(isScanning ? "Scanning Repositories..." : "Scan Repositories", systemImage: "arrow.clockwise")
                }
                .disabled(isScanning)
                .buttonStyle(.borderedProminent)
            }
            .padding(.horizontal, 24)
            .padding(.top, 18)
            .padding(.bottom, 14)

            Divider()

            if isScanning {
                VStack(spacing: 12) {
                    ProgressView()
                        .controlSize(.large)
                    Text("Scanning workspace roots for active Git repositories...")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if repos.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "arrow.triangle.branch")
                        .font(.system(size: 36))
                        .foregroundStyle(.secondary)
                    Text("Click Scan Repositories to analyze git branches in ~/Developer and ~/Projects.")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                // Summary bar
                HStack(spacing: 16) {
                    HStack(spacing: 8) {
                        Image(systemName: "folder.fill")
                            .foregroundStyle(Color.accentColor)
                        Text("\(repos.count) Git Repositories Discovered")
                            .font(.system(size: 12, weight: .medium))
                    }

                    Spacer()

                    HStack(spacing: 8) {
                        Image(systemName: "arrow.triangle.branch")
                            .foregroundStyle(totalMergedBranchesCount > 0 ? Color(red: 239/255, green: 68/255, blue: 68/255) : Color.secondary)
                        Text("\(totalMergedBranchesCount) Stale Merged Branches")
                            .font(.system(size: 12, weight: .semibold))
                    }
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 10)
                .background(Color(nsColor: .controlBackgroundColor))

                Divider()

                if let status = statusMessage {
                    HStack(spacing: 8) {
                        Image(systemName: "info.circle")
                            .foregroundStyle(Color.accentColor)
                        Text(status)
                            .font(.system(size: 11))
                        Spacer()
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Color.accentColor.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    .padding(.horizontal, 24)
                    .padding(.top, 10)
                }

                // Repositories List
                List {
                    ForEach(repos) { repo in
                        VStack(alignment: .leading, spacing: 10) {
                            HStack(alignment: .top) {
                                VStack(alignment: .leading, spacing: 3) {
                                    HStack(spacing: 8) {
                                        Text(repo.name)
                                            .font(.system(size: 14, weight: .bold))

                                        Text(repo.activeBranch)
                                            .font(.system(size: 10, weight: .semibold, design: .monospaced))
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(Color.accentColor.opacity(0.15))
                                            .foregroundStyle(Color.accentColor)
                                            .clipShape(Capsule())

                                        if repo.hasUncommittedChanges {
                                            Text("Uncommitted Changes")
                                                .font(.system(size: 9, weight: .semibold))
                                                .padding(.horizontal, 5)
                                                .padding(.vertical, 1.5)
                                                .background(Color.orange.opacity(0.15))
                                                .foregroundStyle(Color.orange)
                                                .clipShape(Capsule())
                                        }
                                    }

                                    Text(repo.path)
                                        .font(.system(size: 11))
                                        .foregroundStyle(.secondary)
                                        .lineLimit(1)
                                }

                                Spacer()

                                VStack(alignment: .trailing, spacing: 4) {
                                    Text(".git size: \(repo.formattedGitSize)")
                                        .font(.system(size: 11, design: .monospaced))
                                        .foregroundStyle(.secondary)

                                    HStack(spacing: 6) {
                                        Button {
                                            NSWorkspace.shared.selectFile(repo.path, inFileViewerRootedAtPath: "")
                                        } label: {
                                            Image(systemName: "magnifyingglass")
                                                .font(.system(size: 11))
                                        }
                                        .buttonStyle(.borderless)
                                        .help("Reveal in Finder")

                                        if !repo.mergedBranches.isEmpty {
                                            Button("Prune Merged (\(repo.mergedBranches.count))") {
                                                Task { await pruneRepo(repo) }
                                            }
                                            .buttonStyle(.borderedProminent)
                                            .tint(Color(red: 239/255, green: 68/255, blue: 68/255))
                                            .controlSize(.small)
                                        }
                                    }
                                }
                            }

                            // Merged branches list
                            if !repo.mergedBranches.isEmpty {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Safe to delete (already merged into active branch):")
                                        .font(.system(size: 10, weight: .medium))
                                        .foregroundStyle(.secondary)

                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 6) {
                                            ForEach(repo.mergedBranches, id: \.self) { branch in
                                                Text(branch)
                                                    .font(.system(size: 10, design: .monospaced))
                                                    .padding(.horizontal, 6)
                                                    .padding(.vertical, 2)
                                                    .background(Color.secondary.opacity(0.12))
                                                    .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
                                            }
                                        }
                                    }
                                }
                                .padding(8)
                                .background(Color(nsColor: .controlBackgroundColor).opacity(0.7))
                                .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                            }
                        }
                        .padding(.vertical, 6)
                    }
                }
                .listStyle(.inset)
            }
        }
        .task {
            if repos.isEmpty {
                await runScan()
            }
        }
    }

    private func runScan() async {
        isScanning = true
        statusMessage = nil
        repos = await GitSweeperService.shared.scanRepositories(searchRoots: defaultScanRoots)
        isScanning = false
    }

    private func pruneRepo(_ repo: GitRepoItem) async {
        let (deleted, errors) = await GitSweeperService.shared.pruneBranches(repo.mergedBranches, in: repo.path)
        if !deleted.isEmpty {
            statusMessage = "Pruned \(deleted.count) merged branches in \(repo.name)."
        } else if let firstErr = errors.first {
            statusMessage = "Prune error: \(firstErr)"
        }
        await runScan()
    }
}
