import { useAppStore } from '../store/appStore';
import { useTranslation } from '../lib/i18n';
import {
  scanSystemDirectories,
  scanBrowserCaches,
  cleanSelectedItems,
  revealInFinder,
  listApfsSnapshots,
  deleteAllApfsSnapshots,
  type ApfsSnapshotResult,
} from '../lib/commands';
import type { CleanResult } from '../lib/commands';
import { formatSize } from '../lib/utils';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Checkbox from '../components/ui/Checkbox';
import Button from '../components/ui/Button';
import PageHeader from '../components/layout/PageHeader';
import ConfirmModal from '../components/ui/ConfirmModal';
import CleaningFlowModal from '../components/ui/CleaningFlowModal';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import {
  FolderOpen,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  FileText,
  Globe,
  Search,
  ExternalLink,
  CheckSquare,
  Square,
  Filter,
  Loader2,
  Compass,
  Shield,
  ShieldCheck,
  Flame,
  HardDrive,
  Zap,
} from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';

const categoryIcons: Record<string, React.ReactNode> = {
  system_cache: <FolderOpen size={18} className="text-accent" />,
  user_logs: <FileText size={18} className="text-accent" />,
  browser_cache: <Globe size={18} className="text-accent" />,
  browser_safari: <Compass size={18} className="text-accent" />,
  browser_chrome: <Globe size={18} className="text-accent" />,
  browser_arc: <Globe size={18} className="text-accent" />,
  browser_brave: <Shield size={18} className="text-accent" />,
  browser_firefox: <Flame size={18} className="text-accent" />,
  browser_edge: <Globe size={18} className="text-accent" />,
  trash: <Trash2 size={18} className="text-accent" />,
};

const categorySafetyInfo: Record<string, string> = {
  system_cache: 'Safe to clean: System-level temporary files that macOS regenerates automatically on demand.',
  user_logs: 'Safe to clean: Historical runtime diagnostic logs. Reclaims storage with zero effect on personal documents.',
  browser_cache: 'Safe to clean: Cached web assets, shader caches, and temporary data. Passwords and cookies are preserved.',
  browser_safari: 'Safe to clean: Safari web cache and preview assets. Passwords, bookmarks, and logins are never touched.',
  browser_chrome: 'Safe to clean: Google Chrome shader cache, code cache, and temporary service workers. Logins are preserved.',
  browser_arc: 'Safe to clean: Arc Browser disk caches and temporary rendering data.',
  browser_brave: 'Safe to clean: Brave temporary browser caches and shield caches.',
  browser_firefox: 'Safe to clean: Mozilla Firefox HTTP disk cache and startup cache.',
  browser_edge: 'Safe to clean: Microsoft Edge web disk cache and GPU cache.',
  trash: 'Safe to clean: Files currently sitting in macOS Trash.',
};

type SizeFilter = 'all' | '50mb' | '500mb';

