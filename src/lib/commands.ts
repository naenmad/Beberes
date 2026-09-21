import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import type { ScanCategory, DiskInfo, DiskDetail } from '../store/appStore';
export type { DiskDetail };

export interface CleanResult {
  cleaned: number;
  freedBytes: number;
  isSimulation?: boolean;
}

export interface TidyItem {
  id: string;
  path: string;
  name: string;
  size: number;
  lastModified: string;
  category: string;
  targetFolder: string;
  isRedundantInstaller: boolean;
  installedAppName?: string | null;
  selected?: boolean;
}

export interface TidyScanResult {
  sourcePath: string;
  items: TidyItem[];
  totalFiles: number;
  totalSize: number;
  redundantInstallersCount: number;
  redundantInstallersSize: number;
}

export interface TidyAction {
  itemPath: string;
  targetFolderName: string;
}

export interface TidyExecuteResult {
  movedCount: number;
  organizedBytes: number;
  isSimulation: boolean;
  errors: string[];
}

/**
 * Scan system directories (cache, logs, browser cache, trash).
 */
export async function scanSystemDirectories(): Promise<ScanCategory[]> {
  return await invoke<ScanCategory[]>('scan_system_directories');
}

/**
 * Scan developer workspace directories (node_modules, cargo target, xcode, package caches, docker).
 */
export async function scanDevWorkspaces(): Promise<ScanCategory[]> {
  return await invoke<ScanCategory[]>('scan_dev_workspaces');
}

/**
 * Get disk information (total, used, free space).
 */
export async function getDiskInfo(): Promise<DiskInfo> {
  return await invoke<DiskInfo>('get_disk_info');
}

/**
 * Get all detected storage disks and removable volumes.
 */
export async function getAllDisks(): Promise<DiskDetail[]> {
  return await invoke<DiskDetail[]>('get_all_disks');
}

/**
 * Get disk information for a specific mount point.
 */
export async function getDiskInfoByMount(mountPoint: string): Promise<DiskInfo> {
  return await invoke<DiskInfo>('get_disk_info_by_mount', { mountPoint });
}

/**
 * Clean selected items by their file paths.
 * Optional `dryRun` simulates the process without actually deleting.
 * Optional `useTrash` moves files to macOS Trash instead of permanent deletion.
 */
export async function cleanSelectedItems(
  paths: string[],
  dryRun: boolean = false,
  useTrash: boolean = false
): Promise<CleanResult> {
  return await invoke<CleanResult>('clean_selected_items', {
    paths,
    dryRun,
    useTrash,
  });
}

/**
 * Reveal a file or directory in macOS Finder / system file manager.
 */
export async function revealInFinder(path: string): Promise<void> {
  return await invoke<void>('reveal_in_finder', { path });
}

/**
 * Scan custom paths provided by the user.
 */
export async function scanCustomPaths(paths: string[]): Promise<ScanCategory[]> {
  return await invoke<ScanCategory[]>('scan_custom_paths', { paths });
}

/**
 * Open native system folder picker dialog and return chosen path (or null if cancelled).
 */
export async function pickFolder(): Promise<string | null> {
  const selected = await openDialog({
    directory: true,
    multiple: false,
    title: 'Select Directory',
  });
  if (!selected) return null;
  return Array.isArray(selected) ? (selected[0] ?? null) : selected;
}

/**
 * Open native system file picker dialog allowing multiple selection.
 */
export async function pickFiles(): Promise<string[]> {
  const selected = await openDialog({
    directory: false,
    multiple: true,
    title: 'Select Files to Shred',
  });
  if (!selected) return [];
  return Array.isArray(selected) ? selected : [selected];
}

/**
 * Scan a directory for loose unorganized files and redundant installers.
 */
export async function scanTidyDirectory(path: string): Promise<TidyScanResult> {
  return await invoke<TidyScanResult>('scan_tidy_directory', { path });
}

/**
 * Execute organization by moving selected files into category folders.
 */
export async function executeTidyOrganization(
  sourceDir: string,
  actions: TidyAction[],
  dryRun: boolean = false
): Promise<TidyExecuteResult> {
  return await invoke<TidyExecuteResult>('execute_tidy_organization', {
    sourceDir,
    actions,
    dryRun,
  });
}

