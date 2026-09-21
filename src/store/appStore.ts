import { create } from 'zustand';
import {
  getAllDisks,
  getDiskInfoByMount,
  HardwareReport,
  SimilarMediaScanResult,
  PluginScanReport,
  AppItem,
  OrphanedLeftoverItem,
  DiskTreeNode,
  showSystemNotification,
  setDockBadge,
} from '../lib/commands';
import { playSuccessChime } from '../lib/sound';
import { applyThemeColors } from '../lib/themeColors';
import { formatSize } from '../lib/utils';

// Types
export interface ScanCategory {
  id: string;
  name: string;
  icon: string;
  size: number;       // bytes
  items: ScanItem[];
  selected: boolean;
}

export interface ScanItem {
  id: string;
  path: string;
  name: string;
  size: number;       // bytes
  lastModified: string;
  category: string;
  selected: boolean;
}

export interface DiskInfo {
  totalSpace: number;
  usedSpace: number;
  freeSpace: number;
  diskName: string;
}

export interface DiskDetail {
  id: string;
  name: string;
  mountPoint: string;
  totalSpace: number;
  usedSpace: number;
  freeSpace: number;
  isRemovable: boolean;
  fileSystem: string;
}

export interface CleanRecord {
  id: string;
  timestamp: string;
  bytesFreed: number;
  itemsCount: number;
  isTrashMode: boolean;
  categories: string[];
}

export const APP_VERSION = '1.4.0';
export const APP_CODENAME = 'Chandra';

export type ViewPage =
  | 'dashboard'
  | 'quick-review'
  | 'large-duplicates'
  | 'trash-manager'
  | 'disk-visualizer'
  | 'tidy-up'
  | 'apps'
  | 'system-clean'
  | 'dev-workspace'
  | 'startup-manager'
  | 'file-shredder'
  | 'git-sweeper'
  | 'hardware'
  | 'similar-photos'
  | 'plugins'
  | 'settings';


export interface StagedCleanItem {
  id: string;
  name: string;
  path: string;
  size: number;
  originPage: ViewPage;
  categoryName: string;
  itemType?: 'file' | 'app' | 'folder' | 'artifact' | 'trash' | 'orphaned';
  extraData?: any;
}

export interface UpdateInfo {
  available: boolean;
  latestVersion: string;
  releaseUrl: string;
  releaseNotes: string;
  publishedAt?: string;
}

