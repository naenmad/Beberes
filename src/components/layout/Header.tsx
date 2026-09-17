import { useAppStore } from '../../store/appStore';
import StorageRing from '../ui/StorageRing';

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  'system-clean': 'System Clean',
  'dev-workspace': 'Dev Workspace',
  settings: 'Settings',
};

const pageDescriptions: Record<string, string> = {
  dashboard: 'Overview of your system storage',
  'system-clean': 'Clean system cache, logs, and junk files',
  'dev-workspace': 'Clean development caches and build artifacts',
  settings: 'Configure cleanup preferences',
};

export default function Header() {
  const { currentPage, diskInfo } = useAppStore();

  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {pageTitles[currentPage]}
        </h1>
        <p className="text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
          {pageDescriptions[currentPage]}
        </p>
      </div>

      {diskInfo && currentPage === 'dashboard' && (
        <StorageRing
          used={diskInfo.usedSpace}
          total={diskInfo.totalSpace}
          size={56}
        />
      )}
    </header>
  );
}