/**
 * Delete or trash redundant installer files.
 */
export async function cleanRedundantInstallers(
  paths: string[],
  dryRun: boolean = false,
  useTrash: boolean = true
): Promise<CleanResult> {
  return await invoke<CleanResult>('clean_redundant_installers', {
    paths,
    dryRun,
    useTrash,
  });
}

export interface AppLeftoverItem {
  path: string;
  name: string;
  kind: string; // 'app_support' | 'cache' | 'preferences' | 'saved_state' | 'container'
  size: number;
}

export interface AppItem {
  id: string;
  name: string;
  bundleId: string;
  version: string;
  path: string;
  appSize: number;
  leftoversSize: number;
  totalSize: number;
  lastModified: string;
  isSystemApp: boolean;
  icon?: string | null;
  leftovers: AppLeftoverItem[];
}

export interface UninstallResult {
  freedBytes: number;
  deletedCount: number;
  isSimulation: boolean;
  errors: string[];
}

/**
 * Scan all installed applications and their residual leftover files.
 */
export async function scanInstalledApps(): Promise<AppItem[]> {
  return await invoke<AppItem[]>('scan_installed_apps');
}

/**
 * Safely uninstall an application and its chosen residual leftover files.
 */
export async function uninstallApp(
  appPath: string,
  leftoverPaths: string[],
  dryRun: boolean = false,
  useTrash: boolean = true
): Promise<UninstallResult> {
  return await invoke<UninstallResult>('uninstall_app', {
    appPath,
    leftoverPaths,
    dryRun,
    useTrash,
  });
}

export interface SystemDetails {
  osName: string;
  osVersion: string;
  arch: string;
  hostname: string;
  kernelVersion: string;
  fileSystem: string;
  iconCacheCount: number;
  iconCacheBytes: number;
}

/**
 * Get macOS hardware and system specification details.
 */
export async function getSystemDetails(): Promise<SystemDetails> {
  return await invoke<SystemDetails>('get_system_details');
}

/**
 * Clear cached application icons from disk (~/.cache/beberes/icons).
 */
export async function clearIconCache(): Promise<number> {
  return await invoke<number>('clear_icon_cache');
}

export interface ReviewFileItem {
  id: string;
  name: string;
  path: string;
  size: number;
  extension: string;
  kind: string;
  dimensions?: string | null;
  last_modified: string;
  created: string;
}

export interface ReviewScanResult {
  directory_path: string;
  directory_name: string;
  total_files: number;
  total_size: number;
  items: ReviewFileItem[];
}

/**
 * Scan directory files for Quick Review triage.
 */
export async function scanReviewFiles(
  directory: string,
  filterType?: string
): Promise<ReviewScanResult> {
  return await invoke<ReviewScanResult>('scan_review_files', {
    directory,
    filterType,
  });
}

/**
 * Read thumbnail/preview as base64 data URL for images.
 */
export async function readFileThumbnail(path: string): Promise<string> {
  return await invoke<string>('read_file_thumbnail', { path });
}

/**
 * Read snippet of text file for inline code/text preview.
 */
export async function readTextPreview(path: string, maxBytes?: number): Promise<string> {
  return await invoke<string>('read_text_preview', { path, maxBytes });
}

/**
 * Open any file with its default system application via tauri opener.
 */
export async function openFileWithDefaultApp(path: string): Promise<void> {
  try {
    const { openPath } = await import('@tauri-apps/plugin-opener');
    await openPath(path);
  } catch (err) {
    console.error('Failed to open file in default app:', err);
  }
}

/**
 * Rename a file on disk.
 */
export async function renameFile(oldPath: string, newName: string): Promise<string> {
  return await invoke<string>('rename_file', { oldPath, newName });
}

export interface FileMetadataItem {
  id: string;
  name: string;
  path: string;
  size: number;
  extension: string;
  kind: string;
  last_modified: string;
  days_old: number;
}

export interface DuplicateGroup {
  id: string;
  file_size: number;
  total_wasted_size: number;
  items: FileMetadataItem[];
}

export interface FinderScanResult {
  large_files: FileMetadataItem[];
  duplicate_groups: DuplicateGroup[];
  old_files: FileMetadataItem[];
  total_large_size: number;
  total_duplicate_wasted_size: number;
  total_old_size: number;
}

