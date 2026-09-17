import { useState, useEffect, useRef } from 'react';
import { useAppStore, type ViewPage } from '../../store/appStore';
import {
  LayoutDashboard,
  FolderTree,
  Sparkles,
  Code2,
  Settings,
  Sun,
  Moon,
  HardDrive,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  AppWindow,
  Globe,
  Eye,
  Layers,
  Trash2,
} from 'lucide-react';
import { formatSize, percentage } from '../../lib/utils';
import { useTranslation } from '../../lib/i18n';
import { supportedLanguages } from '../../locales';

const navDefinitions: { id: ViewPage; labelKey: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', labelKey: 'nav.dashboard', icon: <LayoutDashboard size={16} /> },
  { id: 'quick-review', labelKey: 'nav.quickReview', icon: <Eye size={16} /> },
  { id: 'large-duplicates', labelKey: 'nav.largeDuplicates', icon: <Layers size={16} /> },
  { id: 'trash-manager', labelKey: 'nav.trashManager', icon: <Trash2 size={16} /> },
  { id: 'tidy-up', labelKey: 'nav.tidyUp', icon: <FolderTree size={16} /> },
  { id: 'apps', labelKey: 'nav.apps', icon: <AppWindow size={16} /> },
  { id: 'system-clean', labelKey: 'nav.systemClean', icon: <Sparkles size={16} /> },
  { id: 'dev-workspace', labelKey: 'nav.devWorkspace', icon: <Code2 size={16} /> },
  { id: 'settings', labelKey: 'nav.settings', icon: <Settings size={16} /> },
];

const MIN_WIDTH = 64;
const COLLAPSE_THRESHOLD = 135;
const DEFAULT_WIDTH = 220;
const MAX_WIDTH = 320;

