import { useState, useEffect, useRef } from 'react';
import { useAppStore, type ViewPage } from '../../store/appStore';
import {
  LayoutDashboard,
  FolderTree,
  Sparkles,
  Code2,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  AppWindow,
  Eye,
  Layers,
  Trash2,
  Info,
  PieChart,
  Zap,
  ShieldAlert,
  GitBranch,
} from 'lucide-react';
import { useTranslation } from '../../lib/i18n';
import DriveSelector from './DriveSelector';

interface NavGroup {
  categoryKey: string;
  items: { id: ViewPage; labelKey: string; icon: React.ReactNode }[];
}

const navGroups: NavGroup[] = [
  {
    categoryKey: 'nav.categories.overview',
    items: [
      { id: 'dashboard', labelKey: 'nav.dashboard', icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    categoryKey: 'nav.categories.cleaning',
    items: [
      { id: 'system-clean', labelKey: 'nav.systemClean', icon: <Sparkles size={16} /> },
      { id: 'apps', labelKey: 'nav.apps', icon: <AppWindow size={16} /> },
      { id: 'trash-manager', labelKey: 'nav.trashManager', icon: <Trash2 size={16} /> },
      { id: 'file-shredder', labelKey: 'nav.fileShredder', icon: <ShieldAlert size={16} /> },
    ],
  },
  {
    categoryKey: 'nav.categories.organization',
    items: [
      { id: 'tidy-up', labelKey: 'nav.tidyUp', icon: <FolderTree size={16} /> },
      { id: 'large-duplicates', labelKey: 'nav.largeDuplicates', icon: <Layers size={16} /> },
      { id: 'quick-review', labelKey: 'nav.quickReview', icon: <Eye size={16} /> },
      { id: 'disk-visualizer', labelKey: 'nav.diskVisualizer', icon: <PieChart size={16} /> },
    ],
  },
  {
    categoryKey: 'nav.categories.developer',
    items: [
      { id: 'dev-workspace', labelKey: 'nav.devWorkspace', icon: <Code2 size={16} /> },
      { id: 'git-sweeper', labelKey: 'nav.gitSweeper', icon: <GitBranch size={16} /> },
      { id: 'startup-manager', labelKey: 'nav.startupManager', icon: <Zap size={16} /> },
    ],
  },
];

const MIN_WIDTH = 64;
const COLLAPSE_THRESHOLD = 135;
const DEFAULT_WIDTH = 220;
const MAX_WIDTH = 320;

export default function FloatingSidebar() {
  const { currentPage, setCurrentPage, openAboutModal } = useAppStore();
  const { t } = useTranslation();

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

  const [hoveredTooltip, setHoveredTooltip] = useState<{ label: string; x: number; y: number } | null>(null);

  // Toggle collapse state
  const handleToggleCollapse = () => {
    setHoveredTooltip(null);
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

  const handleItemMouseEnter = (label: string, e: React.MouseEvent<HTMLElement>) => {
    if (!isCollapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredTooltip({
      label,
      x: rect.right + 10,
      y: rect.top + rect.height / 2,
    });
  };

  const handleItemMouseLeave = () => {
    setHoveredTooltip(null);
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
      <div className="flex items-center justify-between px-3 py-3.5 border-b border-black/4 dark:border-white/6">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/icon-beberes.webp"
              alt="Beberes"
              className="w-7 h-7 rounded-xl object-cover shadow-xs shrink-0"
            />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight truncate">
                Beberes
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={handleToggleCollapse}
            onMouseEnter={(e) => handleItemMouseEnter(t('nav.expand', 'Expand Sidebar'), e)}
            onMouseLeave={handleItemMouseLeave}
            className="flex items-center justify-center w-full group cursor-pointer"
          >
            <img
              src="/icon-beberes.webp"
              alt="Beberes"
              className="w-7 h-7 rounded-xl object-cover shadow-xs group-hover:scale-105 transition-transform shrink-0"
            />
          </button>
        )}

        {!isCollapsed && (
          <button
            onClick={handleToggleCollapse}
            title="Collapse to icons"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/4 dark:hover:bg-white/6 transition-colors cursor-pointer shrink-0"
          >
            <PanelLeftClose size={14} />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav
        onScroll={handleItemMouseLeave}
        className="flex-1 px-2 py-2 space-y-3 overflow-y-auto overflow-x-hidden"
      >
        {navGroups.map((group, groupIdx) => (
          <div key={group.categoryKey} className="space-y-1">
            {!isCollapsed ? (
              <div className="px-3 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400/80 dark:text-neutral-500 select-none">
                {t(group.categoryKey)}
              </div>
            ) : groupIdx > 0 ? (
              <div className="h-px bg-black/6 dark:bg-white/6 mx-2 my-2" />
            ) : null}

            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = currentPage === item.id;
                const label = t(item.labelKey);

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleItemMouseLeave();
                      setCurrentPage(item.id);
                    }}
                    onMouseEnter={(e) => handleItemMouseEnter(label, e)}
                    onMouseLeave={handleItemMouseLeave}
                    className={`
                      w-full flex items-center gap-2.5 rounded-xl text-xs font-semibold
                      transition-all duration-150 cursor-pointer
                      ${
                        isCollapsed
                          ? 'justify-center p-2.5'
                          : 'px-3 py-2 text-left'
                      }
                      ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                          : 'text-slate-600 dark:text-neutral-400 hover:bg-black/3 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                      }
                    `}
                  >
                    <div className="shrink-0">{item.icon}</div>
                    {!isCollapsed && <span className="truncate">{label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Area: Multi-Drive Selector & Settings / About */}
      <div className="p-2 border-t border-black/4 dark:border-white/6 space-y-1.5">
        {/* Interactive Drive / Flashdisk Selector */}
        <DriveSelector isCollapsed={isCollapsed} />

        {/* Bottom Actions: Settings & About App */}
        <div className="space-y-1 pt-1 border-t border-black/4 dark:border-white/6">
          {/* Settings Button */}
          <button
            onClick={() => {
              handleItemMouseLeave();
              setCurrentPage('settings');
            }}
            onMouseEnter={(e) => handleItemMouseEnter(t('nav.settings'), e)}
            onMouseLeave={handleItemMouseLeave}
            className={`
              w-full flex items-center gap-2.5 rounded-xl text-xs font-semibold
              transition-all duration-150 cursor-pointer
              ${isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 text-left'}
              ${
                currentPage === 'settings'
                  ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                  : 'text-slate-600 dark:text-neutral-400 hover:bg-black/3 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
              }
            `}
          >
            <Settings size={16} className="shrink-0" />
            {!isCollapsed && <span className="truncate">{t('nav.settings')}</span>}
          </button>

          {/* About App Button */}
          <button
            onClick={() => {
              handleItemMouseLeave();
              openAboutModal();
            }}
            onMouseEnter={(e) => handleItemMouseEnter(t('about.title', 'About Beberes'), e)}
            onMouseLeave={handleItemMouseLeave}
            className={`
              w-full flex items-center gap-2.5 rounded-xl text-xs font-semibold
              transition-all duration-150 cursor-pointer text-slate-500 dark:text-neutral-400
              hover:bg-black/3 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white
              ${isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 text-left'}
            `}
          >
            <Info size={16} className="shrink-0 text-slate-400 dark:text-neutral-500" />
            {!isCollapsed && <span className="truncate">{t('about.title', 'About Beberes')}</span>}
          </button>

          {/* Expand Button when Collapsed */}
          {isCollapsed && (
            <button
              onClick={handleToggleCollapse}
              onMouseEnter={(e) => handleItemMouseEnter(t('nav.expand', 'Expand Sidebar'), e)}
              onMouseLeave={handleItemMouseLeave}
              className="w-full flex items-center justify-center p-2.5 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/4 dark:hover:bg-white/6 cursor-pointer"
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

      {/* Instant Floating Tooltip when Collapsed */}
      {isCollapsed && hoveredTooltip && (
        <div
          style={{ left: `${hoveredTooltip.x}px`, top: `${hoveredTooltip.y}px` }}
          className="fixed -translate-y-1/2 z-50 pointer-events-none whitespace-nowrap rounded-xl px-2.5 py-1 text-xs font-semibold bg-slate-900/90 text-white dark:bg-neutral-800/95 dark:text-white shadow-xl border border-black/10 dark:border-white/10 backdrop-blur-xl animate-fade-in"
        >
          {hoveredTooltip.label}
        </div>
      )}
    </aside>
  );
}