/**
 * Scan for large files, duplicate groups, and old untouched files.
 */
export async function scanFinderItems(
  minLargeSizeMb?: number,
  scanFolders?: string[]
): Promise<FinderScanResult> {
  return await invoke<FinderScanResult>('scan_finder_items', {
    minLargeSizeMb,
    scanFolders,
  });
}

export interface TrashItem {
  id: string;
  name: string;
  path: string;
  size: number;
  kind: string;
  is_dir: boolean;
  date_deleted: string;
}

export interface TrashScanResult {
  total_items: number;
  total_size: number;
  items: TrashItem[];
  category_sizes: Record<string, number>;
  permission_denied?: boolean;
}

/**
 * Scan items in macOS Trash folder (~/.Trash).
 */
export async function scanTrashContents(): Promise<TrashScanResult> {
  return await invoke<TrashScanResult>('scan_trash_contents');
}

/**
 * Safely empty macOS Trash.
 */
export async function emptyMacTrash(): Promise<number> {
  return await invoke<number>('empty_mac_trash');
}

/**
 * Permanently delete specific items in Trash.
 */
export async function deleteSpecificTrashItems(paths: string[]): Promise<number> {
  return await invoke<number>('delete_specific_trash_items', { paths });
}

/**
 * Open macOS Privacy & Security Settings directly to Full Disk Access panel.
 */
export async function openFullDiskAccessSettings(): Promise<void> {
  return await invoke<void>('open_full_disk_access_settings');
}

/**
 * Open an external URL in the default browser.
 */
export async function openExternalUrl(url: string): Promise<void> {
  try {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
  } catch {
    window.open(url, '_blank');
  }
}

// ==========================================
// 1. Disk Visualizer Types & Commands
// ==========================================
export interface DiskTreeNode {
  id: string;
  name: string;
  path: string;
  size: number;
  isDir: boolean;
  children: DiskTreeNode[];
  fileCount: number;
}

export async function scanDirectoryTree(path: string, maxDepth?: number): Promise<DiskTreeNode> {
  return await invoke<DiskTreeNode>('scan_directory_tree', { path, maxDepth });
}

// ==========================================
// 2. Startup Items Types & Commands
// ==========================================
export interface StartupItem {
  id: string;
  name: string;
  label: string;
  path: string;
  program: string | null;
  isUser: boolean;
  isEnabled: boolean;
  fileSize: number;
  kindLabel: string;
}

export async function scanStartupItems(): Promise<StartupItem[]> {
  return await invoke<StartupItem[]>('scan_startup_items');
}

export async function toggleStartupItem(path: string, enable: boolean): Promise<boolean> {
  return await invoke<boolean>('toggle_startup_item', { path, enable });
}

export async function deleteStartupItem(path: string): Promise<boolean> {
  return await invoke<boolean>('delete_startup_item', { path });
}

// ==========================================
// 3. File Shredder Types & Commands
// ==========================================
export interface ShredResult {
  shreddedCount: number;
  totalBytes: number;
  errors: string[];
}

export async function shredPaths(paths: string[], passes?: number): Promise<ShredResult> {
  return await invoke<ShredResult>('shred_paths', { paths, passes });
}

// ==========================================
// 4. Git Repository Sweeper Types & Commands
// ==========================================
export interface GitRepoItem {
  id: string;
  name: string;
  path: string;
  gitFolderSize: number;
  activeBranch: string;
  mergedBranches: string[];
  uncommittedChanges: boolean;
  lastCommitDate: string;
}

export async function scanGitRepos(searchRoot?: string): Promise<GitRepoItem[]> {
  return await invoke<GitRepoItem[]>('scan_git_repos', { searchRoot });
}

export async function optimizeGitRepo(repoPath: string, deleteMergedBranches: boolean): Promise<number> {
  return await invoke<number>('optimize_git_repo', { repoPath, deleteMergedBranches });
}

// ==========================================
// 5. System Power & Lifecycle Commands
// ==========================================
export interface PowerStatus {
  is_on_battery: boolean;
  battery_percentage: number;
  is_throttled: boolean;
}

export async function exitApp(): Promise<void> {
  return await invoke<void>('exit_app');
}