export default function FloatingSidebar() {
  const { currentPage, setCurrentPage, isDarkMode, toggleDarkMode, diskInfo } = useAppStore();
  const { t, language, setLanguage } = useTranslation();

  const handleCycleLanguage = () => {
    const currentIndex = supportedLanguages.findIndex((l) => l.code === language);
    const next = supportedLanguages[(currentIndex + 1) % supportedLanguages.length];
    setLanguage(next.code);
  };

  const [width, setWidth] = useState<number>(() => {
    const saved = localStorage.getItem('beberes_sidebar_width');
    if (!saved) return DEFAULT_WIDTH;
    const parsed = parseInt(saved, 10);
    return isNaN(parsed) ? DEFAULT_WIDTH : Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, parsed));
  });

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => width <= COLLAPSE_THRESHOLD);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(width);
  const latestWidthRef = useRef<number>(width);

  const diskPercent = diskInfo ? percentage(diskInfo.usedSpace, diskInfo.totalSpace) : 0;

  // Toggle collapse state
  const handleToggleCollapse = () => {
    if (isCollapsed) {
      const targetWidth = DEFAULT_WIDTH;
      setWidth(targetWidth);
      setIsCollapsed(false);
      latestWidthRef.current = targetWidth;
      localStorage.setItem('beberes_sidebar_width', String(targetWidth));
    } else {
      const targetWidth = MIN_WIDTH;
      setWidth(targetWidth);
      setIsCollapsed(true);
      latestWidthRef.current = targetWidth;
      localStorage.setItem('beberes_sidebar_width', String(targetWidth));
    }
  };

  // Drag resizing handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = isCollapsed ? MIN_WIDTH : width;
    latestWidthRef.current = startWidthRef.current;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current;
      const calculatedWidth = startWidthRef.current + deltaX;

      if (calculatedWidth < COLLAPSE_THRESHOLD) {
        setIsCollapsed(true);
        setWidth(MIN_WIDTH);
        latestWidthRef.current = MIN_WIDTH;
      } else {
        const clampedWidth = Math.min(MAX_WIDTH, Math.max(COLLAPSE_THRESHOLD, calculatedWidth));
        setIsCollapsed(false);
        setWidth(clampedWidth);
        latestWidthRef.current = clampedWidth;
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('beberes_sidebar_width', String(latestWidthRef.current));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  return (
    <aside
      style={{ width: `${isCollapsed ? MIN_WIDTH : width}px` }}
      className={`
        relative flex flex-col h-[calc(100vh-1.5rem)] my-3 ml-3 shrink-0 select-none
        glass-panel rounded-3xl z-30 transition-[width] shadow-lg
        ${isDragging ? 'duration-0 cursor-col-resize' : 'duration-200 ease-out'}
      `}
    >
      {/* Top Header: Logo & Collapse Button */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-black/[0.04] dark:border-white/[0.06]">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xs shrink-0">
              <Sparkles size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  Beberes
                </span>
                <span className="flex items-center gap-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1 py-0.2 rounded-full">
                  <ShieldCheck size={8} />
                </span>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={handleToggleCollapse}
            title="Click to expand sidebar"
            className="flex items-center justify-center w-full group cursor-pointer"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xs group-hover:scale-105 transition-transform">
              <Sparkles size={14} />
            </div>
          </button>
        )}

        {!isCollapsed && (
          <button
            onClick={handleToggleCollapse}
            title="Collapse to icons"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
          >
            <PanelLeftClose size={14} />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2 py-3 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {navDefinitions.map((item) => {
          const isActive = currentPage === item.id;
          const label = t(item.labelKey);

          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              title={isCollapsed ? label : undefined}
              className={`
                w-full flex items-center gap-2.5 rounded-xl text-xs font-semibold
                transition-all duration-150 cursor-pointer
                ${
                  isCollapsed
                    ? 'justify-center p-2.5'
                    : 'px-3 py-2.5 text-left'
                }
                ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                    : 'text-slate-600 dark:text-neutral-400 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white'
                }
              `}
            >
              <div className="shrink-0">{item.icon}</div>
              {!isCollapsed && <span className="truncate">{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer Area: Disk Mini Bar & Theme / Language / Collapse Controls */}
      <div className="p-2 border-t border-black/[0.04] dark:border-white/[0.06] space-y-2">
        {/* Disk Info Mini */}
        {diskInfo && (
          <div
            className={`rounded-2xl p-2.5 bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] ${
              isCollapsed ? 'text-center' : ''
            }`}
            title={`${t('nav.free')}: ${formatSize(diskInfo.freeSpace)} / Total: ${formatSize(diskInfo.totalSpace)}`}
          >
            {isCollapsed ? (
              <div className="flex flex-col items-center justify-center gap-1">
                <HardDrive size={13} className="text-blue-500" />
                <span className="text-[9px] font-bold text-slate-700 dark:text-neutral-300">
                  {Math.round(diskPercent)}%
                </span>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-slate-400 font-medium">{t('nav.free')}</span>
                  <span className="font-bold text-slate-800 dark:text-neutral-200">
                    {formatSize(diskInfo.freeSpace)}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200/60 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${diskPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Theme, Language & Expand Button */}
        <div className={`flex items-center gap-1 ${isCollapsed ? 'flex-col' : 'flex-row'}`}>
          <button
            onClick={toggleDarkMode}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`
              flex items-center justify-center p-2 rounded-xl text-slate-500 dark:text-neutral-400
              hover:text-slate-800 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
              transition-colors cursor-pointer
              ${isCollapsed ? 'w-full' : 'flex-1'}
            `}
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
            {!isCollapsed && (
              <span className="text-xs font-semibold ml-1.5">
                {isDarkMode ? 'Light' : 'Dark'}
              </span>
            )}
          </button>

          <button
            onClick={handleCycleLanguage}
            title={`${t('settings.language.title')}: ${language.toUpperCase()} (Click to switch)`}
            className={`
              flex items-center justify-center p-2 rounded-xl text-slate-500 dark:text-neutral-400
              hover:text-slate-800 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
              transition-colors cursor-pointer
              ${isCollapsed ? 'w-full' : 'px-2.5'}
            `}
          >
            <Globe size={14} />
            {!isCollapsed && (
              <span className="text-xs font-semibold ml-1.5 uppercase font-mono">
                {language}
              </span>
            )}
          </button>

          {isCollapsed && (
            <button
              onClick={handleToggleCollapse}
              title={t('nav.expand')}
              className="w-full flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
            >
              <PanelLeftOpen size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Resize Handle (Draggable border on right edge) */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={handleToggleCollapse}
        title="Drag to resize (double click to toggle)"
        className={`
          absolute top-0 right-0 w-2.5 h-full cursor-col-resize group rounded-r-3xl transition-colors z-40
          ${isDragging ? 'bg-blue-500/30' : 'hover:bg-blue-500/20'}
        `}
      >
        {/* Subtle center grip indicator on hover */}
        <div className="absolute top-1/2 -translate-y-1/2 right-0.5 flex flex-col gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-0.5 h-3 rounded-full bg-slate-400 dark:bg-neutral-500" />
        </div>
      </div>
    </aside>
  );
}
