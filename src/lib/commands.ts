import { invoke } from '@tauri-apps/api/core';
import type { ScanCategory, DiskInfo } from '../store/appStore';

export interface CleanResult {
  cleaned: number;
  freedBytes: number;
  isSimulation?: boolean;
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
 * Clean selected items by their file paths.
 * Optional `dryRun` simulates the process without actually deleting.
 */
export async function cleanSelectedItems(
  paths: string[],
  dryRun: boolean = false
): Promise<CleanResult> {
  return await invoke<CleanResult>('clean_selected_items', {
    paths,
    dryRun,
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