export async function getSystemPowerStatus(): Promise<PowerStatus> {
  return await invoke<PowerStatus>('get_system_power_status');
}

// ==========================================
// 6. Application Relocation Commands
// ==========================================
export async function checkIsInApplicationsDir(): Promise<boolean> {
  return await invoke<boolean>('check_is_in_applications_dir');
}

export async function moveToApplicationsAndRelaunch(): Promise<void> {
  return await invoke<void>('move_to_applications_and_relaunch');
}

// ==========================================
// 7. APFS Local Snapshots Commands
// ==========================================
export interface ApfsSnapshotItem {
  id: string;
  name: string;
  date_str: string;
  estimated_size: number;
}

export interface ApfsSnapshotResult {
  total_snapshots: number;
  snapshots: ApfsSnapshotItem[];
}

export async function listApfsSnapshots(): Promise<ApfsSnapshotResult> {
  return await invoke<ApfsSnapshotResult>('list_apfs_snapshots');
}

export async function deleteApfsSnapshot(snapshotDate: string): Promise<boolean> {
  return await invoke<boolean>('delete_apfs_snapshot', { snapshotDate });
}

export async function deleteAllApfsSnapshots(): Promise<number> {
  return await invoke<number>('delete_all_apfs_snapshots');
}

// ==========================================
// 8. RAM Memory Optimizer Commands
// ==========================================
export interface MemoryStatus {
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  inactive_bytes: number;
  purgeable_bytes: number;
  used_percentage: number;
}

export interface MemoryPurgeResult {
  success: boolean;
  freed_bytes: number;
  before_used_bytes: number;
  after_used_bytes: number;
  message: string;
}

export async function getMemoryStatus(): Promise<MemoryStatus> {
  return await invoke<MemoryStatus>('get_memory_status');
}

export async function purgeInactiveMemory(): Promise<MemoryPurgeResult> {
  return await invoke<MemoryPurgeResult>('purge_inactive_memory');
}

// ==========================================
// 9. Deep Browser Cache Commands
// ==========================================
export async function scanBrowserCaches(): Promise<ScanCategory[]> {
  return await invoke<ScanCategory[]>('scan_browser_caches');
}

// ==========================================
// 10. Maintenance & Hygiene Commands
// ==========================================
export interface MaintenanceItem {
  id: string;
  path: string;
  name: string;
  kind: 'empty_folder' | 'broken_symlink';
  details: string;
}

export interface MaintenanceScanResult {
  scanned_path: string;
  empty_folders: MaintenanceItem[];
  broken_symlinks: MaintenanceItem[];
}

export async function scanMaintenanceItems(path: string): Promise<MaintenanceScanResult> {
  return await invoke<MaintenanceScanResult>('scan_maintenance_items', { path });
}

export async function cleanMaintenanceItems(paths: string[]): Promise<number> {
  return await invoke<number>('clean_maintenance_items', { paths });
}

// ==========================================
// 11. Orphaned App Leftovers Commands
// ==========================================
export interface OrphanedLeftoverItem {
  id: string;
  path: string;
  name: string;
  inferredApp: string;
  kind: string;
  size: number;
  lastModified: string;
  selected?: boolean;
}

export interface OrphanedScanResult {
  items: OrphanedLeftoverItem[];
  totalSize: number;
  totalCount: number;
}

export async function scanOrphanedLeftovers(): Promise<OrphanedScanResult> {
  return await invoke<OrphanedScanResult>('scan_orphaned_leftovers');
}

export async function cleanOrphanedLeftovers(paths: string[]): Promise<number> {
  return await invoke<number>('clean_orphaned_leftovers', { paths });
}

// ==========================================
// 12. Smart Automation Rules Commands
// ==========================================
export interface SmartRulesStats {
  old_downloads_count: number;
  old_downloads_size: number;
  screenshots_count: number;
  screenshots_size: number;
}

export async function getSmartRulesStats(): Promise<SmartRulesStats> {
  return await invoke<SmartRulesStats>('get_smart_rules_stats');
}

export async function archiveOldDownloads(days?: number): Promise<number> {
  return await invoke<number>('archive_old_downloads', { days: days ?? 30 });
}

export async function consolidateDesktopScreenshots(): Promise<number> {
  return await invoke<number>('consolidate_desktop_screenshots');
}

