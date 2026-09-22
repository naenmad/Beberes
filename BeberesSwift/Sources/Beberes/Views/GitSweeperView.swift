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
            // Standard Native Page Header
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Git Sweeper")
                        .font(.title2.weight(.bold))
                    Text("Detect merged branches and maintain lightweight git repository metadata.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button {
                    Task { await runScan() }
                } label: {
                    Label(isScanning ? "Scanning..." : "Scan Repositories", systemImage: "arrow.clockwise")
                }
                .disabled(isScanning)
                .buttonStyle(.borderedProminent)
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)
            .padding(.bottom, 16)

            Divider()

            if let status = statusMessage {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle")
                        .foregroundStyle(.secondary)
                    Text(status)
                        .font(.subheadline)
                    Spacer()
                    Button("Dismiss") { statusMessage = nil }
                        .font(.caption)
                        .buttonStyle(.borderless)
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 8)
                .background(.bar)
                Divider()
            }

            if isScanning {
                VStack(spacing: 12) {
                    ProgressView()
                        .controlSize(.large)
                    Text("Scanning workspace roots for active Git repositories...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if repos.isEmpty {
                ContentUnavailableView(
                    "No Repositories Scanned",
                    systemImage: "arrow.triangle.branch",
                    description: Text("Scan your workspace roots to discover local repositories and prune merged branches.")
                )
            } else {
                // Summary bar
                HStack(spacing: 16) {
                    HStack(spacing: 6) {
                        Image(systemName: "folder")
                            .foregroundStyle(.secondary)
                        Text("\(repos.count) Repositories")
                            .font(.subheadline.weight(.medium))
                    }

                    Spacer()

                    HStack(spacing: 6) {
                        Image(systemName: "arrow.triangle.branch")
                            .foregroundStyle(.secondary)
                        Text("\(totalMergedBranchesCount) Stale Merged Branches")
                            .font(.subheadline.weight(.semibold))
                    }
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 10)
                .background(Color(nsColor: .controlBackgroundColor))

                Divider()

                // Repositories List
                List {
                    ForEach(repos) { repo in
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(alignment: .top) {
                                VStack(alignment: .leading, spacing: 2) {
                                    HStack(spacing: 8) {
                                        Text(repo.name)
                                            .font(.system(size: 13, weight: .semibold))

                                        Text(repo.activeBranch)
                                            .font(.caption2.monospaced())
                                            .padding(.horizontal, 5)
                                            .padding(.vertical, 1.5)
                                            .background(Color.secondary.opacity(0.12))
                                            .foregroundStyle(.secondary)
                                            .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))

                                        if repo.hasUncommittedChanges {
                                            Text("Modified")
                                                .font(.caption2)
                                                .foregroundStyle(.orange)
                                        }
                                    }

                                    Text(repo.path)
                                        .font(.caption2)
                                        .foregroundStyle(.tertiary)
                                        .lineLimit(1)
                                }

                                Spacer()

                                VStack(alignment: .trailing, spacing: 4) {
                                    Text(".git: \(repo.formattedGitSize)")
                                        .font(.caption.monospacedDigit())
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
                                            Button("Prune Merged (\(repo.mergedBranches.count))", role: .destructive) {
                                                Task { await pruneRepo(repo) }
                                            }
                                            .buttonStyle(.bordered)
                                            .controlSize(.small)
                                        }
                                    }
                                }
                            }

                            // Merged branches list
                            if !repo.mergedBranches.isEmpty {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Merged into active branch:")
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)

                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 6) {
                                            ForEach(repo.mergedBranches, id: \.self) { branch in
                                                Text(branch)
                                                    .font(.caption2.monospaced())
                                                    .padding(.horizontal, 5)
                                                    .padding(.vertical, 1.5)
                                                    .background(Color.secondary.opacity(0.1))
                                                    .clipShape(RoundedRectangle(cornerRadius: 3, style: .continuous))
                                            }
                                        }
                                    }
                                }
                                .padding(8)
                                .background(Color(nsColor: .controlBackgroundColor).opacity(0.6))
                                .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
                .listStyle(.inset)
            }
        }
        .background(Color(nsColor: .windowBackgroundColor))
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
