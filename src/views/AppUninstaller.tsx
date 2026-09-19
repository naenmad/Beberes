import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useTranslation } from '../lib/i18n';
import {
  scanInstalledApps,
  revealInFinder,
  scanOrphanedLeftovers,
  cleanOrphanedLeftovers,
  type AppItem,
  type OrphanedLeftoverItem,
} from '../lib/commands';
import { formatSize } from '../lib/utils';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Checkbox from '../components/ui/Checkbox';
import PageHeader from '../components/layout/PageHeader';
import ConfirmModal from '../components/ui/ConfirmModal';
import CleaningFlowModal from '../components/ui/CleaningFlowModal';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import {
  AppWindow,
  Search,
  Trash2,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  HardDrive,
  PackageOpen,
  Layers,
  SlidersHorizontal,
  Ghost,
  RefreshCw,
  Sparkles,
  CheckCheck,
  Lock,
  Square,
  CheckSquare,
} from 'lucide-react';

type AppFilter = 'all' | 'user' | 'large' | 'system';
type SortOption = 'size' | 'name' | 'recent';
type ViewMode = 'installed' | 'orphaned';

export default function AppUninstaller() {
  const { t } = useTranslation();
  const {
    recordCleanResult,
    globalRefreshTrigger,
    stagedItems,
    stageItem,
    unstageItem,
    stageMultipleItems,
    unstageMultipleItems,
  } = useAppStore();

  const [viewMode, setViewMode] = useState<ViewMode>('installed');

  // Installed Apps State
  const [apps, setApps] = useState<AppItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<AppFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('size');

  // Expanded leftovers per app
  const [expandedAppIds, setExpandedAppIds] = useState<Set<string>>(new Set());
  // Selected leftover paths per app (default: all selected)
  const [selectedLeftoversMap, setSelectedLeftoversMap] = useState<Record<string, Set<string>>>({});


  // Orphaned Leftovers State
  const [orphanedItems, setOrphanedItems] = useState<OrphanedLeftoverItem[]>([]);
  const [isLoadingOrphaned, setIsLoadingOrphaned] = useState(false);
  const [selectedOrphanedIds, setSelectedOrphanedIds] = useState<Set<string>>(new Set());
  const [orphanedSearchQuery, setOrphanedSearchQuery] = useState('');
  const [isCleaningOrphaned, setIsCleaningOrphaned] = useState(false);
  const [showOrphanedConfirm, setShowOrphanedConfirm] = useState(false);
  const [showOrphanedCleaningFlow, setShowOrphanedCleaningFlow] = useState(false);

  const runScan = async () => {
    setIsLoading(true);
    try {
      const data = await scanInstalledApps();
      setApps(data);

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

  const runOrphanedScan = async () => {
    setIsLoadingOrphaned(true);
    try {
      const res = await scanOrphanedLeftovers();
      setOrphanedItems(res.items);
      setSelectedOrphanedIds(new Set(res.items.map((i) => i.id)));
    } catch (err) {
      console.error('Failed to scan orphaned leftovers:', err);
    } finally {
      setIsLoadingOrphaned(false);
    }
  };

  useEffect(() => {
    runScan();
    runOrphanedScan();
  }, [globalRefreshTrigger]);

  const toggleExpand = (appId: string) => {
    setExpandedAppIds((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  };

  const handleReveal = async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    try {
      await revealInFinder(path);
    } catch (err) {
      console.error('Failed to reveal item in Finder:', err);
    }
  };

  // Filter & Sort Installed Apps
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      if (filter === 'user' && app.isSystemApp) return false;
      if (filter === 'system' && !app.isSystemApp) return false;
      if (filter === 'large' && app.totalSize < 1024 * 1024 * 1024) return false;

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

  const sortedApps = useMemo(() => {
    const list = [...filteredApps];
    if (sortBy === 'size') {
      list.sort((a, b) => b.totalSize - a.totalSize);
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [filteredApps, sortBy]);

  const stats = useMemo(() => {
    const totalApps = apps.length;
    const userApps = apps.filter((a) => !a.isSystemApp).length;
    const totalBytes = apps.reduce((sum, a) => sum + a.totalSize, 0);
    const totalLeftovers = apps.reduce(
      (sum, a) => sum + a.leftovers.reduce((lSum, l) => lSum + l.size, 0),
      0
    );
    return { totalApps, userApps, totalBytes, totalLeftovers };
  }, [apps]);

  // Orphaned Leftovers filtering & statistics
  const filteredOrphaned = useMemo(() => {
    if (!orphanedSearchQuery.trim()) return orphanedItems;
    const q = orphanedSearchQuery.toLowerCase();
    return orphanedItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.inferredApp.toLowerCase().includes(q) ||
        item.path.toLowerCase().includes(q) ||
        item.kind.toLowerCase().includes(q)
    );
  }, [orphanedItems, orphanedSearchQuery]);

  const orphanedStats = useMemo(() => {
    const totalCount = orphanedItems.length;
    const totalSize = orphanedItems.reduce((acc, i) => acc + i.size, 0);
    const selectedItems = orphanedItems.filter((i) => selectedOrphanedIds.has(i.id));
    const selectedCount = selectedItems.length;
    const selectedSize = selectedItems.reduce((acc, i) => acc + i.size, 0);
    return { totalCount, totalSize, selectedCount, selectedSize, selectedItems };
  }, [orphanedItems, selectedOrphanedIds]);

  const handleToggleApp = (app: AppItem) => {
    if (app.isSystemApp) return;

    const stagedKey = `app_${app.id}`;
    if (stagedItems[stagedKey]) {
      unstageItem(stagedKey);
    } else {
      const selectedLeftoverPaths = Array.from(selectedLeftoversMap[app.id] || []);
      const selectedLeftoversSize = app.leftovers
        .filter((l) => selectedLeftoverPaths.includes(l.path))
        .reduce((sum, l) => sum + l.size, 0);
      const totalToFree = app.appSize + selectedLeftoversSize;

      stageItem({
        id: stagedKey,
        name: app.name,
        path: app.path,
        size: totalToFree,
        originPage: 'apps',
        categoryName: t('apps.installedTab'),
        itemType: 'app',
        extraData: {
          appId: app.id,
          leftoverPaths: selectedLeftoverPaths,
          icon: app.icon,
        },
      });
    }
  };

  const uninstallableApps = useMemo(() => {
    return filteredApps.filter((a) => !a.isSystemApp);
  }, [filteredApps]);

  const allUninstallableStaged = useMemo(() => {
    return (
      uninstallableApps.length > 0 &&
      uninstallableApps.every((a) => Boolean(stagedItems[`app_${a.id}`]))
    );
  }, [uninstallableApps, stagedItems]);

  const toggleSelectAllApps = () => {
    if (allUninstallableStaged) {
      unstageMultipleItems(uninstallableApps.map((a) => `app_${a.id}`));
    } else {
      stageMultipleItems(
        uninstallableApps.map((app) => {
          const selectedLeftovers = Array.from(selectedLeftoversMap[app.id] || []);
          const leftoversSize = app.leftovers
            .filter((l) => selectedLeftovers.includes(l.path))
            .reduce((sum, l) => sum + l.size, 0);
          return {
            id: `app_${app.id}`,
            name: app.name,
            path: app.path,
            size: app.appSize + leftoversSize,
            originPage: 'apps' as const,
            categoryName: t('apps.installedTab'),
            itemType: 'app' as const,
            extraData: { appId: app.id, leftoverPaths: selectedLeftovers, icon: app.icon },
          };
        })
      );
    }
  };

  const toggleLeftoverSelection = (appId: string, path: string) => {
    setSelectedLeftoversMap((prev) => {
      const currentSet = new Set(prev[appId] || []);
      if (currentSet.has(path)) currentSet.delete(path);
      else currentSet.add(path);
      const nextMap = { ...prev, [appId]: currentSet };

      // If app is currently staged, update its staged item
      const stagedKey = `app_${appId}`;
      if (stagedItems[stagedKey]) {
        const target = apps.find((a) => a.id === appId);
        if (target) {
          const leftoverPaths = Array.from(currentSet);
          const leftoverSize = target.leftovers
            .filter((l) => leftoverPaths.includes(l.path))
            .reduce((sum, l) => sum + l.size, 0);
          stageItem({
            id: stagedKey,
            name: target.name,
            path: target.path,
            size: target.appSize + leftoverSize,
            originPage: 'apps',
            categoryName: t('apps.installedTab'),
            itemType: 'app',
            extraData: { appId: target.id, leftoverPaths, icon: target.icon },
          });
        }
      }

      return nextMap;
    });
  };

  const toggleOrphanedItem = (item: OrphanedLeftoverItem) => {
    const stagedKey = `orphaned_${item.id}`;
    if (stagedItems[stagedKey]) {
      unstageItem(stagedKey);
      setSelectedOrphanedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    } else {
      stageItem({
        id: stagedKey,
        name: item.name,
        path: item.path,
        size: item.size,
        originPage: 'apps',
        categoryName: t('apps.orphanedTab'),
        itemType: 'orphaned',
      });
      setSelectedOrphanedIds((prev) => {
        const next = new Set(prev);
        next.add(item.id);
        return next;
      });
    }
  };

  const toggleSelectAllOrphaned = () => {
    const allStaged =
      filteredOrphaned.length > 0 &&
      filteredOrphaned.every((i) => Boolean(stagedItems[`orphaned_${i.id}`]));

    if (allStaged) {
      unstageMultipleItems(filteredOrphaned.map((i) => `orphaned_${i.id}`));
      setSelectedOrphanedIds(new Set());
    } else {
      stageMultipleItems(
        filteredOrphaned.map((item) => ({
          id: `orphaned_${item.id}`,
          name: item.name,
          path: item.path,
          size: item.size,
          originPage: 'apps' as const,
          categoryName: t('apps.orphanedTab'),
          itemType: 'orphaned' as const,
        }))
      );
      setSelectedOrphanedIds(new Set(filteredOrphaned.map((i) => i.id)));
    }
  };



  // Trigger Clean Flow for Orphaned Leftovers
  const handleInitiateCleanOrphaned = () => {
    if (orphanedStats.selectedCount === 0) return;
    setShowOrphanedConfirm(true);
  };

  const handleExecuteCleanOrphaned = async () => {
    if (orphanedStats.selectedCount === 0) return;
    setShowOrphanedConfirm(false);
    setShowOrphanedCleaningFlow(true);
    setIsCleaningOrphaned(true);

    try {
      const paths = orphanedStats.selectedItems.map((i) => i.path);
      const cleaned = await cleanOrphanedLeftovers(paths);
      recordCleanResult(
        orphanedStats.selectedSize,
        cleaned,
        false,
        orphanedStats.selectedItems.map((i) => `Orphaned: ${i.inferredApp}`)
      );
      await runOrphanedScan();
    } catch (err) {
      console.error('Failed to clean orphaned leftovers:', err);
    } finally {
      setIsCleaningOrphaned(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Top Banner & Title */}
      <PageHeader
        icon={viewMode === 'installed' ? <AppWindow size={20} /> : <Ghost size={20} />}
        iconColor={viewMode === 'installed' ? 'text-accent' : 'text-amber-500'}
        title={viewMode === 'installed' ? t('apps.title') : t('apps.orphanedTitle', 'Orphaned App Leftovers')}
        subtitle={
          viewMode === 'installed'
            ? t('apps.subtitle')
            : t('apps.orphanedSubtitle', 'Scan and clean leftover folders, caches, and orphaned files from apps previously uninstalled from macOS.')
        }
        badge={
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              viewMode === 'installed'
                ? 'bg-accent-subtle text-accent'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}
          >
            {viewMode === 'installed'
              ? t('apps.installedCount', '{count} installed', { count: apps.length })
              : t('apps.orphanedBadge', '{count} leftovers found ({size})', {
                  count: orphanedStats.totalCount,
                  size: formatSize(orphanedStats.totalSize),
                })}
          </span>
        }
      />

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl glass-panel w-fit border border-black/5 dark:border-white/5">
        <button
          onClick={() => setViewMode('installed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            viewMode === 'installed'
              ? 'bg-accent text-white shadow-sm'
              : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <AppWindow size={15} />
          <span>{t('apps.installedTab', 'Installed Applications')}</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              viewMode === 'installed'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 dark:bg-neutral-700 text-slate-700 dark:text-neutral-300'
            }`}
          >
            {apps.length}
          </span>
        </button>

        <button
          onClick={() => {
            setViewMode('orphaned');
            if (orphanedItems.length === 0) runOrphanedScan();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            viewMode === 'orphaned'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Ghost size={15} />
          <span>{t('apps.orphanedTab', 'Orphaned App Leftovers')}</span>
          {orphanedStats.totalCount > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                viewMode === 'orphaned'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              }`}
            >
              {orphanedStats.totalCount}
            </span>
          )}
        </button>
      </div>

      {/* VIEW 1: INSTALLED APPLICATIONS */}
      {viewMode === 'installed' && (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3.5!">
              <div className="flex items-center gap-2 text-slate-400 dark:text-neutral-500 text-xs font-medium">
                <AppWindow size={14} className="text-accent" />
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
                <HardDrive size={14} className="text-accent" />
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
                      ? 'bg-white dark:bg-neutral-700 text-accent font-bold shadow-xs'
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
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-black/6 dark:border-white/8 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-accent"
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

              {uninstallableApps.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={toggleSelectAllApps}
                  icon={allUninstallableStaged ? <Square size={13} /> : <CheckSquare size={13} />}
                >
                  {allUninstallableStaged ? t('common.deselectAll') : t('common.selectAll')}
                </Button>
              )}
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
                const currentTotalToFree = app.appSize + totalLeftoversSize;
                const isStaged = Boolean(stagedItems[`app_${app.id}`]);

                return (
                  <Card
                    key={app.id}
                    className={`overflow-hidden transition-all ${
                      isStaged
                        ? 'border-accent/50 bg-accent-subtle'
                        : ''
                    }`}
                  >
                    <CardBody className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        {/* Checkbox + App Icon + Info */}
                        <div className="flex items-center gap-3.5 min-w-0">
                          {app.isSystemApp ? (
                            <div
                              title={t('apps.systemAppLockTooltip')}
                              className="w-4.5 h-4.5 rounded-md border-2 border-slate-300 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 opacity-50 cursor-not-allowed"
                            >
                              <Lock size={11} className="text-slate-400" />
                            </div>
                          ) : (
                            <Checkbox
                              checked={isStaged}
                              onChange={() => handleToggleApp(app)}
                              aria-label={`Select ${app.name}`}
                            />
                          )}

                          {app.icon ? (
                            <img
                              src={app.icon}
                              alt={app.name}
                              className="w-11 h-11 rounded-2xl object-contain drop-shadow-xs shrink-0"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-11 h-11 rounded-2xl bg-accent-subtle border border-accent/20 flex items-center justify-center shrink-0 ${
                              app.icon ? 'hidden' : 'flex'
                            }`}
                          >
                            <AppWindow size={22} className="text-accent" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                {app.name}
                              </h3>
                              {app.isSystemApp && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 border border-black/5 dark:border-white/5">
                                  {t('apps.systemAppBadge')}
                                </span>
                              )}
                              {app.version && (
                                <span className="text-[11px] text-slate-400 font-mono">
                                  v{app.version}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-mono truncate max-w-md mt-0.5">
                              {app.path}
                            </p>
                          </div>
                        </div>

                        {/* Size & Actions */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {formatSize(currentTotalToFree)}
                            </p>
                            {app.leftovers.length > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleExpand(app.id)}
                                className="flex items-center gap-1 text-[11px] text-accent hover:underline cursor-pointer ml-auto mt-0.5"
                              >
                                <span>{t('apps.dataFilesCount', '{count} data files', { count: app.leftovers.length })}</span>
                                {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleReveal(e, app.path)}
                            title={t('common.revealInFinder')}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <ExternalLink size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Expandable Leftovers Section */}
                      {isExpanded && app.leftovers.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                            <span>{t('apps.selectResidual', 'Select residual files to remove:')}</span>
                            <span>{formatSize(totalLeftoversSize)}</span>
                          </div>

                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {app.leftovers.map((item) => {
                              const isChecked = selectedLeftovers.has(item.path);
                              return (
                                <label
                                  key={item.path}
                                  className="flex items-center justify-between p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] cursor-pointer text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Checkbox
                                      checked={isChecked}
                                      onChange={() => toggleLeftoverSelection(app.id, item.path)}
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
        </>
      )}

      {/* VIEW 2: ORPHANED APP LEFTOVERS */}
      {viewMode === 'orphaned' && (
        <div className="space-y-4">
          {/* Orphaned KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-4!">
              <div className="flex items-center gap-2 text-slate-400 dark:text-neutral-500 text-xs font-medium">
                <Ghost size={14} className="text-amber-500" />
                <span>{t('apps.orphanedKpiTotal', 'Total Leftovers')}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {orphanedStats.totalCount}
              </p>
              <span className="text-[10px] text-slate-400">
                {t('apps.orphanedKpiTotalDesc', 'From apps no longer installed on your Mac')}
              </span>
            </Card>

            <Card className="p-4!">
              <div className="flex items-center gap-2 text-slate-400 dark:text-neutral-500 text-xs font-medium">
                <HardDrive size={14} className="text-accent" />
                <span>{t('apps.orphanedKpiReclaimable', 'Reclaimable Storage')}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {formatSize(orphanedStats.totalSize)}
              </p>
              <span className="text-[10px] text-slate-400">
                {t('apps.orphanedKpiReclaimableDesc', 'Application Support, Caches, & Saved State')}
              </span>
            </Card>

            <Card className="p-4!">
              <div className="flex items-center gap-2 text-slate-400 dark:text-neutral-500 text-xs font-medium">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>{t('apps.orphanedKpiSafety', 'macOS System Protection')}</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {t('apps.orphanedKpiSafetyStatus', '100% Safe')}
              </p>
              <span className="text-[10px] text-slate-400">
                {t('apps.orphanedKpiSafetyDesc', 'com.apple.* and core system identifiers strictly whitelisted')}
              </span>
            </Card>
          </div>

          {/* Action Bar & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl glass-panel">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectAllOrphaned}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold text-slate-700 dark:text-neutral-200 transition-colors cursor-pointer"
              >
                <CheckCheck size={13} />
                <span>
                  {selectedOrphanedIds.size === filteredOrphaned.length
                    ? t('common.deselectAll', 'Deselect All')
                    : t('common.selectAll', 'Select All')}
                </span>
              </button>

              <button
                onClick={runOrphanedScan}
                disabled={isLoadingOrphaned}
                title={t('common.refresh', 'Refresh')}
                className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-neutral-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={13} className={isLoadingOrphaned ? 'animate-spin' : ''} />
              </button>

              <span className="text-xs text-slate-400 font-medium">
                {t('apps.orphanedSelected', '{count} selected ({size})', {
                  count: orphanedStats.selectedCount,
                  size: formatSize(orphanedStats.selectedSize),
                })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={orphanedSearchQuery}
                  onChange={(e) => setOrphanedSearchQuery(e.target.value)}
                  placeholder={t('apps.orphanedPlaceholder', 'Search leftovers or folder...')}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-black/6 dark:border-white/8 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <Button
                variant="danger"
                size="sm"
                disabled={orphanedStats.selectedCount === 0 || isCleaningOrphaned}
                onClick={handleInitiateCleanOrphaned}
                className="flex items-center gap-1.5 shrink-0"
              >
                <Trash2 size={13} />
                <span>{t('apps.orphanedCleanBtn', 'Clean Leftovers ({size})', { size: formatSize(orphanedStats.selectedSize) })}</span>
              </Button>
            </div>
          </div>

          {/* Orphaned Items List */}
          {isLoadingOrphaned ? (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : filteredOrphaned.length === 0 ? (
            <div className="p-12 text-center rounded-2xl glass-panel">
              <Sparkles size={36} className="mx-auto text-emerald-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-neutral-300">
                {t('apps.orphanedEmptyTitle', 'System is Clean and Tidy')}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {t('apps.orphanedEmptyDesc', 'No leftover files from uninstalled applications found. Your macOS Library is in prime condition.')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOrphaned.map((item) => {
                const isSelected = Boolean(stagedItems[`orphaned_${item.id}`]);
                return (
                  <Card
                    key={item.id}
                    className={`transition-all ${
                      isSelected
                        ? 'border-amber-500/30 bg-amber-500/[0.02]'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    <CardBody className="p-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleOrphanedItem(item)}
                        />


                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                          <Ghost size={18} className="text-amber-600 dark:text-amber-400" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {item.inferredApp}
                            </h4>
                            <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 border border-black/5 dark:border-white/5 shrink-0">
                              {item.kind}
                            </span>
                          </div>
                          <p
                            className="text-[11px] text-slate-400 font-mono truncate max-w-lg mt-0.5"
                            title={item.path}
                          >
                            {item.path}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {formatSize(item.size)}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {item.lastModified}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleReveal(e, item.path)}
                          title={t('common.revealInFinder')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <ExternalLink size={13} />
                        </button>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Installed App Uninstall Confirmation Modal */}

      {/* Orphaned Leftovers Confirm Modal */}
      <ConfirmModal
        isOpen={showOrphanedConfirm}
        onClose={() => setShowOrphanedConfirm(false)}
        onConfirm={handleExecuteCleanOrphaned}
        isLoading={isCleaningOrphaned}
        actionType="clean"
        title={t('apps.orphanedTab', 'Orphaned App Leftovers')}
        itemsCount={orphanedStats.selectedCount}
        totalBytes={orphanedStats.selectedSize}
        paths={orphanedStats.selectedItems.map((i) => i.path)}
        useTrash={false}
        confirmText={t('apps.orphanedConfirmTitle', 'Permanently Delete {count} Leftover Files ({size})', {
          count: orphanedStats.selectedCount,
          size: formatSize(orphanedStats.selectedSize),
        })}
      />

      {/* Orphaned Leftovers Cleaning Flow Modal */}
      <CleaningFlowModal
        isOpen={showOrphanedCleaningFlow}
        onClose={() => setShowOrphanedCleaningFlow(false)}
        isCleaning={isCleaningOrphaned}
        isDryRun={false}
        mode="clean"
        totalBytes={orphanedStats.selectedSize}
        totalItems={orphanedStats.selectedCount}
        paths={orphanedStats.selectedItems.map((i) => i.path)}
        title={t('apps.orphanedCleaningFlowTitle', 'Cleaning Leftover Application Files...')}
      />
    </div>
  );
}
