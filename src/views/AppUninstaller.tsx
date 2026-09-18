import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useTranslation } from '../lib/i18n';
import {
  scanInstalledApps,
  uninstallApp,
  revealInFinder,
  type AppItem,
  type UninstallResult,
} from '../lib/commands';
import { formatSize } from '../lib/utils';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import PageHeader from '../components/layout/PageHeader';
import ConfirmModal from '../components/ui/ConfirmModal';
import CleaningFlowModal from '../components/ui/CleaningFlowModal';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import {
  AppWindow,
  Search,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  HardDrive,
  PackageOpen,
  Layers,
  Database,
  SlidersHorizontal,
} from 'lucide-react';

type AppFilter = 'all' | 'user' | 'large' | 'system';
type SortOption = 'size' | 'name' | 'recent';

export default function AppUninstaller() {
  const { t } = useTranslation();
  const { deleteToTrash, toggleDeleteToTrash, recordCleanResult } = useAppStore();

  const [apps, setApps] = useState<AppItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<AppFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('size');

  // Expanded leftovers per app
  const [expandedAppIds, setExpandedAppIds] = useState<Set<string>>(new Set());
  // Selected leftover paths per app (default: all selected)
  const [selectedLeftoversMap, setSelectedLeftoversMap] = useState<Record<string, Set<string>>>({});

  // Active target app for uninstallation
  const [targetApp, setTargetApp] = useState<AppItem | null>(null);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCleaningFlow, setShowCleaningFlow] = useState(false);
  const [activeUninstallStats, setActiveUninstallStats] = useState({
    totalBytes: 0,
    totalItems: 0,
    paths: [] as string[],
    appName: '',
  });

  const runScan = async () => {
    setIsLoading(true);
    try {
      const data = await scanInstalledApps();
      setApps(data);

      // Initialize selected leftovers for all apps
      const map: Record<string, Set<string>> = {};
      for (const app of data) {
        map[app.id] = new Set(app.leftovers.map((l) => l.path));
      }
      setSelectedLeftoversMap(map);
    } catch (err) {
      console.error('Failed to scan installed apps:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runScan();
  }, []);

  const toggleExpand = (appId: string) => {
    setExpandedAppIds((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  };

  const toggleLeftoverSelection = (appId: string, path: string) => {
    setSelectedLeftoversMap((prev) => {
      const currentSet = new Set(prev[appId] || []);
      if (currentSet.has(path)) currentSet.delete(path);
      else currentSet.add(path);
      return { ...prev, [appId]: currentSet };
    });
  };

  const handleReveal = async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    try {
      await revealInFinder(path);
    } catch (err) {
      console.error('Failed to reveal app in Finder:', err);
    }
  };

  // Filter & Search
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      if (filter === 'user' && app.isSystemApp) return false;
      if (filter === 'system' && !app.isSystemApp) return false;
      if (filter === 'large' && app.totalSize < 1024 * 1024 * 1024) return false; // < 1 GB

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          app.name.toLowerCase().includes(q) ||
          app.bundleId.toLowerCase().includes(q) ||
          app.path.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [apps, filter, searchQuery]);

  // Sort
  const sortedApps = useMemo(() => {
    const list = [...filteredApps];
    if (sortBy === 'size') {
      list.sort((a, b) => b.totalSize - a.totalSize);
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [filteredApps, sortBy]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalApps = apps.length;
    const userApps = apps.filter((a) => !a.isSystemApp).length;
    const totalBytes = apps.reduce((sum, a) => sum + a.totalSize, 0);
    const totalLeftovers = apps.reduce((sum, a) => sum + a.leftoversSize, 0);
    return { totalApps, userApps, totalBytes, totalLeftovers };
  }, [apps]);

  // Trigger Uninstall Flow
  const handleInitiateUninstall = (app: AppItem) => {
    if (app.isSystemApp) return;

    const selectedLeftoverPaths = Array.from(selectedLeftoversMap[app.id] || []);
    const selectedLeftoversSize = app.leftovers
      .filter((l) => selectedLeftoverPaths.includes(l.path))
      .reduce((sum, l) => sum + l.size, 0);

    const totalToFree = app.appSize + selectedLeftoversSize;
    const allPaths = [app.path, ...selectedLeftoverPaths];

    setTargetApp(app);
    setActiveUninstallStats({
      totalBytes: totalToFree,
      totalItems: allPaths.length,
      paths: allPaths,
      appName: app.name,
    });
    setShowConfirmModal(true);
  };

  const handleExecuteUninstall = async () => {
    if (!targetApp) return;
    setShowConfirmModal(false);
    setShowCleaningFlow(true);
    setIsUninstalling(true);

    try {
      const selectedLeftovers = Array.from(selectedLeftoversMap[targetApp.id] || []);
      const result: UninstallResult = await uninstallApp(
        targetApp.path,
        selectedLeftovers,
        false,
        deleteToTrash
      );

      recordCleanResult(
        result.freedBytes,
        result.deletedCount,
        false,
        [`App: ${targetApp.name}`]
      );
      await runScan();
    } catch (err) {
      console.error('Failed to uninstall app:', err);
    } finally {
      setIsUninstalling(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Top Banner & Title */}
      <PageHeader
        icon={<AppWindow size={20} />}
        iconColor="text-blue-500"
        title={t('apps.title')}
        subtitle={t('apps.subtitle')}
        badge={
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
            {t('apps.installedCount', '{count} installed', { count: apps.length })}
          </span>
        }
        actions={
          <>
            <button
              onClick={toggleDeleteToTrash}
              title="Toggle delete mode"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold glass-panel text-slate-700 dark:text-neutral-200 cursor-pointer hover:border-blue-500/40 transition-colors"
            >
              <Trash2 size={13} className={deleteToTrash ? 'text-blue-500' : 'text-rose-500'} />
              <span>{t('common.mode')}: {deleteToTrash ? t('common.trashMode') : t('common.directDelete')}</span>
            </button>

            <Button
              onClick={runScan}
              loading={isLoading}
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={13} />}
            >
              {isLoading ? t('common.scanning') : t('common.refresh')}
            </Button>
          </>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5!">
          <div className="flex items-center gap-2 text-slate-400 dark:text-neutral-500 text-xs font-medium">
            <AppWindow size={14} className="text-blue-500" />
            <span>{t('apps.statTotalApps')}</span>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {stats.totalApps}
          </p>
          <span className="text-[10px] text-slate-400">
            {t('apps.statUserApps', '{count} user-installed', { count: stats.userApps })}
          </span>
        </Card>

        <Card className="p-3.5!">
          <div className="flex items-center gap-2 text-slate-400 dark:text-neutral-500 text-xs font-medium">
            <HardDrive size={14} className="text-indigo-500" />
            <span>{t('apps.statFootprint')}</span>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {formatSize(stats.totalBytes)}
          </p>
          <span className="text-[10px] text-slate-400">
            {t('apps.statFootprintDesc')}
          </span>
        </Card>

        <Card className="p-3.5!">
          <div className="flex items-center gap-2 text-slate-400 dark:text-neutral-500 text-xs font-medium">
            <Layers size={14} className="text-amber-500" />
            <span>{t('apps.statResidual')}</span>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {formatSize(stats.totalLeftovers)}
          </p>
          <span className="text-[10px] text-slate-400">
            {t('apps.statResidualDesc')}
          </span>
        </Card>

        <Card className="p-3.5!">
          <div className="flex items-center gap-2 text-slate-400 dark:text-neutral-500 text-xs font-medium">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>{t('apps.statSystemShield')}</span>
          </div>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {t('apps.statActive')}
          </p>
          <span className="text-[10px] text-slate-400">
            {t('apps.statSystemShieldDesc')}
          </span>
        </Card>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 p-1 rounded-xl glass-pill w-fit overflow-x-auto">
          {(['all', 'user', 'large', 'system'] as AppFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer capitalize ${
                filter === tab
                  ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab === 'all'
                ? t('apps.filterAll')
                : tab === 'user'
                ? t('apps.filterUser')
                : tab === 'large'
                ? t('apps.filterLarge')
                : t('apps.filterSystem')}
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('apps.searchPlaceholder')}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-black/6 dark:border-white/8 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => setSortBy(sortBy === 'size' ? 'name' : 'size')}
            title={t('apps.sortBy', 'Sort by {sort}', { sort: sortBy === 'size' ? t('apps.sortSize') : t('apps.sortName') })}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl glass-panel text-xs font-semibold text-slate-600 dark:text-neutral-300 cursor-pointer hover:text-slate-900 dark:hover:text-white"
          >
            <SlidersHorizontal size={12} />
            <span>{sortBy === 'size' ? t('apps.sortSize') : t('apps.sortName')}</span>
          </button>
        </div>
      </div>

      {/* App List */}
      {isLoading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : sortedApps.length === 0 ? (
        <div className="p-12 text-center rounded-2xl glass-panel">
          <PackageOpen size={36} className="mx-auto text-slate-300 dark:text-neutral-600 mb-2" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-neutral-300">
            {t('apps.emptySearchTitle')}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {t('apps.emptySearchDesc')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedApps.map((app) => {
            const isExpanded = expandedAppIds.has(app.id);
            const selectedLeftovers = selectedLeftoversMap[app.id] || new Set();
            const totalLeftoversSize = app.leftovers
              .filter((l) => selectedLeftovers.has(l.path))
              .reduce((sum, l) => sum + l.size, 0);
            const totalActionSize = app.appSize + totalLeftoversSize;

            return (
              <Card key={app.id} className="overflow-hidden">
                <CardBody className="p-4!">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* App Header & Basic Info */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-black/4 dark:bg-white/6 border border-black/6 dark:border-white/8 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                        {app.icon ? (
                          <img
                            src={app.icon}
                            alt={app.name}
                            className="w-full h-full object-contain p-0.5 rounded-2xl"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <AppWindow size={20} className="text-blue-600 dark:text-blue-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {app.name}
                          </h3>
                          <span className="text-[10px] text-slate-400 font-mono">
                            v{app.version}
                          </span>

                          {app.isSystemApp ? (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <ShieldCheck size={10} />
                              {t('apps.systemAppBadge')}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-500 dark:text-neutral-400 bg-black/3 dark:bg-white/5 px-2 py-0.5 rounded-full">
                              {t('apps.userAppBadge')}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 dark:text-neutral-400 font-mono truncate mt-0.5">
                          {app.bundleId || app.path}
                        </p>
                      </div>
                    </div>

                    {/* Size & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-800 dark:text-neutral-200">
                          {formatSize(app.totalSize)}
                        </span>
                        {app.leftovers.length > 0 && (
                          <p className="text-[10px] text-slate-400">
                            {t('apps.sizeBreakdown', '{bin} binary + {data} data', {
                              bin: formatSize(app.appSize),
                              data: formatSize(app.leftoversSize),
                            })}
                          </p>
                        )}
                      </div>

                      {/* Reveal in Finder */}
                      <button
                        onClick={(e) => handleReveal(e, app.path)}
                        title={t('common.revealInFinder')}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/4 dark:hover:bg-white/6 transition-colors cursor-pointer"
                      >
                        <ExternalLink size={14} />
                      </button>

                      {/* Expand Residual Leftovers */}
                      {app.leftovers.length > 0 && (
                        <button
                          onClick={() => toggleExpand(app.id)}
                          title="Inspect residual leftover files"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-black/2 dark:bg-white/4 text-slate-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/8 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <span>{t('apps.dataFilesCount', '{count} data files', { count: app.leftovers.length })}</span>
                          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        </button>
                      )}

                      {/* Uninstall Button */}
                      {!app.isSystemApp ? (
                        <Button
                          onClick={() => handleInitiateUninstall(app)}
                          variant="danger"
                          size="sm"
                          icon={<Trash2 size={13} />}
                        >
                          {t('apps.uninstall')}
                        </Button>
                      ) : (
                        <button
                          disabled
                          title={t('apps.systemAppLockTooltip')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 bg-black/2 dark:bg-white/2 border border-black/4 dark:border-white/4 cursor-not-allowed opacity-60"
                        >
                          <ShieldCheck size={13} />
                          <span>{t('apps.protected')}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Leftover Data Drawer */}
                  {isExpanded && app.leftovers.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-black/4 dark:border-white/6 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 px-1">
                        <span className="font-semibold flex items-center gap-1.5">
                          <Database size={12} className="text-blue-500" />
                          {t('apps.leftoversDrawerTitle')}
                        </span>
                        <span>{t('apps.selectedTotal', 'Selected: {size}', { size: formatSize(totalActionSize) })}</span>
                      </div>

                      <div className="space-y-1 rounded-2xl bg-black/2 dark:bg-white/3 p-2 border border-black/4 dark:border-white/6">
                        {/* Main App binary row */}
                        <div className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-white/60 dark:bg-neutral-800/60">
                          <div className="flex items-center gap-2 truncate">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              {t('apps.appBundle')}
                            </span>
                            <span className="font-mono text-slate-700 dark:text-neutral-300 truncate" title={app.path}>
                              {app.path}
                            </span>
                          </div>
                          <span className="font-bold text-slate-700 dark:text-neutral-300 shrink-0 ml-2">
                            {formatSize(app.appSize)}
                          </span>
                        </div>

                        {/* Leftover paths */}
                        {app.leftovers.map((item) => {
                          const isChecked = selectedLeftovers.has(item.path);
                          return (
                            <label
                              key={item.path}
                              className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-black/2 dark:hover:bg-white/4 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2 truncate min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleLeftoverSelection(app.id, item.path)}
                                  className="rounded text-blue-600 focus:ring-blue-500 shrink-0"
                                />
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-neutral-700 text-slate-600 dark:text-neutral-300 capitalize shrink-0">
                                  {item.kind.replace('_', ' ')}
                                </span>
                                <span
                                  className="font-mono text-slate-600 dark:text-neutral-400 truncate"
                                  title={item.path}
                                >
                                  {item.path}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <span className="font-semibold text-slate-600 dark:text-neutral-400">
                                  {formatSize(item.size)}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleReveal(e, item.path)}
                                  title={t('common.revealInFinder')}
                                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                >
                                  <ExternalLink size={11} />
                                </button>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Uninstall Confirmation Modal */}
      {targetApp && (
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleExecuteUninstall}
          isLoading={isUninstalling}
          actionType="clean"
          title={t('apps.confirmUninstallTitle', 'Uninstall {name}', { name: targetApp.name })}
          itemsCount={activeUninstallStats.totalItems}
          totalBytes={activeUninstallStats.totalBytes}
          paths={activeUninstallStats.paths}
          useTrash={deleteToTrash}
          confirmText={
            deleteToTrash
              ? t('apps.confirmTrashBtn', 'Move to Trash ({size})', { size: formatSize(activeUninstallStats.totalBytes) })
              : t('apps.confirmDirectBtn', 'Uninstall Permanently ({size})', { size: formatSize(activeUninstallStats.totalBytes) })
          }
        />
      )}

      {/* Interactive Progress Flow Modal */}
      <CleaningFlowModal
        isOpen={showCleaningFlow}
        onClose={() => setShowCleaningFlow(false)}
        isCleaning={isUninstalling}
        isDryRun={false}
        mode="clean"
        totalBytes={activeUninstallStats.totalBytes}
        totalItems={activeUninstallStats.totalItems}
        paths={activeUninstallStats.paths}
        title={t('apps.uninstallingFlowTitle', 'Uninstalling {name}', { name: activeUninstallStats.appName })}
      />
    </div>
  );
}