// ==========================================
// 13. Homebrew & Developer Tooling Pruner
// ==========================================
export async function runBrewCleanup(): Promise<string> {
  return await invoke<string>('run_brew_cleanup');
}

// ==========================================
// 14. Zombie Port Hunter & Process Killer
// ==========================================
export interface ListeningPort {
  port: number;
  pid: number;
  process_name: string;
  user: string;
  protocol: string;
  address: string;
  memory_bytes: number;
}

export interface KillResult {
  success: boolean;
  pid: number;
  message: string;
}

export async function listActivePorts(): Promise<ListeningPort[]> {
  return await invoke<ListeningPort[]>('list_active_ports');
}

export async function killProcessByPid(pid: number, force: boolean = false): Promise<KillResult> {
  return await invoke<KillResult>('kill_process_by_pid', { pid, force });
}

// ==========================================
// 15. Xcode & iOS Simulator Deep Purger
// ==========================================
export interface XcodeTargetItem {
  id: string;
  title: string;
  path: string;
  size_bytes: number;
  description: string;
  is_safe: boolean;
}

export interface XcodeEnvironmentReport {
  has_xcode: boolean;
  unavailable_simulators_count: number;
  total_simulators_count: number;
  targets: XcodeTargetItem[];
}

export interface SimctlPurgeResult {
  success: boolean;
  message: string;
}

export interface XcodeCleanResult {
  success: boolean;
  freedBytes: number;
  cleanedCount: number;
  message: string;
}

export async function scanXcodeEnvironments(): Promise<XcodeEnvironmentReport> {
  return await invoke<XcodeEnvironmentReport>('scan_xcode_environments');
}

export async function purgeUnavailableSimulators(): Promise<SimctlPurgeResult> {
  return await invoke<SimctlPurgeResult>('purge_unavailable_simulators');
}

export async function cleanXcodeTarget(targetId: string): Promise<XcodeCleanResult> {
  return await invoke<XcodeCleanResult>('clean_xcode_target', { targetId });
}

// ==========================================
// 16. Dormant Projects Hibernate
// ==========================================
export interface DormantArtifact {
  name: string;
  path: string;
  size_bytes: number;
}

export interface DormantProject {
  name: string;
  path: string;
  last_commit_time: number;
  last_commit_subject: string;
  inactive_days: number;
  total_reclaimable_bytes: number;
  artifacts: DormantArtifact[];
}

export interface HibernateResult {
  success: boolean;
  project_path: string;
  freed_bytes: number;
  removed_artifacts_count: number;
  message: string;
}

export async function scanDormantProjects(
  searchDirs?: string[],
  daysThreshold: number = 30
): Promise<DormantProject[]> {
  return await invoke<DormantProject[]>('scan_dormant_projects', {
    searchDirs: searchDirs ?? null,
    daysThreshold,
  });
}

export async function hibernateProject(
  projectPath: string,
  artifactPaths: string[]
): Promise<HibernateResult> {
  return await invoke<HibernateResult>('hibernate_project', {
    projectPath,
    artifactPaths,
  });
}

// ==========================================
// 17. Popover Controls
// ==========================================
export async function hidePopover(): Promise<void> {
  return await invoke('hide_popover');
}

export async function openMainWindowFromPopover(targetPage?: string): Promise<void> {
  return await invoke('open_main_window_from_popover', { targetPage: targetPage || null });
}

// ==========================================
// 18. Battery & Hardware Intelligence
// ==========================================
export interface BatteryIntelligence {
  has_battery: boolean;
  cycle_count: number;
  health_percentage: number;
  current_percentage: number;
  design_capacity: number;
  nominal_capacity: number;
  is_charging: boolean;
  is_fully_charged: boolean;
  is_plugged_in: boolean;
  charger_watts: number | null;
  condition: string;
}

export interface ThermalIntelligence {
  thermal_state: string;
  cpu_speed_limit: number;
  is_throttled: boolean;
  cpu_brand: string;
  cpu_usage: number;
  core_count: number;
}

export interface EnergyHogProcess {
  pid: number;
  name: string;
  cpu_usage: number;
  memory_bytes: number;
}

export interface HardwareReport {
  battery: BatteryIntelligence;
  thermal: ThermalIntelligence;
  energy_hogs: EnergyHogProcess[];
}

