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


