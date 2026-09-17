import { invoke } from '@tauri-apps/api/core';
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
  return await invoke<string | null>('pick_folder');
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