function compareSemver(v1: string, v2: string): number {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map((p) => parseInt(p, 10) || 0);
  const p1 = parse(v1);
  const p2 = parse(v2);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export interface CleanHistoryEntry {
  id: string;
  timestamp: number;
  freedBytes: number;
  itemsCount: number;
  isSimulation: boolean;
  categoryNames?: string[];
}

export type UiScale = 'compact' | 'normal' | 'large';


const STORAGE_LIFETIME_KEY = 'beberes_lifetime_bytes_freed';
const STORAGE_HISTORY_KEY = 'beberes_clean_history';
const STORAGE_SCALE_KEY = 'beberes_ui_scale';
const STORAGE_CONFIRM_KEY = 'beberes_always_confirm';
const STORAGE_SAFETY_KEY = 'beberes_safety_notice';
const STORAGE_WHITELIST_KEY = 'beberes_whitelist_paths';
const STORAGE_CUSTOM_PATHS_KEY = 'beberes_custom_scan_paths';
const STORAGE_LANG_KEY = 'beberes_language';
const STORAGE_PRIMARY_ACCENT_KEY = 'beberes_primary_accent';
const STORAGE_SECONDARY_ACCENT_KEY = 'beberes_secondary_accent';

function getStoredPrimaryAccent(): string {
  try {
    return localStorage.getItem(STORAGE_PRIMARY_ACCENT_KEY) || 'blue';
  } catch {
    return 'blue';
  }
}

function getStoredSecondaryAccent(): string {
  try {
    return localStorage.getItem(STORAGE_SECONDARY_ACCENT_KEY) || 'indigo';
  } catch {
    return 'indigo';
  }
}

const DEFAULT_WHITELIST = ['/System', '/Library/CoreServices', '/usr', '/bin', '/sbin'];
const STORAGE_PAGE_KEY = 'beberes_current_page';

function getStoredPage(): ViewPage {
  try {
    const val = localStorage.getItem(STORAGE_PAGE_KEY) as ViewPage | null;
    const validPages: ViewPage[] = [
      'dashboard',
      'quick-review',
      'large-duplicates',
      'trash-manager',
      'disk-visualizer',
      'tidy-up',
      'apps',
      'system-clean',
      'dev-workspace',
      'startup-manager',
      'file-shredder',
      'git-sweeper',
      'hardware',
      'similar-photos',
      'plugins',
      'settings',
    ];
    if (val && validPages.includes(val)) return val;
    return 'dashboard';
  } catch {
    return 'dashboard';
  }
}

function getStoredLanguage(): string {
  try {
    const val = localStorage.getItem(STORAGE_LANG_KEY);
    if (val) return val;
    if (typeof navigator !== 'undefined' && navigator.language && navigator.language.toLowerCase().startsWith('id')) {
      return 'id';
    }
    return 'en';
  } catch {
    return 'en';
  }
}

function getStoredLifetime(): number {
  try {
    const val = localStorage.getItem(STORAGE_LIFETIME_KEY);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function getStoredHistory(): CleanHistoryEntry[] {
  try {
    const val = localStorage.getItem(STORAGE_HISTORY_KEY);
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

function getStoredScale(): UiScale {
  try {
    const val = localStorage.getItem(STORAGE_SCALE_KEY);
    if (val === 'compact' || val === 'normal' || val === 'large') return val;
    return 'normal';
  } catch {
    return 'normal';
  }
}

function getStoredWhitelist(): string[] {
  try {
    const val = localStorage.getItem(STORAGE_WHITELIST_KEY);
    return val ? JSON.parse(val) : DEFAULT_WHITELIST;
  } catch {
    return DEFAULT_WHITELIST;
  }
}

function getStoredCustomPaths(): string[] {
  try {
    const val = localStorage.getItem(STORAGE_CUSTOM_PATHS_KEY);
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

interface AppState {
  // Navigation
  currentPage: ViewPage;
  setCurrentPage: (page: ViewPage) => void;

  // Spotlight Command Palette
  isSpotlightOpen: boolean;
  openSpotlight: () => void;
  closeSpotlight: () => void;
  toggleSpotlight: () => void;

  // About App Modal
  isAboutModalOpen: boolean;
  openAboutModal: () => void;
  closeAboutModal: () => void;

  // System Health Report Modal
  isReportModalOpen: boolean;
  openReportModal: () => void;
  closeReportModal: () => void;

  // Theme & Accent Colors
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  primaryAccent: string;
  secondaryAccent: string;
  setPrimaryAccent: (colorId: string) => void;
  setSecondaryAccent: (colorId: string) => void;
  setAccentPair: (primaryId: string, secondaryId: string) => void;

  // UX & System Preferences
  holdCmdQToQuit: boolean;
  setHoldCmdQToQuit: (enabled: boolean) => void;
  soundEffectsEnabled: boolean;
  setSoundEffectsEnabled: (enabled: boolean) => void;
  lowDiskAlertEnabled: boolean;
  setLowDiskAlertEnabled: (enabled: boolean) => void;
  lowDiskSpaceTriggered: boolean;
  setLowDiskSpaceTriggered: (triggered: boolean) => void;

  // Application Updates
  updateInfo: UpdateInfo | null;
  isCheckingUpdate: boolean;
  updateCheckError: string | null;
  autoCheckUpdate: boolean;
  setAutoCheckUpdate: (enabled: boolean) => void;
  checkForUpdates: (manual?: boolean) => Promise<void>;

  // Scanning & Global Refresh
  isScanning: boolean;
  scanProgress: number;
  scanningStage: string;
  scanningPath: string;
  globalRefreshTrigger: number;
  triggerGlobalRefresh: () => void;
  setIsScanning: (scanning: boolean) => void;
  setScanProgress: (progress: number) => void;
  setScanningStage: (stage: string) => void;
  setScanningPath: (path: string) => void;

  // Global Drag & Drop navigation targets
  shredderPreloadedPaths: string[];
  setShredderPreloadedPaths: (paths: string[]) => void;
  visualizerTargetPath: string | null;
  setVisualizerTargetPath: (path: string | null) => void;

  // Results
  systemCategories: ScanCategory[];
  devCategories: ScanCategory[];
  setSystemCategories: (categories: ScanCategory[]) => void;
  setDevCategories: (categories: ScanCategory[]) => void;

  // Selection
  toggleCategorySelection: (type: 'system' | 'dev', categoryId: string) => void;
  toggleItemSelection: (type: 'system' | 'dev', categoryId: string, itemId: string) => void;
  selectAllInCategory: (type: 'system' | 'dev', categoryId: string, selected: boolean) => void;
  selectAll: (type: 'system' | 'dev', selected: boolean) => void;

  // Disk Info & Multi-Drive
  diskInfo: DiskInfo | null;
  setDiskInfo: (info: DiskInfo) => void;
  availableDisks: DiskDetail[];
  setAvailableDisks: (disks: DiskDetail[]) => void;
  selectedDiskMount: string;
  setSelectedDiskMount: (mount: string) => void;
  refreshDisks: () => Promise<void>;

  // Cleaning & Mode Settings
  isCleaning: boolean;
  setIsCleaning: (cleaning: boolean) => void;
  isDryRun: boolean;
  setIsDryRun: (dryRun: boolean) => void;
  toggleDryRun: () => void;
  deleteToTrash: boolean;
  setDeleteToTrash: (toTrash: boolean) => void;
  toggleDeleteToTrash: () => void;

  // Lifetime Stats & History
  lifetimeBytesFreed: number;
  cleanHistory: CleanHistoryEntry[];
  recordCleanResult: (freedBytes: number, itemsCount: number, isSimulation: boolean, categoryNames?: string[]) => void;
  clearCleanHistory: () => void;

  // Computed-like helpers
  getSelectedSize: (type: 'system' | 'dev') => number;
  getSelectedItems: (type: 'system' | 'dev') => ScanItem[];

  // Settings
  language: string;
  setLanguage: (lang: string) => void;
  uiScale: UiScale;
  setUiScale: (scale: UiScale) => void;
  alwaysConfirmClean: boolean;
  setAlwaysConfirmClean: (confirm: boolean) => void;
  showSafetyNotice: boolean;
  setShowSafetyNotice: (show: boolean) => void;
  whitelistPaths: string[];
  customScanPaths: string[];
  addWhitelistPath: (path: string) => void;
  removeWhitelistPath: (path: string) => void;
  addCustomScanPath: (path: string) => void;
  removeCustomScanPath: (path: string) => void;
  resetAllSettings: () => void;

  // Universal Staging Queue ("Bereskan Keranjang")
  stagedItems: Record<string, StagedCleanItem>;
  isStagedModalOpen: boolean;
  openStagedModal: () => void;
  closeStagedModal: () => void;
  stageItem: (item: StagedCleanItem) => void;
  unstageItem: (id: string) => void;
  toggleStageItem: (item: StagedCleanItem) => void;
  stageMultipleItems: (items: StagedCleanItem[]) => void;
  unstageMultipleItems: (ids: string[]) => void;
  clearStagingQueue: () => void;
  clearStagingQueueForPage: (originPage: ViewPage) => void;
  getTotalStagedCount: () => number;
  getTotalStagedSize: () => number;
  getStagedItemsList: () => StagedCleanItem[];
  getStagedItemsByPage: () => Record<string, StagedCleanItem[]>;

  // Feature Page Caching (Instant tab switching)
  cachedHardwareReport: HardwareReport | null;
  setCachedHardwareReport: (report: HardwareReport | null) => void;
  cachedSimilarPhotos: SimilarMediaScanResult | null;
  setCachedSimilarPhotos: (result: SimilarMediaScanResult | null) => void;
  cachedPluginReport: PluginScanReport | null;
  setCachedPluginReport: (report: PluginScanReport | null) => void;
  cachedInstalledApps: AppItem[] | null;
  setCachedInstalledApps: (apps: AppItem[] | null) => void;
  cachedOrphanedItems: OrphanedLeftoverItem[] | null;
  setCachedOrphanedItems: (items: OrphanedLeftoverItem[] | null) => void;
  cachedDiskTree: DiskTreeNode | null;
  setCachedDiskTree: (tree: DiskTreeNode | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Feature Page Caching
  cachedHardwareReport: null,
  setCachedHardwareReport: (cachedHardwareReport) => set({ cachedHardwareReport }),
  cachedSimilarPhotos: null,
  setCachedSimilarPhotos: (cachedSimilarPhotos) => set({ cachedSimilarPhotos }),
  cachedPluginReport: null,
  setCachedPluginReport: (cachedPluginReport) => set({ cachedPluginReport }),
  cachedInstalledApps: null,
  setCachedInstalledApps: (cachedInstalledApps) => set({ cachedInstalledApps }),
  cachedOrphanedItems: null,
  setCachedOrphanedItems: (cachedOrphanedItems) => set({ cachedOrphanedItems }),
  cachedDiskTree: null,
  setCachedDiskTree: (cachedDiskTree) => set({ cachedDiskTree }),

  // Navigation
  currentPage: getStoredPage(),
  setCurrentPage: (page) => {
    try {
      localStorage.setItem(STORAGE_PAGE_KEY, page);
    } catch {}
    set({ currentPage: page });
  },

  // Spotlight Command Palette
  isSpotlightOpen: false,
  openSpotlight: () => set({ isSpotlightOpen: true }),
  closeSpotlight: () => set({ isSpotlightOpen: false }),
  toggleSpotlight: () => set((state) => ({ isSpotlightOpen: !state.isSpotlightOpen })),

  // About App Modal
  isAboutModalOpen: false,
  openAboutModal: () => set({ isAboutModalOpen: true }),
  closeAboutModal: () => set({ isAboutModalOpen: false }),

  // System Health Report Modal
  isReportModalOpen: false,
  openReportModal: () => set({ isReportModalOpen: true }),
  closeReportModal: () => set({ isReportModalOpen: false }),

  // Theme
  isDarkMode: (() => {
    try {
      const saved = localStorage.getItem('beberes_theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return true;
    }
  })(),
  toggleDarkMode: () => set((state) => {
    const next = !state.isDarkMode;
    try {
      localStorage.setItem('beberes_theme', next ? 'dark' : 'light');
    } catch {}
    return { isDarkMode: next };
  }),

  // Accent Colors
  primaryAccent: getStoredPrimaryAccent(),
  secondaryAccent: getStoredSecondaryAccent(),
  setPrimaryAccent: (primaryAccent: string) => {
    try {
      localStorage.setItem(STORAGE_PRIMARY_ACCENT_KEY, primaryAccent);
    } catch {}
    set((state) => {
      applyThemeColors(primaryAccent, state.secondaryAccent);
      return { primaryAccent };
    });
  },
  setSecondaryAccent: (secondaryAccent: string) => {
    try {
      localStorage.setItem(STORAGE_SECONDARY_ACCENT_KEY, secondaryAccent);
    } catch {}
    set((state) => {
      applyThemeColors(state.primaryAccent, secondaryAccent);
      return { secondaryAccent };
    });
  },
  setAccentPair: (primaryAccent: string, secondaryAccent: string) => {
    try {
      localStorage.setItem(STORAGE_PRIMARY_ACCENT_KEY, primaryAccent);
      localStorage.setItem(STORAGE_SECONDARY_ACCENT_KEY, secondaryAccent);
    } catch {}
    applyThemeColors(primaryAccent, secondaryAccent);
    set({ primaryAccent, secondaryAccent });
  },

  // Scanning & Global Refresh
  isScanning: false,
  scanProgress: 0,
  scanningStage: '',
  scanningPath: '',
  globalRefreshTrigger: 0,
  triggerGlobalRefresh: () => set((state) => ({ globalRefreshTrigger: state.globalRefreshTrigger + 1 })),
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  setScanProgress: (progress) => set({ scanProgress: progress }),
  setScanningStage: (stage) => set({ scanningStage: stage }),
  setScanningPath: (path) => set({ scanningPath: path }),

  // Global Drag & Drop navigation targets
  shredderPreloadedPaths: [],
  setShredderPreloadedPaths: (paths) => set({ shredderPreloadedPaths: paths }),
  visualizerTargetPath: null,
  setVisualizerTargetPath: (path) => set({ visualizerTargetPath: path }),

  // Results
  systemCategories: [],
  devCategories: [],
  setSystemCategories: (categories) => set({ systemCategories: categories }),
  setDevCategories: (categories) => set({ devCategories: categories }),

  // Selection
  toggleCategorySelection: (type, categoryId) => set((state) => {
    const key = type === 'system' ? 'systemCategories' : 'devCategories';
    const originPage: ViewPage = type === 'system' ? 'system-clean' : 'dev-workspace';
    const nextStaged = { ...state.stagedItems };

    const updatedCategories = state[key].map((cat) => {
      if (cat.id !== categoryId) return cat;
      const nextSelected = !cat.selected;
      for (const it of cat.items) {
        if (nextSelected) {
          nextStaged[it.id] = {
            id: it.id,
            name: it.name,
            path: it.path,
            size: it.size,
            originPage,
            categoryName: cat.name,
            itemType: type === 'system' ? 'file' : 'folder',
          };
        } else {
          delete nextStaged[it.id];
        }
      }
      return {
        ...cat,
        selected: nextSelected,
        items: cat.items.map((item) => ({ ...item, selected: nextSelected })),
      };
    });

    return {
      [key]: updatedCategories,
      stagedItems: nextStaged,
    };
  }),

  toggleItemSelection: (type, categoryId, itemId) => set((state) => {
    const key = type === 'system' ? 'systemCategories' : 'devCategories';
    const originPage: ViewPage = type === 'system' ? 'system-clean' : 'dev-workspace';
    const nextStaged = { ...state.stagedItems };

    const updatedCategories = state[key].map((cat) => {
      if (cat.id !== categoryId) return cat;
      const updatedItems = cat.items.map((item) => {
        if (item.id !== itemId) return item;
        const nextSelected = !item.selected;
        if (nextSelected) {
          nextStaged[item.id] = {
            id: item.id,
            name: item.name,
            path: item.path,
            size: item.size,
            originPage,
            categoryName: cat.name,
            itemType: type === 'system' ? 'file' : 'folder',
          };
        } else {
          delete nextStaged[item.id];
        }
        return { ...item, selected: nextSelected };
      });
      return {
        ...cat,
        items: updatedItems,
        selected: updatedItems.length > 0 && updatedItems.every((item) => item.selected),
      };
    });

    return {
      [key]: updatedCategories,
      stagedItems: nextStaged,
    };
  }),

  selectAllInCategory: (type, categoryId, selected) => set((state) => {
    const key = type === 'system' ? 'systemCategories' : 'devCategories';
    const originPage: ViewPage = type === 'system' ? 'system-clean' : 'dev-workspace';
    const nextStaged = { ...state.stagedItems };

    const updatedCategories = state[key].map((cat) => {
      if (cat.id !== categoryId) return cat;
      for (const it of cat.items) {
        if (selected) {
          nextStaged[it.id] = {
            id: it.id,
            name: it.name,
            path: it.path,
            size: it.size,
            originPage,
            categoryName: cat.name,
            itemType: type === 'system' ? 'file' : 'folder',
          };
        } else {
          delete nextStaged[it.id];
        }
      }
      return { ...cat, selected, items: cat.items.map((item) => ({ ...item, selected })) };
    });

    return {
      [key]: updatedCategories,
      stagedItems: nextStaged,
    };
  }),

  selectAll: (type, selected) => set((state) => {
    const key = type === 'system' ? 'systemCategories' : 'devCategories';
    const originPage: ViewPage = type === 'system' ? 'system-clean' : 'dev-workspace';
    const nextStaged = { ...state.stagedItems };

    const updatedCategories = state[key].map((cat) => {
      for (const it of cat.items) {
        if (selected) {
          nextStaged[it.id] = {
            id: it.id,
            name: it.name,
            path: it.path,
            size: it.size,
            originPage,
            categoryName: cat.name,
            itemType: type === 'system' ? 'file' : 'folder',
          };
        } else {
          delete nextStaged[it.id];
        }
      }
      return {
        ...cat,
        selected,
        items: cat.items.map((item) => ({ ...item, selected })),
      };
    });

    return {
      [key]: updatedCategories,
      stagedItems: nextStaged,
    };
  }),

  // Disk Info & Multi-Drive
  diskInfo: null,
  setDiskInfo: (info) => set({ diskInfo: info }),
  availableDisks: [],
  setAvailableDisks: (disks) => set({ availableDisks: disks }),
  selectedDiskMount: '/',
  setSelectedDiskMount: (mount) => {
    set({ selectedDiskMount: mount });
    get().refreshDisks();
  },
  refreshDisks: async () => {
    try {
      const disks = await getAllDisks();
      const currentMount = get().selectedDiskMount;
      const targetMount = disks.some((d) => d.mountPoint === currentMount) ? currentMount : (disks[0]?.mountPoint || '/');
      const info = await getDiskInfoByMount(targetMount);
      const isLow = info && get().lowDiskAlertEnabled
        ? (info.freeSpace < 15 * 1024 * 1024 * 1024 || (info.totalSpace > 0 && info.freeSpace / info.totalSpace < 0.1))
        : false;

      set({
        availableDisks: disks,
        selectedDiskMount: targetMount,
        diskInfo: info,
        lowDiskSpaceTriggered: isLow,
      });
    } catch (err) {
      console.error('Failed to refresh disks:', err);
    }
  },

  // Cleaning & Mode Settings
  isCleaning: false,
  setIsCleaning: (cleaning) => set({ isCleaning: cleaning }),
  isDryRun: false,
  setIsDryRun: (dryRun) => set({ isDryRun: dryRun }),
  toggleDryRun: () => set((state) => ({ isDryRun: !state.isDryRun })),
  deleteToTrash: (() => {
    try {
      const saved = localStorage.getItem('beberes_delete_to_trash');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  })(),
  setDeleteToTrash: (toTrash) => {
    try {
      localStorage.setItem('beberes_delete_to_trash', String(toTrash));
    } catch {}
    set({ deleteToTrash: toTrash });
  },
  toggleDeleteToTrash: () => set((state) => {
    const next = !state.deleteToTrash;
    try {
      localStorage.setItem('beberes_delete_to_trash', String(next));
    } catch {}
    return { deleteToTrash: next };
  }),

  // Lifetime Stats & History
  lifetimeBytesFreed: getStoredLifetime(),
  cleanHistory: getStoredHistory(),
  recordCleanResult: (freedBytes, itemsCount, isSimulation, categoryNames = []) => {
    if (isSimulation || freedBytes <= 0) return;
    playSuccessChime();
    showSystemNotification(
      'Beberes — Clean Complete',
      `Successfully freed ${formatSize(freedBytes)} across ${itemsCount} items.`,
      'Hero'
    ).catch(() => {});
    setDockBadge(null).catch(() => {});
    const newLifetime = get().lifetimeBytesFreed + freedBytes;
    const newEntry: CleanHistoryEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      freedBytes,
      itemsCount,
      isSimulation,
      categoryNames,
    };
    const newHistory = [newEntry, ...get().cleanHistory].slice(0, 50);
    try {
      localStorage.setItem(STORAGE_LIFETIME_KEY, String(newLifetime));
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
    set({
      lifetimeBytesFreed: newLifetime,
      cleanHistory: newHistory,
    });
  },
  clearCleanHistory: () => {
    try {
      localStorage.removeItem(STORAGE_HISTORY_KEY);
    } catch {}
    set({ cleanHistory: [] });
  },

  // Computed helpers
  getSelectedSize: (type) => {
    const categories = type === 'system' ? get().systemCategories : get().devCategories;
    return categories.reduce((total, cat) => {
      return total + cat.items.filter((item) => item.selected).reduce((sum, item) => sum + item.size, 0);
    }, 0);
  },

  getSelectedItems: (type) => {
    const categories = type === 'system' ? get().systemCategories : get().devCategories;
    return categories.flatMap((cat) => cat.items.filter((item) => item.selected));
  },

  // Settings & Preferences
  language: getStoredLanguage(),
  setLanguage: (lang) => {
    try {
      localStorage.setItem(STORAGE_LANG_KEY, lang);
    } catch {}
    set({ language: lang });
  },

  uiScale: getStoredScale(),
  setUiScale: (scale) => {
    try {
      localStorage.setItem(STORAGE_SCALE_KEY, scale);
    } catch {}
    set({ uiScale: scale });
  },

  alwaysConfirmClean: (() => {
    try {
      const val = localStorage.getItem(STORAGE_CONFIRM_KEY);
      return val === null ? true : val === 'true';
    } catch {
      return true;
    }
  })(),
  setAlwaysConfirmClean: (confirm) => {
    try {
      localStorage.setItem(STORAGE_CONFIRM_KEY, String(confirm));
    } catch {}
    set({ alwaysConfirmClean: confirm });
  },

  showSafetyNotice: (() => {
    try {
      const val = localStorage.getItem(STORAGE_SAFETY_KEY);
      return val === null ? true : val === 'true';
    } catch {
      return true;
    }
  })(),
  setShowSafetyNotice: (show) => {
    try {
      localStorage.setItem(STORAGE_SAFETY_KEY, String(show));
    } catch {}
    set({ showSafetyNotice: show });
  },

  whitelistPaths: getStoredWhitelist(),
  customScanPaths: getStoredCustomPaths(),
  addWhitelistPath: (path) => set((state) => {
    const updated = [...state.whitelistPaths, path];
    try {
      localStorage.setItem(STORAGE_WHITELIST_KEY, JSON.stringify(updated));
    } catch {}
    return { whitelistPaths: updated };
  }),
  removeWhitelistPath: (path) => set((state) => {
    const updated = state.whitelistPaths.filter((p) => p !== path);
    try {
      localStorage.setItem(STORAGE_WHITELIST_KEY, JSON.stringify(updated));
    } catch {}
    return { whitelistPaths: updated };
  }),
  addCustomScanPath: (path) => set((state) => {
    const updated = [...state.customScanPaths, path];
    try {
      localStorage.setItem(STORAGE_CUSTOM_PATHS_KEY, JSON.stringify(updated));
    } catch {}
    return { customScanPaths: updated };
  }),
  removeCustomScanPath: (path) => set((state) => {
    const updated = state.customScanPaths.filter((p) => p !== path);
    try {
      localStorage.setItem(STORAGE_CUSTOM_PATHS_KEY, JSON.stringify(updated));
    } catch {}
    return { customScanPaths: updated };
  }),
  resetAllSettings: () => {
    try {
      localStorage.removeItem(STORAGE_SCALE_KEY);
      localStorage.removeItem(STORAGE_CONFIRM_KEY);
      localStorage.removeItem(STORAGE_SAFETY_KEY);
      localStorage.removeItem(STORAGE_WHITELIST_KEY);
      localStorage.removeItem(STORAGE_CUSTOM_PATHS_KEY);
      localStorage.setItem('beberes_delete_to_trash', 'true');
    } catch {}
    set({
      uiScale: 'normal',
      deleteToTrash: true,
      alwaysConfirmClean: true,
      showSafetyNotice: true,
      whitelistPaths: DEFAULT_WHITELIST,
      customScanPaths: [],
    });
  },

  // Updates Implementation
  updateInfo: null,
  isCheckingUpdate: false,
  updateCheckError: null,
  autoCheckUpdate: (() => {
    try {
      return localStorage.getItem('beberes_auto_check_update') !== 'false';
    } catch {
      return true;
    }
  })(),
  setAutoCheckUpdate: (enabled: boolean) => {
    try {
      localStorage.setItem('beberes_auto_check_update', enabled ? 'true' : 'false');
    } catch {}
    set({ autoCheckUpdate: enabled });
  },
  checkForUpdates: async (manual = false) => {
    set({ isCheckingUpdate: true, updateCheckError: null });
    try {
      const res = await fetch('https://api.github.com/repos/naenmad/Beberes/releases/latest', {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      if (!res.ok) {
        throw new Error(`GitHub API returned ${res.status}`);
      }
      const data = await res.json();
      const rawTag = data.tag_name || '';
      const cleanTag = rawTag.replace(/^v/, '');
      let currentVersion = APP_VERSION;
      try {
        const { getVersion } = await import('@tauri-apps/api/app');
        currentVersion = await getVersion();
      } catch {
        currentVersion = APP_VERSION;
      }
      const available = compareSemver(cleanTag, currentVersion) > 0;
      set({
        updateInfo: {
          available,
          latestVersion: cleanTag || currentVersion,
          releaseUrl: data.html_url || 'https://github.com/naenmad/Beberes/releases',
          releaseNotes: data.body || '',
          publishedAt: data.published_at,
        },
        isCheckingUpdate: false,
        updateCheckError: null,
      });
    } catch (err: any) {
      set({
        isCheckingUpdate: false,
        updateCheckError: manual ? (err?.message || 'Failed to check for updates') : null,
      });
    }
  },

  // UX & System Preferences Implementation
  holdCmdQToQuit: (() => {
    try {
      return localStorage.getItem('beberes_hold_cmd_q') !== 'false';
    } catch {
      return true;
    }
  })(),
  setHoldCmdQToQuit: (enabled: boolean) => {
    try {
      localStorage.setItem('beberes_hold_cmd_q', enabled ? 'true' : 'false');
    } catch {}
    set({ holdCmdQToQuit: enabled });
  },

  soundEffectsEnabled: (() => {
    try {
      return localStorage.getItem('beberes_sound_effects') !== 'false';
    } catch {
      return true;
    }
  })(),
  setSoundEffectsEnabled: (enabled: boolean) => {
    try {
      localStorage.setItem('beberes_sound_effects', enabled ? 'true' : 'false');
    } catch {}
    set({ soundEffectsEnabled: enabled });
  },

  lowDiskAlertEnabled: (() => {
    try {
      return localStorage.getItem('beberes_low_disk_alert') !== 'false';
    } catch {
      return true;
    }
  })(),
  setLowDiskAlertEnabled: (enabled: boolean) => {
    try {
      localStorage.setItem('beberes_low_disk_alert', enabled ? 'true' : 'false');
    } catch {}
    set({ lowDiskAlertEnabled: enabled });
  },

  lowDiskSpaceTriggered: false,
  setLowDiskSpaceTriggered: (triggered: boolean) => set({ lowDiskSpaceTriggered: triggered }),

  // Universal Staging Queue ("Bereskan Keranjang")
  stagedItems: {},
  isStagedModalOpen: false,
  openStagedModal: () => set({ isStagedModalOpen: true }),
  closeStagedModal: () => set({ isStagedModalOpen: false }),

  stageItem: (item: StagedCleanItem) =>
    set((state) => ({
      stagedItems: { ...state.stagedItems, [item.id]: item },
    })),

  unstageItem: (id: string) =>
    set((state) => {
      const next = { ...state.stagedItems };
      delete next[id];

      const deselectInCats = (cats: ScanCategory[]) =>
        cats.map((cat) => {
          const updatedItems = cat.items.map((it) => (it.id === id ? { ...it, selected: false } : it));
          return {
            ...cat,
            items: updatedItems,
            selected: updatedItems.length > 0 && updatedItems.every((it) => it.selected),
          };
        });

      return {
        stagedItems: next,
        systemCategories: deselectInCats(state.systemCategories),
        devCategories: deselectInCats(state.devCategories),
      };
    }),

  toggleStageItem: (item: StagedCleanItem) =>
    set((state) => {
      const next = { ...state.stagedItems };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = item;
      }
      return { stagedItems: next };
    }),

  stageMultipleItems: (items: StagedCleanItem[]) =>
    set((state) => {
      const next = { ...state.stagedItems };
      for (const it of items) {
        next[it.id] = it;
      }
      return { stagedItems: next };
    }),

  unstageMultipleItems: (ids: string[]) =>
    set((state) => {
      const next = { ...state.stagedItems };
      const idSet = new Set(ids);
      for (const id of ids) {
        delete next[id];
      }

      const deselectInCats = (cats: ScanCategory[]) =>
        cats.map((cat) => {
          const updatedItems = cat.items.map((it) => (idSet.has(it.id) ? { ...it, selected: false } : it));
          return {
            ...cat,
            items: updatedItems,
            selected: updatedItems.length > 0 && updatedItems.every((it) => it.selected),
          };
        });

      return {
        stagedItems: next,
        systemCategories: deselectInCats(state.systemCategories),
        devCategories: deselectInCats(state.devCategories),
      };
    }),

  clearStagingQueue: () =>
    set((state) => {
      const resetCats = (cats: ScanCategory[]) =>
        cats.map((cat) => ({
          ...cat,
          selected: false,
          items: cat.items.map((it) => ({ ...it, selected: false })),
        }));

      return {
        stagedItems: {},
        systemCategories: resetCats(state.systemCategories),
        devCategories: resetCats(state.devCategories),
      };
    }),

  clearStagingQueueForPage: (originPage: ViewPage) =>
    set((state) => {
      const next: Record<string, StagedCleanItem> = {};
      for (const [key, val] of Object.entries(state.stagedItems)) {
        if (val.originPage !== originPage) {
          next[key] = val;
        }
      }
      return { stagedItems: next };
    }),

  getTotalStagedCount: () => Object.keys(get().stagedItems).length,

  getTotalStagedSize: () =>
    Object.values(get().stagedItems).reduce((sum, it) => sum + (it.size || 0), 0),

  getStagedItemsList: () => Object.values(get().stagedItems),

  getStagedItemsByPage: () => {
    const list = Object.values(get().stagedItems);
    const groups: Record<string, StagedCleanItem[]> = {};
    for (const item of list) {
      const page = item.originPage || 'system-clean';
      if (!groups[page]) {
        groups[page] = [];
      }
      groups[page].push(item);
    }
    return groups;
  },
}));