export default function SystemClean() {
  const { t } = useTranslation();
  const {
    systemCategories,
    setSystemCategories,
    isScanning,
    setIsScanning,
    scanningStage,
    scanningPath,
    isCleaning,
    setIsCleaning,
    deleteToTrash,
    toggleCategorySelection,
    toggleItemSelection,
    selectAll,
    getSelectedSize,
    getSelectedItems,
    recordCleanResult,
    globalRefreshTrigger,
  } = useAppStore();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [cleanResult, setCleanResult] = useState<CleanResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCleaningFlow, setShowCleaningFlow] = useState(false);
  const [apfsData, setApfsData] = useState<ApfsSnapshotResult | null>(null);
  const [isDeletingSnapshots, setIsDeletingSnapshots] = useState(false);

  const selectedSize = getSelectedSize('system');
  const selectedItems = getSelectedItems('system');

  const totalItemsCount = systemCategories.reduce((acc, cat) => acc + cat.items.length, 0);
  const allItemsSelected = totalItemsCount > 0 && selectedItems.length === totalItemsCount;

  const toggleExpand = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const loadSnapshots = async () => {
    try {
      const res = await listApfsSnapshots();
      setApfsData(res);
    } catch {}
  };

  const runScan = async () => {
    setIsScanning(true);
    setCleanResult(null);
    try {
      const [sys, browsers, snaps] = await Promise.all([
        scanSystemDirectories(),
        scanBrowserCaches(),
        listApfsSnapshots().catch(() => null),
      ]);
      const results = [...sys, ...browsers];
      setSystemCategories(results);
      if (snaps) setApfsData(snaps);
      setExpandedCategories(new Set(results.filter((c) => c.items.length > 0).map((c) => c.id)));
    } catch (err) {
      console.error('System scan failed:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handlePruneSnapshots = async () => {
    if (!apfsData || apfsData.total_snapshots === 0) return;
    setIsDeletingSnapshots(true);
    try {
      const deletedCount = await deleteAllApfsSnapshots();
      const freedBytes = deletedCount * 1_500_000_000;
      recordCleanResult(freedBytes, deletedCount, false, ['APFS Local Snapshots']);
      await loadSnapshots();
    } catch (e) {
      console.error('Failed to prune snapshots:', e);
    } finally {
      setIsDeletingSnapshots(false);
    }
  };

  const lastRefreshRef = useRef(globalRefreshTrigger);
  useEffect(() => {
    if (systemCategories.length === 0 || lastRefreshRef.current !== globalRefreshTrigger) {
      lastRefreshRef.current = globalRefreshTrigger;
      runScan();
    }
  }, [globalRefreshTrigger, systemCategories.length]);


  const executeClean = async () => {
    if (selectedItems.length === 0) return;
    setShowConfirmModal(false);
    setShowCleaningFlow(true);
    setIsCleaning(true);
    try {
      const result = await cleanSelectedItems(
        selectedItems.map((item) => item.path),
        false,
        deleteToTrash
      );
      setCleanResult(result);
      recordCleanResult(result.freedBytes, selectedItems.length, false, ['System Clean']);
      await runScan();
    } catch (err) {
      console.error('Clean failed:', err);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleReveal = async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    try {
      await revealInFinder(path);
    } catch (err) {
      console.error('Failed to reveal in Finder:', err);
    }
  };

  // Filtered categories based on search query and size filter
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const minBytes = sizeFilter === '500mb' ? 500 * 1024 * 1024 : sizeFilter === '50mb' ? 50 * 1024 * 1024 : 0;

    return systemCategories
      .map((cat) => {
        const filteredItems = cat.items.filter((item) => {
          const matchesQuery = !q || item.name.toLowerCase().includes(q) || item.path.toLowerCase().includes(q);
          const matchesSize = item.size >= minBytes;
          return matchesQuery && matchesSize;
        });
        return {
          ...cat,
          items: filteredItems,
          size: filteredItems.reduce((sum, item) => sum + item.size, 0),
        };
      })
      .filter((cat) => cat.items.length > 0);
  }, [systemCategories, searchQuery, sizeFilter]);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <PageHeader
        icon={<Sparkles size={20} />}
        iconColor="text-accent"
        title={t('systemClean.title')}
        subtitle={t('systemClean.subtitle')}
        badge={
          totalItemsCount > 0 ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent-subtle text-accent">
              {t('systemClean.itemsCount', '{count} items', { count: totalItemsCount })}
            </span>
          ) : undefined
        }
      />

      {/* Actions & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('systemClean.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-neutral-800 border border-black/6 dark:border-white/8 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent text-slate-800 dark:text-neutral-200"
          />
        </div>
        <div className="flex items-center gap-2">
          {totalItemsCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => selectAll('system', !allItemsSelected)}
              icon={allItemsSelected ? <Square size={13} /> : <CheckSquare size={13} />}
            >
              {allItemsSelected ? t('common.deselectAll') : t('common.selectAll')}
            </Button>
          )}
        </div>
      </div>

      {/* Filter Pills Bar */}
      {systemCategories.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 dark:text-neutral-500 flex items-center gap-1 font-medium">
            <Filter size={12} /> {t('common.filter')}:
          </span>
          {(['all', '50mb', '500mb'] as SizeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setSizeFilter(f)}
              className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                sizeFilter === f
                  ? 'bg-accent text-white shadow-xs'
                  : 'bg-black/4 dark:bg-white/6 text-slate-600 dark:text-neutral-400 hover:bg-black/7 dark:hover:bg-white/10'
              }`}
            >
              {f === 'all'
                ? t('systemClean.filterAll')
                : f === '50mb'
                ? t('systemClean.filter50mb')
                : t('systemClean.filter500mb')}
            </button>
          ))}
        </div>
      )}

      {/* APFS Local Snapshots & Purgeable Space Reclaim */}
      {!isScanning && apfsData && apfsData.total_snapshots > 0 && (
        <div className="p-4 rounded-3xl border border-amber-500/30 bg-amber-500/[0.04] backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    APFS Time Machine Local Snapshots
                  </h4>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    {apfsData.total_snapshots} snapshots (~{formatSize(apfsData.snapshots.reduce((acc, s) => acc + s.estimated_size, 0))})
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Snapshot lokal mengunci kapasitas drive sebagai &quot;System Data&quot; / &quot;Purgeable Space&quot;. Aman dipangkas jika Anda memiliki cadangan eksternal.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePruneSnapshots}
              disabled={isDeletingSnapshots}
              className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            >
              <Zap size={13} className={isDeletingSnapshots ? 'animate-spin' : ''} />
              {isDeletingSnapshots ? 'Pruning...' : 'Prune Snapshots'}
            </Button>
          </div>
        </div>
      )}

      {/* Category list */}
      {isScanning ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-accent/5 border border-accent/20 flex items-center gap-3.5 backdrop-blur-md">
            <Loader2 className="w-5 h-5 text-accent animate-spin shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-accent uppercase tracking-wider">
                {scanningStage || 'Scanning System Directories...'}
              </div>
              {scanningPath && (
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">
                  {scanningPath}
                </div>
              )}
            </div>
          </div>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCategories.map((category, idx) => {
            const isExpanded = expandedCategories.has(category.id);
            const someSelected = category.items.some((i) => i.selected);
            const allSelected = category.items.length > 0 && category.items.every((i) => i.selected);

            return (
              <Card key={category.id} className="stagger-item" style={{ animationDelay: `${idx * 0.05}s` }}>
                <CardHeader className="py-3!">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onChange={() => toggleCategorySelection('system', category.id)}
                    />
                    <button
                      onClick={() => toggleExpand(category.id)}
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                    >
                      <div className="p-2 rounded-xl bg-black/3 dark:bg-white/5">
                        {categoryIcons[category.id] || <FolderOpen size={18} className="text-slate-400" />}
                      </div>
                      <div className="text-left flex-1">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {category.name}
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-neutral-400">
                          {category.items.length} items
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-600 dark:text-neutral-300 mr-2">
                        {formatSize(category.size)}
                      </span>
                      {isExpanded ? (
                        <ChevronDown size={15} className="text-slate-400" />
                      ) : (
                        <ChevronRight size={15} className="text-slate-400" />
                      )}
                    </button>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardBody className="py-2!">
                    {categorySafetyInfo[category.id] && (
                      <div className="flex items-center gap-2 p-2.5 mb-2 rounded-xl bg-accent-subtle border border-accent/20 text-[11px] text-slate-800 dark:text-neutral-200">
                        <ShieldCheck size={14} className="text-accent shrink-0" />
                        <span>{categorySafetyInfo[category.id]}</span>
                      </div>
                    )}
                    <div className="divide-y divide-black/4 dark:divide-white/6">
                      {category.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 py-2.5 hover:bg-black/2 dark:hover:bg-white/3 -mx-2 px-2 rounded-xl transition-colors group"
                        >
                          <Checkbox
                            checked={item.selected}
                            onChange={() =>
                              toggleItemSelection('system', category.id, item.id)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-neutral-200 truncate">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-neutral-500 truncate">
                              {item.path}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-bold text-slate-600 dark:text-neutral-300">
                              {formatSize(item.size)}
                            </span>
                            <button
                              onClick={(e) => handleReveal(e, item.path)}
                              title={t('common.revealInFinder', 'Reveal in Finder')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-accent hover:bg-black/4 dark:hover:bg-white/6 opacity-60 group-hover:opacity-100 transition-all"
                            >
                              <ExternalLink size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                )}
              </Card>
            );
          })}

          {filteredCategories.length === 0 && !isScanning && (
            <div className="p-12 text-center rounded-2xl glass-panel">
              <Sparkles size={36} className="text-slate-300 dark:text-neutral-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                {searchQuery || sizeFilter !== 'all'
                  ? t('systemClean.emptySearch')
                  : t('systemClean.emptyClean')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={executeClean}
        isLoading={isCleaning}
        title={t('systemClean.title')}
        itemsCount={selectedItems.length}
        totalBytes={selectedSize}
        paths={selectedItems.map((i) => i.path)}
        useTrash={deleteToTrash}
      />

      {/* Interactive Progress Flow Modal */}
      <CleaningFlowModal
        isOpen={showCleaningFlow}
        onClose={() => setShowCleaningFlow(false)}
        isCleaning={isCleaning}
        isDryRun={false}
        totalBytes={cleanResult?.freedBytes || selectedSize}
        totalItems={cleanResult?.cleaned || selectedItems.length}
        paths={selectedItems.map((i) => i.path)}
        title={t('systemClean.title')}
      />
    </div>
  );
}
