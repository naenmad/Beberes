import { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore, type ViewPage } from '../../store/appStore';
import { useTranslation } from '../../lib/i18n';
import { scanInstalledApps, type AppItem, clearIconCache } from '../../lib/commands';
import { formatSize } from '../../lib/utils';
import {
  Search,
  LayoutDashboard,
  Eye,
  Copy,
  Trash2,
  FolderSync,
  AppWindow,
  Flame,
  Terminal,
  Settings,
  Sparkles,
  Sun,
  Moon,
  Trash,
  X,
  CornerDownLeft,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';

interface SpotlightItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'page' | 'action' | 'app' | 'workspace';
  icon: React.ReactNode;
  action: () => void;
  badge?: string;
}

export default function SpotlightModal() {
  const { t } = useTranslation();
  const {
    isSpotlightOpen,
    closeSpotlight,
    setCurrentPage,
    toggleDarkMode,
    isDarkMode,
    deleteToTrash,
    toggleDeleteToTrash,
    devCategories,
  } = useAppStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [installedApps, setInstalledApps] = useState<AppItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isSpotlightOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      // Lazy load apps for instant searching
      if (installedApps.length === 0) {
        scanInstalledApps()
          .then((apps) => setInstalledApps(apps))
          .catch(() => {});
      }
    }
  }, [isSpotlightOpen]);

  // Global shortcut: ⌘K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isSpotlightOpen) {
          closeSpotlight();
        } else {
          useAppStore.getState().openSpotlight();
        }
      } else if (e.key === 'Escape' && isSpotlightOpen) {
        e.preventDefault();
        closeSpotlight();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpotlightOpen]);

  const navigateTo = (page: ViewPage) => {
    setCurrentPage(page);
    closeSpotlight();
  };

  // Base list of items
  const allItems = useMemo<SpotlightItem[]>(() => {
    const items: SpotlightItem[] = [
      // 1. Pages
      {
        id: 'page-dashboard',
        title: t('nav.dashboard'),
        subtitle: t('dashboard.scanningDesc'),
        category: 'page',
        icon: <LayoutDashboard size={15} className="text-blue-500" />,
        action: () => navigateTo('dashboard'),
        badge: 'Page',
      },
      {
        id: 'page-quick-review',
        title: t('nav.quickReview'),
        subtitle: t('quickReview.subtitle'),
        category: 'page',
        icon: <Eye size={15} className="text-indigo-500" />,
        action: () => navigateTo('quick-review'),
        badge: 'Page',
      },
      {
        id: 'page-large-duplicates',
        title: t('nav.largeDuplicates', 'Large & Duplicate Files'),
        subtitle: t('largeDuplicates.subtitle', 'Find huge files and duplicate copies'),
        category: 'page',
        icon: <Copy size={15} className="text-violet-500" />,
        action: () => navigateTo('large-duplicates'),
        badge: 'Page',
      },
      {
        id: 'page-trash-manager',
        title: t('nav.trashManager', 'Trash Manager'),
        subtitle: t('trashManager.subtitle', 'Inspect and safely empty macOS Trash'),
        category: 'page',
        icon: <Trash2 size={15} className="text-rose-500" />,
        action: () => navigateTo('trash-manager'),
        badge: 'Page',
      },
      {
        id: 'page-tidy-up',
        title: t('nav.tidyUp'),
        subtitle: t('tidyUp.desc'),
        category: 'page',
        icon: <FolderSync size={15} className="text-emerald-500" />,
        action: () => navigateTo('tidy-up'),
        badge: 'Page',
      },
      {
        id: 'page-apps',
        title: t('nav.apps'),
        subtitle: t('apps.desc'),
        category: 'page',
        icon: <AppWindow size={15} className="text-cyan-500" />,
        action: () => navigateTo('apps'),
        badge: 'Page',
      },
      {
        id: 'page-system-clean',
        title: t('nav.systemClean'),
        subtitle: t('systemClean.desc'),
        category: 'page',
        icon: <Flame size={15} className="text-amber-500" />,
        action: () => navigateTo('system-clean'),
        badge: 'Page',
      },
      {
        id: 'page-dev-workspace',
        title: t('nav.devWorkspace'),
        subtitle: t('devWorkspace.desc'),
        category: 'page',
        icon: <Terminal size={15} className="text-purple-500" />,
        action: () => navigateTo('dev-workspace'),
        badge: 'Page',
      },
      {
        id: 'page-settings',
        title: t('nav.settings'),
        subtitle: t('settings.title'),
        category: 'page',
        icon: <Settings size={15} className="text-slate-500" />,
        action: () => navigateTo('settings'),
        badge: 'Page',
      },

      // 2. Quick Actions
      {
        id: 'action-smart-clean',
        title: t('dashboard.smartClean'),
        subtitle: t('dashboard.scanningDesc'),
        category: 'action',
        icon: <Sparkles size={15} className="text-blue-500" />,
        action: () => navigateTo('system-clean'),
        badge: 'Action',
      },
      {
        id: 'action-toggle-trash',
        title: deleteToTrash
          ? t('settings.directDeleteTitle')
          : t('settings.trashModeTitle'),
        subtitle: deleteToTrash
          ? 'Switch from Trash to Direct Delete mode'
          : 'Switch from Direct Delete to Trash mode',
        category: 'action',
        icon: <Trash size={15} className="text-rose-500" />,
        action: () => {
          toggleDeleteToTrash();
          closeSpotlight();
        },
        badge: 'Action',
      },
      {
        id: 'action-toggle-theme',
        title: isDarkMode ? t('settings.lightMode') : t('settings.darkMode'),
        subtitle: isDarkMode ? 'Switch to light theme' : 'Switch to dark theme',
        category: 'action',
        icon: isDarkMode ? <Sun size={15} className="text-amber-500" /> : <Moon size={15} className="text-indigo-400" />,
        action: () => {
          toggleDarkMode();
          closeSpotlight();
        },
        badge: 'Action',
      },
      {
        id: 'action-clear-icons',
        title: t('settings.clearIconCache'),
        subtitle: t('settings.clearIconCacheDesc'),
        category: 'action',
        icon: <RefreshCw size={15} className="text-emerald-500" />,
        action: () => {
          clearIconCache().catch(() => {});
          closeSpotlight();
        },
        badge: 'Action',
      },
    ];

    // 3. Installed Apps
    installedApps.forEach((app) => {
      items.push({
        id: `app-${app.id}`,
        title: app.name,
        subtitle: `${formatSize(app.totalSize)} • ${app.path}`,
        category: 'app',
        icon: <AppWindow size={15} className="text-cyan-500" />,
        action: () => navigateTo('apps'),
        badge: 'App',
      });
    });

    // 4. Scanned Dev Categories
    devCategories.forEach((cat) => {
      items.push({
        id: `workspace-${cat.id}`,
        title: cat.name,
        subtitle: `${cat.items.length} items • ${formatSize(cat.size)}`,
        category: 'workspace',
        icon: <Terminal size={15} className="text-purple-500" />,
        action: () => navigateTo('dev-workspace'),
        badge: 'Workspace',
      });
    });

    return items;
  }, [t, installedApps, devCategories, isDarkMode, deleteToTrash]);

  // Filter items based on user search query
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 15);

    return allItems
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
          item.category.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [allItems, query]);

  // Handle arrow keys & Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  // Keep selected item in view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isSpotlightOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/40 backdrop-blur-md animate-fade-in"
      onClick={closeSpotlight}
    >
      <div
        className="w-full max-w-xl rounded-2xl glass-panel shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden flex flex-col max-h-[70vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08]">
          <Search size={18} className="text-blue-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('spotlight.placeholder', 'Type a command, app, or page...')}
            className="w-full bg-transparent text-sm text-slate-800 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 divide-y-0 select-none"
        >
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-neutral-500">
              {t('spotlight.noResults', 'No commands or items matching your search.')}
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300'
                      : 'text-slate-700 dark:text-neutral-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300'
                          : 'bg-black/[0.04] dark:bg-white/[0.06] text-slate-500'
                      }`}
                    >
                      {item.icon}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate leading-snug">
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 dark:text-neutral-400 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.badge && (
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] text-slate-400 dark:text-neutral-400">
                        {item.badge}
                      </span>
                    )}
                    {isSelected && (
                      <CornerDownLeft size={13} className="text-blue-500 shrink-0" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between text-[10px] text-slate-400 dark:text-neutral-500 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUpDown size={11} /> {t('spotlight.navigate', 'Navigate')}
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft size={11} /> {t('spotlight.select', 'Select')}
            </span>
          </div>
          <span>Esc {t('spotlight.close', 'Close')}</span>
        </div>
      </div>
    </div>
  );
}
