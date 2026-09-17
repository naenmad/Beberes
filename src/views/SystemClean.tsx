import { useAppStore } from '../store/appStore';
import { useTranslation } from '../lib/i18n';
import { scanSystemDirectories, cleanSelectedItems, revealInFinder } from '../lib/commands';
import type { CleanResult } from '../lib/commands';
import { formatSize } from '../lib/utils';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Checkbox from '../components/ui/Checkbox';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import CleaningFlowModal from '../components/ui/CleaningFlowModal';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import {
  FolderOpen,
  Trash2,
  RefreshCw,
  AlertTriangle,
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
} from 'lucide-react';
import { useState, useMemo } from 'react';

const categoryIcons: Record<string, React.ReactNode> = {
  system_cache: <FolderOpen size={18} className="text-blue-500" />,
  user_logs: <FileText size={18} className="text-amber-500" />,
  browser_cache: <Globe size={18} className="text-emerald-500" />,
  trash: <Trash2 size={18} className="text-rose-500" />,
};

type SizeFilter = 'all' | '50mb' | '500mb';

export default function SystemClean() {
  const { t } = useTranslation();
  const {
    systemCategories,
    setSystemCategories,
    isScanning,
    setIsScanning,
    isCleaning,
    setIsCleaning,
    deleteToTrash,
    toggleDeleteToTrash,
    toggleCategorySelection,
    toggleItemSelection,
    selectAll,
    getSelectedSize,
    getSelectedItems,
    recordCleanResult,
  } = useAppStore();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [cleanResult, setCleanResult] = useState<CleanResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCleaningFlow, setShowCleaningFlow] = useState(false);

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

  const runScan = async () => {
    setIsScanning(true);
    setCleanResult(null);
    try {
      const results = await scanSystemDirectories();
      setSystemCategories(results);
      setExpandedCategories(new Set(results.filter((c) => c.items.length > 0).map((c) => c.id)));
    } catch (err) {
      console.error('System scan failed:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCleanClick = () => {
    if (selectedItems.length === 0) return;
    setShowConfirmModal(true);
  };

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
      {/* Actions & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('systemClean.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-neutral-800 border border-black/[0.06] dark:border-white/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-neutral-200"
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
          <Button
            onClick={runScan}
            loading={isScanning}
            icon={<RefreshCw size={14} />}
            variant="secondary"
            size="sm"
          >
            {isScanning ? t('common.scanning') : t('systemClean.scanButton')}
          </Button>
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
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-black/[0.04] dark:bg-white/[0.06] text-slate-600 dark:text-neutral-400 hover:bg-black/[0.07] dark:hover:bg-white/[0.1]'
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

      {/* Category list */}
      {isScanning ? (
        <div className="space-y-4">
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
                <CardHeader className="!py-3">
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
                      <div className="p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.05]">
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
                  <CardBody className="!py-2">
                    <div className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                      {category.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] -mx-2 px-2 rounded-xl transition-colors group"
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
                              title="Reveal in Finder"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] opacity-60 group-hover:opacity-100 transition-all"
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

      {/* Sticky Clean Bar */}
      {selectedItems.length > 0 && (
        <div className="sticky bottom-0 -mx-8 px-8 py-3.5 glass-panel border-t border-black/[0.06] dark:border-white/[0.08] shadow-lg">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-neutral-200">
                <AlertTriangle size={15} className="text-amber-500" />
                <span>
                  {selectedItems.length} {t('common.selected')} ({formatSize(selectedSize)})
                </span>
              </div>

              <button
                type="button"
                onClick={toggleDeleteToTrash}
                title="Click to toggle between macOS Trash and Direct Permanent Delete"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                  deleteToTrash
                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400'
                    : 'bg-rose-500/10 text-rose-600 border-rose-500/30 dark:text-rose-400'
                }`}
              >
                <Trash2 size={11} />
                <span>{t('common.mode')}: {deleteToTrash ? t('common.trashMode') : t('common.directDelete')}</span>
              </button>
            </div>

            <Button
              onClick={handleCleanClick}
              loading={isCleaning}
              variant={deleteToTrash ? 'primary' : 'danger'}
              size="sm"
              icon={<Trash2 size={14} />}
            >
              {deleteToTrash
                ? `${t('systemClean.cleanToTrash')} (${formatSize(selectedSize)})`
                : `${t('systemClean.cleanSelected')} (${formatSize(selectedSize)})`}
            </Button>
          </div>
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
