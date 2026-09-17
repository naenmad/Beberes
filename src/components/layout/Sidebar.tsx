import { useAppStore, type ViewPage } from '../../store/appStore';
import {
  LayoutDashboard,
  Sparkles,
  Code2,
  Settings,
  Sun,
  Moon,
  HardDrive,
} from 'lucide-react';
import { formatSize, percentage } from '../../lib/utils';

const navItems: { id: ViewPage; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'system-clean', label: 'System Clean', icon: <Sparkles size={20} /> },
  { id: 'dev-workspace', label: 'Dev Workspace', icon: <Code2 size={20} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
];

export default function Sidebar() {
  const { currentPage, setCurrentPage, isDarkMode, toggleDarkMode, diskInfo } = useAppStore();

  const diskPercent = diskInfo
    ? percentage(diskInfo.usedSpace, diskInfo.totalSpace)
    : 0;

  return (
    <aside className="flex flex-col w-64 h-full border-r border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-[#1c1c1c] shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Beberes
          </h1>
          <p className="text-[11px] text-slate-400 dark:text-neutral-500 -mt-0.5">
            System Cleaner
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-2 space-y-1">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 cursor-pointer
                ${
                  isActive
                    ? 'bg-white dark:bg-neutral-700/60 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 dark:text-neutral-400 hover:bg-white/60 dark:hover:bg-neutral-800 hover:text-slate-700 dark:hover:text-neutral-200'
                }
              `}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Disk Info Mini */}
      {diskInfo && (
        <div className="mx-3 mb-3 p-3 rounded-xl bg-white dark:bg-neutral-800 border border-slate-100 dark:border-neutral-700">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive size={14} className="text-slate-400 dark:text-neutral-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-neutral-300">
              {diskInfo.diskName}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                diskPercent > 90
                  ? 'bg-rose-500'
                  : diskPercent > 70
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${diskPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[11px] text-slate-400 dark:text-neutral-500">
              {formatSize(diskInfo.freeSpace)} free
            </span>
            <span className="text-[11px] text-slate-400 dark:text-neutral-500">
              {formatSize(diskInfo.totalSpace)}
            </span>
          </div>
        </div>
      )}

      {/* Theme Toggle */}
      <div className="px-3 pb-4">
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 dark:text-neutral-400 hover:bg-white/60 dark:hover:bg-neutral-800 transition-all duration-200 cursor-pointer"
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          {isDarkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>
    </aside>
  );
}
