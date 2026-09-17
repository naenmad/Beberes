import { create } from 'zustand';

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

export interface CleanHistoryEntry {
  id: string;
  timestamp: number;
  freedBytes: number;
  itemsCount: number;
  isSimulation: boolean;
  categoryNames?: string[];
}

export type ViewPage = 'dashboard' | 'system-clean' | 'dev-workspace' | 'settings';

const STORAGE_LIFETIME_KEY = 'beberes_lifetime_bytes_freed';
const STORAGE_HISTORY_KEY = 'beberes_clean_history';

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

interface AppState {
  // Navigation
  currentPage: ViewPage;
  setCurrentPage: (page: ViewPage) => void;

  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Scanning
  isScanning: boolean;
  scanProgress: number;
  scanningStage: string;
  setIsScanning: (scanning: boolean) => void;
  setScanProgress: (progress: number) => void;
  setScanningStage: (stage: string) => void;

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

  // Disk Info
  diskInfo: DiskInfo | null;
  setDiskInfo: (info: DiskInfo) => void;

  // Cleaning & Simulation
  isCleaning: boolean;
  setIsCleaning: (cleaning: boolean) => void;
  isDryRun: boolean;
  setIsDryRun: (dryRun: boolean) => void;
  toggleDryRun: () => void;

  // Lifetime Stats & History
  lifetimeBytesFreed: number;
  cleanHistory: CleanHistoryEntry[];
  recordCleanResult: (freedBytes: number, itemsCount: number, isSimulation: boolean, categoryNames?: string[]) => void;
  clearCleanHistory: () => void;

  // Computed-like helpers
  getSelectedSize: (type: 'system' | 'dev') => number;
  getSelectedItems: (type: 'system' | 'dev') => ScanItem[];

  // Settings
  whitelistPaths: string[];
  customScanPaths: string[];
  addWhitelistPath: (path: string) => void;
  removeWhitelistPath: (path: string) => void;
  addCustomScanPath: (path: string) => void;
  removeCustomScanPath: (path: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),

  // Theme
  isDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

  // Scanning
  isScanning: false,
  scanProgress: 0,
  scanningStage: '',
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  setScanProgress: (progress) => set({ scanProgress: progress }),
  setScanningStage: (stage) => set({ scanningStage: stage }),

  // Results
  systemCategories: [],
  devCategories: [],
  setSystemCategories: (categories) => set({ systemCategories: categories }),
  setDevCategories: (categories) => set({ devCategories: categories }),

  // Selection
  toggleCategorySelection: (type, categoryId) => set((state) => {
    const key = type === 'system' ? 'systemCategories' : 'devCategories';
    return {
      [key]: state[key].map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              selected: !cat.selected,
              items: cat.items.map((item) => ({ ...item, selected: !cat.selected })),
            }
          : cat
      ),
    };
  }),

  toggleItemSelection: (type, categoryId, itemId) => set((state) => {
    const key = type === 'system' ? 'systemCategories' : 'devCategories';
    return {
      [key]: state[key].map((cat) => {
        if (cat.id !== categoryId) return cat;
        const updatedItems = cat.items.map((item) =>
          item.id === itemId ? { ...item, selected: !item.selected } : item
        );
        return {
          ...cat,
          items: updatedItems,
          selected: updatedItems.length > 0 && updatedItems.every((item) => item.selected),
        };
      }),
    };
  }),

  selectAllInCategory: (type, categoryId, selected) => set((state) => {
    const key = type === 'system' ? 'systemCategories' : 'devCategories';
    return {
      [key]: state[key].map((cat) =>
        cat.id === categoryId
          ? { ...cat, selected, items: cat.items.map((item) => ({ ...item, selected })) }
          : cat
      ),
    };
  }),

  selectAll: (type, selected) => set((state) => {
    const key = type === 'system' ? 'systemCategories' : 'devCategories';
    return {
      [key]: state[key].map((cat) => ({
        ...cat,
        selected,
        items: cat.items.map((item) => ({ ...item, selected })),
      })),
    };
  }),

  // Disk Info
  diskInfo: null,
  setDiskInfo: (info) => set({ diskInfo: info }),

  // Cleaning & Simulation
  isCleaning: false,
  setIsCleaning: (cleaning) => set({ isCleaning: cleaning }),
  isDryRun: false,
  setIsDryRun: (dryRun) => set({ isDryRun: dryRun }),
  toggleDryRun: () => set((state) => ({ isDryRun: !state.isDryRun })),

  // Lifetime Stats & History
  lifetimeBytesFreed: getStoredLifetime(),
  cleanHistory: getStoredHistory(),
  recordCleanResult: (freedBytes, itemsCount, isSimulation, categoryNames = []) => {
    if (isSimulation || freedBytes <= 0) return;
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

  // Settings
  whitelistPaths: ['/System', '/Library/CoreServices', '/usr', '/bin', '/sbin'],
  customScanPaths: [],
  addWhitelistPath: (path) => set((state) => ({
    whitelistPaths: [...state.whitelistPaths, path],
  })),
  removeWhitelistPath: (path) => set((state) => ({
    whitelistPaths: state.whitelistPaths.filter((p) => p !== path),
  })),
  addCustomScanPath: (path) => set((state) => ({
    customScanPaths: [...state.customScanPaths, path],
  })),
  removeCustomScanPath: (path) => set((state) => ({
    customScanPaths: state.customScanPaths.filter((p) => p !== path),
  })),
}));
