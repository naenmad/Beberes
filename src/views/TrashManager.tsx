import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { useTranslation } from '../lib/i18n';
import {
  scanTrashContents,
  emptyMacTrash,
  deleteSpecificTrashItems,
  openFullDiskAccessSettings,
  revealInFinder,
  type TrashScanResult,
} from '../lib/commands';
import { playTrashWhoosh } from '../lib/sound';
import { formatSize } from '../lib/utils';
import Button from '../components/ui/Button';
import Checkbox from '../components/ui/Checkbox';
import FloatingActionBar from '../components/ui/FloatingActionBar';
import PageHeader from '../components/layout/PageHeader';
import ConfirmModal from '../components/ui/ConfirmModal';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import {
  Trash2,
  Trash,
  ExternalLink,
  FolderCheck,
  AppWindow,
  Film,
  Image as ImageIcon,
  FileText,
  Archive,
  Package,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

export default function TrashManager() {
  const { t } = useTranslation();
  const { recordCleanResult, globalRefreshTrigger } = useAppStore();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<TrashScanResult | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  // Modals
  const [showEmptyModal, setShowEmptyModal] = useState(false);
  const [showDeleteSelectedModal, setShowDeleteSelectedModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await scanTrashContents();
      setData(res);
      setSelectedPaths(new Set());
    } catch (err) {
      console.error('Failed to scan trash:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, globalRefreshTrigger]);

  // Toggle path
  const togglePath = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!data) return;
    if (selectedPaths.size === data.items.length) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(data.items.map((i) => i.path)));
    }
  };

  // Calculate selected total size
  const selectedTotalSize = useMemo(() => {
    if (!data || selectedPaths.size === 0) return 0;
    return data.items
      .filter((i) => selectedPaths.has(i.path))
      .reduce((sum, i) => sum + i.size, 0);
  }, [data, selectedPaths]);

  // Execute empty whole trash
  const handleConfirmEmptyTrash = async () => {
    if (!data) return;
    setIsProcessing(true);
    try {
      const freed = await emptyMacTrash();
      playTrashWhoosh();
      recordCleanResult(
        freed > 0 ? freed : data.total_size,
        data.total_items,
        false,
        [t('trashManager.title', 'Trash Manager')]
      );
      setShowEmptyModal(false);
      loadData();
    } catch (err) {
      console.error('Failed to empty trash:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute delete selected items
  const handleConfirmDeleteSelected = async () => {
    if (selectedPaths.size === 0) return;
    setIsProcessing(true);
    try {
      const paths = Array.from(selectedPaths);
      const freed = await deleteSpecificTrashItems(paths);
      playTrashWhoosh();
      recordCleanResult(
        freed,
        paths.length,
        false,
        [t('trashManager.title', 'Trash Manager')]
      );
      setShowDeleteSelectedModal(false);
      loadData();
    } catch (err) {
      console.error('Failed to delete trash items:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const getItemIcon = (kind: string) => {
    switch (kind) {
      case 'app':
        return <AppWindow size={15} className="text-cyan-500" />;
      case 'image':
        return <ImageIcon size={15} className="text-pink-500" />;
      case 'video':
        return <Film size={15} className="text-purple-500" />;
      case 'archive':
        return <Archive size={15} className="text-amber-500" />;
      case 'installer':
        return <Package size={15} className="text-emerald-500" />;
      default:
        return <FileText size={15} className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <PageHeader
        icon={<Trash2 size={20} />}
        iconColor="text-rose-500"
        title={t('trashManager.title', 'Trash Manager')}
        subtitle={t('trashManager.subtitle', 'Inspect your macOS Trash bin, reclaim storage, or safely empty all contents.')}
        actions={
          <Button
            variant="danger"
            size="sm"
            disabled={!data || data.total_items === 0}
            onClick={() => setShowEmptyModal(true)}
            icon={<Trash size={13} />}
          >
            {t('trashManager.emptyAll', 'Empty Trash')}
          </Button>
        }
      />

      {/* Storage & Statistics Card */}
      {data && (
        <div className="p-4 rounded-3xl glass-panel grid grid-cols-1 sm:grid-cols-3 gap-4 border border-black/6 dark:border-white/6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
              <Trash2 size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                {t('trashManager.trashSize', 'Trash Size')}
              </span>
              <p className="text-lg font-bold text-slate-800 dark:text-neutral-100">
                {formatSize(data.total_size)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <Package size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                {t('trashManager.totalItems', 'Total Items')}
              </span>
              <p className="text-lg font-bold text-slate-800 dark:text-neutral-100">
                {data.total_items}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                {t('trashManager.status', 'Status')}
              </span>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {data.total_items === 0
                  ? t('trashManager.clean', 'Clean & Empty')
                  : t('trashManager.readyToReclaim', 'Ready to Reclaim')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action bar for selection */}
      {data && data.total_items > 0 && (
        <div className="flex items-center justify-between gap-3 text-xs">
          <Button variant="secondary" size="sm" onClick={handleSelectAll}>
            {selectedPaths.size === data.items.length
              ? t('common.deselectAll')
              : t('common.selectAll')}
          </Button>
          <span className="text-slate-500 dark:text-neutral-400">
            {data.total_items} items ({formatSize(data.total_size)})
          </span>
        </div>
      )}

      {/* List of items or Empty / Permission State */}
      {isLoading ? (
        <div className="py-12">
          <CardSkeleton />
        </div>
      ) : data?.permission_denied ? (
        <div className="py-10 px-6 text-center rounded-3xl glass-panel max-w-xl mx-auto space-y-4 border border-amber-500/20 bg-amber-500/5">
          <div className="w-14 h-14 rounded-3xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert size={30} />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-800 dark:text-neutral-100">
              {t('trashManager.fdaRequired', 'Full Disk Access Required')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
              {t(
                'trashManager.fdaDesc',
                'macOS protects the Trash folder from direct scanning. Grant Full Disk Access to Beberes in System Settings to inspect individual files, or click Empty Trash below to safely clear it via Finder.'
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="sm"
              icon={<ExternalLink size={13} />}
              onClick={() => openFullDiskAccessSettings()}
            >
              {t('trashManager.openSettings', 'Open System Settings')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash size={13} />}
              onClick={() => setShowEmptyModal(true)}
            >
              {t('trashManager.emptyAll', 'Empty Trash via Finder')}
            </Button>
          </div>
        </div>
      ) : !data || data.total_items === 0 ? (
        <div className="py-16 text-center rounded-3xl glass-panel max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <FolderCheck size={32} />
          </div>
          <h2 className="text-base font-bold text-slate-800 dark:text-neutral-100">
            {t('trashManager.emptyTitle', 'macOS Trash is completely empty!')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('trashManager.emptyDesc', 'No items are currently lingering in your Trash folder.')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.items.map((item) => {
            const isSelected = selectedPaths.has(item.path);
            return (
              <div
                key={item.id}
                onClick={() => togglePath(item.path)}
                className={`flex items-center justify-between gap-3 p-3 rounded-2xl glass-panel cursor-pointer transition-all ${
                  isSelected
                    ? 'border-rose-500/50 bg-rose-500/3'
                    : 'hover:border-black/10 dark:hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => togglePath(item.path)}
                  />
                  <div className="w-8 h-8 rounded-xl bg-black/3 dark:bg-white/5 flex items-center justify-center shrink-0">
                    {getItemIcon(item.kind)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-neutral-100 truncate">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {item.path} • {t('trashManager.date')}: {item.date_deleted}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono font-semibold text-slate-700 dark:text-neutral-200">
                    {formatSize(item.size)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      revealInFinder(item.path);
                    }}
                    title={t('common.revealInFinder')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-black/4 dark:hover:bg-white/6 transition-colors cursor-pointer"
                  >
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedPaths.size}
        selectedSize={selectedTotalSize}
        onClean={() => setShowDeleteSelectedModal(true)}
        onDeselect={() => setSelectedPaths(new Set())}
        cleanLabel={`${t('trashManager.deleteSelected', 'Delete Permanently')} (${formatSize(selectedTotalSize)})`}
        actionVariant="danger"
        showModeBadge={false}
      />

      {/* Empty Entire Trash Modal */}
      <ConfirmModal
        isOpen={showEmptyModal}
        title={t('trashManager.emptyConfirmTitle', 'Empty macOS Trash?')}
        itemsCount={data?.total_items || 0}
        totalBytes={data?.total_size || 0}
        useTrash={false}
        paths={data?.items.map((i) => i.path) || []}
        onConfirm={handleConfirmEmptyTrash}
        onClose={() => setShowEmptyModal(false)}
        isLoading={isProcessing}
      />

      {/* Delete Selected Items Modal */}
      <ConfirmModal
        isOpen={showDeleteSelectedModal}
        title={t('trashManager.deleteSelectedTitle', 'Delete Selected Items?')}
        itemsCount={selectedPaths.size}
        totalBytes={selectedTotalSize}
        useTrash={false}
        paths={Array.from(selectedPaths)}
        onConfirm={handleConfirmDeleteSelected}
        onClose={() => setShowDeleteSelectedModal(false)}
        isLoading={isProcessing}
      />
    </div>
  );
}
