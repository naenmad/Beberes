import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { useTranslation } from '../../lib/i18n';
import { supportedLanguages } from '../../locales';
import { formatSize } from '../../lib/utils';
import {
  Search,
  Command,
  Trash2,
  Sun,
  Moon,
  Globe,
  HardDrive,
  Sparkles,
  ChevronDown,
  RefreshCw,
  ArrowDownCircle,
  AlertTriangle,
} from 'lucide-react';

export default function TopBar() {
  const { t } = useTranslation();
  const {
    currentPage,
    diskInfo,
    deleteToTrash,
    toggleDeleteToTrash,
    isDarkMode,
    toggleDarkMode,
    language,
    setLanguage,
    openSpotlight,
    setCurrentPage,
    isScanning,
    triggerGlobalRefresh,
    refreshDisks,
    updateInfo,
    lowDiskSpaceTriggered,
  } = useAppStore();

  const [showLangMenu, setShowLangMenu] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Close lang menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return t('nav.dashboard');
      case 'quick-review':
        return t('nav.quickReview');
      case 'large-duplicates':
        return t('nav.largeDuplicates', 'Large & Duplicates');
      case 'trash-manager':
        return t('nav.trashManager', 'Trash Manager');
      case 'tidy-up':
        return t('nav.tidyUp');
      case 'apps':
        return t('nav.apps');
      case 'system-clean':
        return t('nav.systemClean');
      case 'dev-workspace':
        return t('nav.devWorkspace');
      case 'settings':
        return t('nav.settings');
      default:
        return t('common.appName');
    }
  };

  const freeSpaceFormatted = diskInfo ? formatSize(diskInfo.freeSpace) : null;

  return (
    <header
      data-tauri-drag-region
      className="h-12 w-full shrink-0 rounded-2xl glass-panel shadow-md border border-black/8 dark:border-white/10 px-4 sm:px-5 flex items-center justify-between gap-3 select-none z-20 backdrop-blur-2xl"
    >
      {/* Left side: Page Title & Disk Info */}
      <div data-tauri-drag-region className="flex items-center gap-2.5 shrink-0 min-w-0">
        <h2 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-neutral-100 tracking-tight truncate">
          {getPageTitle()}
        </h2>

        {freeSpaceFormatted && (
          <button
            type="button"
            onClick={() => setCurrentPage('dashboard')}
            title={t('topBar.diskTooltip', 'Click to view storage details in Dashboard')}
            className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-black/4 dark:bg-white/6 text-slate-600 dark:text-neutral-400 hover:text-accent transition-colors cursor-pointer"
          >
            <HardDrive size={11} className="text-accent shrink-0" />
            <span>
              {freeSpaceFormatted} {t('nav.free')}
            </span>
          </button>
        )}
      </div>

      {/* Center: Universal Spotlight Search Pill */}
      <div className="flex-1 max-w-md mx-auto px-2">
        <button
          type="button"
          onClick={openSpotlight}
          className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-black/3 dark:bg-white/5 border border-black/6 dark:border-white/8 hover:bg-white/80 dark:hover:bg-neutral-800/80 hover:border-accent/40 dark:hover:border-accent/40 text-slate-400 dark:text-neutral-500 hover:text-slate-700 dark:hover:text-neutral-200 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center gap-2 truncate">
            <Search
              size={13}
              className="text-slate-400 group-hover:text-accent transition-colors shrink-0"
            />
            <span className="text-xs truncate font-normal">
              {t('topBar.searchPlaceholder', 'Search apps, files, actions...')}
            </span>
          </div>

          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/6 dark:bg-white/8 text-[10px] font-mono text-slate-500 dark:text-neutral-400 shrink-0 shadow-2xs">
            <Command size={10} />
            <span>K</span>
          </div>
        </button>
      </div>

      {/* Right side: Quick Action Controls */}
      <div data-tauri-drag-region className="flex items-center gap-1.5 shrink-0">
        {/* Low Disk Space Alert Pill */}
        {lowDiskSpaceTriggered && (
          <button
            type="button"
            onClick={() => setCurrentPage('system-clean')}
            title={t('lowDiskWarning.desc', { freeSpace: freeSpaceFormatted || '' })}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 transition-all cursor-pointer animate-pulse"
          >
            <AlertTriangle size={12} className="shrink-0 text-rose-500" />
            <span className="text-[11px] font-medium">
              {t('lowDiskWarning.title', 'Low Disk Space')}
            </span>
          </button>
        )}

        {/* Update Notification Pill */}
        {updateInfo?.available && (
          <button
            type="button"
            onClick={() => setCurrentPage('settings')}
            title={`Beberes v${updateInfo.latestVersion} available! Click to update.`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer animate-pulse"
          >
            <ArrowDownCircle size={12} className="shrink-0" />
            <span className="text-[11px] font-medium">
              {t('updates.topBarBadge', 'Update: v{version}', { version: updateInfo.latestVersion })}
            </span>
          </button>
        )}

        {/* Universal Scan / Refresh Button */}
        <button
          type="button"
          onClick={() => {
            triggerGlobalRefresh();
            refreshDisks();
          }}
          disabled={isScanning}
          title={t('common.refresh', 'Scan / Refresh Page')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/10 text-slate-700 dark:text-neutral-300 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={12} className={`text-accent shrink-0 ${isScanning ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline text-[11px] font-medium">
            {isScanning ? t('common.scanning', 'Scanning...') : t('common.refresh', 'Refresh')}
          </span>
        </button>

        {/* Deletion Mode Toggle */}
        <button
          type="button"
          onClick={toggleDeleteToTrash}
          title={
            deleteToTrash
              ? t('settings.trashModeTitle') + ' (Click to change)'
              : t('settings.directDeleteTitle') + ' (Click to change)'
          }
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/10 text-slate-700 dark:text-neutral-300 transition-colors cursor-pointer"
        >
          <Trash2 size={12} className={deleteToTrash ? 'text-accent' : 'text-rose-500'} />
          <span className="hidden lg:inline text-[11px]">
            {deleteToTrash ? t('common.trashMode') : t('common.directDelete')}
          </span>
        </button>

        {/* Quick Clean Trigger */}
        <button
          type="button"
          onClick={() => setCurrentPage('system-clean')}
          title={t('dashboard.smartClean')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-accent-subtle text-accent hover:bg-accent/20 transition-colors cursor-pointer"
        >
          <Sparkles size={12} />
          <span className="hidden xl:inline text-[11px] font-semibold">
            {t('dashboard.smartClean')}
          </span>
        </button>

        {/* Language Switcher Dropdown */}
        <div className="relative" ref={langMenuRef}>
          <button
            type="button"
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/8 transition-colors cursor-pointer"
            title={t('settings.language')}
          >
            <Globe size={12} />
            <span className="text-[11px] uppercase font-mono">{language}</span>
            <ChevronDown size={10} className="text-slate-400" />
          </button>

          {showLangMenu && (
            <div className="absolute right-0 mt-2 w-36 rounded-2xl glass-panel py-1.5 shadow-2xl z-50 border border-black/10 dark:border-white/10 backdrop-blur-2xl animate-fade-in">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.code);
                    setShowLangMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left cursor-pointer transition-colors ${
                    language === lang.code
                      ? 'bg-accent-subtle text-accent font-semibold'
                      : 'text-slate-700 dark:text-neutral-200 hover:bg-black/4 dark:hover:bg-white/6'
                  }`}
                >
                  <span>{lang.name}</span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    {lang.code}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dark / Light Mode Toggle */}
        <button
          type="button"
          onClick={toggleDarkMode}
          title={isDarkMode ? t('settings.lightMode') : t('settings.darkMode')}
          className="p-1.5 rounded-lg text-slate-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/8 transition-colors cursor-pointer"
        >
          {isDarkMode ? <Sun size={13} /> : <Moon size={13} />}
        </button>
      </div>
    </header>
  );
}