export async function getHardwareIntelligence(): Promise<HardwareReport> {
  return await invoke<HardwareReport>('get_hardware_intelligence');
}

// ==========================================
// 19. Scheduled Background Cleaning (LaunchAgent)
// ==========================================
export interface ScheduleConfig {
  enabled: boolean;
  interval_type: 'daily' | 'weekly' | 'monthly';
  hour: number;
  clean_trash_older_days: number;
  clean_xcode_derived_data: boolean;
  clean_system_logs: boolean;
  notify_on_complete: boolean;
}

export interface ScheduledCleanSummary {
  success: boolean;
  total_freed_bytes: number;
  cleaned_items_count: number;
  message: string;
}

export async function getScheduleConfig(): Promise<ScheduleConfig> {
  return await invoke<ScheduleConfig>('get_schedule_config');
}

export async function saveScheduleConfig(config: ScheduleConfig): Promise<void> {
  return await invoke('save_schedule_config', { config });
}

export async function triggerScheduledCleanNow(): Promise<ScheduledCleanSummary> {
  return await invoke<ScheduledCleanSummary>('trigger_scheduled_clean_now');
}

// ==========================================
// 20. Similar / Burst Photo Hunter
// ==========================================
export interface SimilarPhotoItem {
  id: string;
  path: string;
  filename: string;
  size_bytes: number;
  width: number;
  height: number;
  last_modified: number;
  is_recommended_keep: boolean;
  selected_to_remove: boolean;
}

export interface SimilarPhotoGroup {
  group_id: string;
  similarity_percentage: number;
  items: SimilarPhotoItem[];
  reclaimable_bytes: number;
}

export interface SimilarMediaScanResult {
  groups: SimilarPhotoGroup[];
  total_similar_count: number;
  total_reclaimable_bytes: number;
}

export async function scanSimilarPhotos(
  targetFolders?: string[],
  maxDistance?: number
): Promise<SimilarMediaScanResult> {
  return await invoke<SimilarMediaScanResult>('scan_similar_photos', {
    targetFolders: targetFolders || null,
    maxDistance: maxDistance || null,
  });
}

export async function deleteSimilarPhotos(
  photoPaths: string[],
  toTrash: boolean = true
): Promise<number> {
  return await invoke<number>('delete_similar_photos', { photoPaths, toTrash });
}

// ==========================================
// 21. Browser Extensions & macOS Plugins
// ==========================================
export interface ExtensionItem {
  id: string;
  name: string;
  version: string;
  description: string;
  browser_or_type: string;
  path: string;
  size_bytes: number;
  is_system_plugin: boolean;
}

export interface PluginScanReport {
  items: ExtensionItem[];
  total_count: number;
  total_size_bytes: number;
  permission_denied: boolean;
}

export async function scanBrowserAndSystemPlugins(): Promise<PluginScanReport> {
  return await invoke<PluginScanReport>('scan_browser_and_system_plugins');
}

export async function removePluginOrExtension(path: string): Promise<boolean> {
  return await invoke<boolean>('remove_plugin_or_extension', { path });
}

// ==========================================
// 22. Exportable System Health Report
// ==========================================
export async function exportReportMarkdown(
  content: string,
  savePath?: string
): Promise<string> {
  return await invoke<string>('export_report_markdown', {
    content,
    savePath: savePath || null,
  });
}

// ==========================================
// 23. Native Notifications & Scan Streaming
// ==========================================
export interface ScanProgressPayload {
  stage: string;
  current_path: string;
  count: number;
  total_bytes: number;
}

/**
 * Show a native macOS system notification using osascript (Bypasses web notification limits)
 */
export async function showSystemNotification(
  title: string,
  body: string,
  sound: string = 'default'
): Promise<void> {
  return await invoke('show_system_notification', { title, body, sound });
}

/**
 * Trigger native macOS Quick Look preview for a file or folder (Spacebar preview)
 */
export async function quickLookPreview(path: string): Promise<void> {
  return await invoke('quick_look_preview', { path });
}

/**
 * Set the badge label on the macOS Dock icon (e.g. '5', '!', or null/empty to clear)
 */
export async function setDockBadge(badge?: string | null): Promise<void> {
  return await invoke('set_dock_badge', { badge: badge || null });
}






