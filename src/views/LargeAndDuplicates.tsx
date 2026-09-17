import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { useTranslation } from '../lib/i18n';
import {
  scanFinderItems,
  cleanSelectedItems,
  revealInFinder,
  type FinderScanResult,
  type FileMetadataItem,
} from '../lib/commands';
import { formatSize } from '../lib/utils';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import {
  Copy,
  HardDrive,
  Clock,
  Trash2,
  RefreshCw,
  ExternalLink,
  Layers,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  Package,
  Code2,
} from 'lucide-react';

type FinderTab = 'large' | 'duplicates' | 'old';

export default function LargeAndDuplicates() {
  const { t } = useTranslation();
  const { deleteToTrash, toggleDeleteToTrash, recordCleanResult } = useAppStore();

  const [activeTab, setActiveTab] = useState<FinderTab>('large');
  const [minLargeSizeMb, setMinLargeSizeMb] = useState<number>(100);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<FinderScanResult | null>(null);

  // Selected file IDs for deletion
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  // Confirm modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const loadData = useCallback(async (threshold: number = minLargeSizeMb) => {
    setIsLoading(true);
    try {
      const res = await scanFinderItems(threshold);
      setData(res);
      setSelectedPaths(new Set());
    } catch (err) {
      console.error('Failed to scan finder items:', err);
    } finally {
      setIsLoading(false);
    }
  }, [minLargeSizeMb]);

  useEffect(() => {
    loadData(minLargeSizeMb);
  }, [minLargeSizeMb]);

  // Toggle single path selection
  const togglePath = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Smart duplicate selections
  const handleSelectDuplicates = (strategy: 'keep-newest' | 'keep-oldest' | 'all-copies' | 'none') => {
    if (!data) return;
    const next = new Set<string>();

    if (strategy === 'none') {
      setSelectedPaths(next);
      return;
    }

    data.duplicate_groups.forEach((group) => {
      if (group.items.length <= 1) return;

      if (strategy === 'all-copies') {
        // Keep 1st item, select remaining copies
        for (let i = 1; i < group.items.length; i++) {
          next.add(group.items[i].path);
        }
      } else if (strategy === 'keep-newest') {
        // Sort items by last_modified descending, keep index 0, select rest
        const sorted = [...group.items].sort((a, b) => b.last_modified.localeCompare(a.last_modified));
        for (let i = 1; i < sorted.length; i++) {
          next.add(sorted[i].path);
        }
      } else if (strategy === 'keep-oldest') {
        // Sort items by last_modified ascending, keep index 0, select rest
        const sorted = [...group.items].sort((a, b) => a.last_modified.localeCompare(b.last_modified));
        for (let i = 1; i < sorted.length; i++) {
          next.add(sorted[i].path);
        }
      }
    });

    setSelectedPaths(next);
  };

  // Select all or none in current view
  const handleSelectAllCurrent = () => {
    if (!data) return;
    const currentItems: FileMetadataItem[] =
      activeTab === 'large'
        ? data.large_files
        : activeTab === 'old'
        ? data.old_files
        : data.duplicate_groups.flatMap((g) => g.items.slice(1));

    if (selectedPaths.size >= currentItems.length && currentItems.length > 0) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(currentItems.map((i) => i.path)));
    }
  };

  // Calculate selected total size
  const selectedTotalSize = useMemo(() => {
    if (!data || selectedPaths.size === 0) return 0;
    let total = 0;
    const all = [
      ...data.large_files,
      ...data.old_files,
      ...data.duplicate_groups.flatMap((g) => g.items),
    ];
    const visited = new Set<string>();

    all.forEach((item) => {
      if (selectedPaths.has(item.path) && !visited.has(item.path)) {
        visited.add(item.path);
        total += item.size;
      }
    });
    return total;
  }, [data, selectedPaths]);

  // Execute deletion
  const handleConfirmClean = async () => {
    if (selectedPaths.size === 0) return;
    setIsCleaning(true);
    try {
      const paths = Array.from(selectedPaths);
      const res = await cleanSelectedItems(paths, false, deleteToTrash);
      recordCleanResult(
        res.freedBytes,
        paths.length,
        false,
        [t('largeDuplicates.tab' + (activeTab.charAt(0).toUpperCase() + activeTab.slice(1)))]
      );
      setShowConfirmModal(false);
      // Refresh scan
      loadData(minLargeSizeMb);
    } catch (err) {
      console.error('Failed to clean items:', err);
    } finally {
      setIsCleaning(false);
    }
  };

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case 'image':
        return <ImageIcon size={14} className="text-pink-500" />;
      case 'video':
        return <Film size={14} className="text-purple-500" />;
      case 'audio':
        return <Music size={14} className="text-indigo-500" />;
      case 'document':
        return <FileText size={14} className="text-blue-500" />;
      case 'archive':
        return <Archive size={14} className="text-amber-500" />;
      case 'installer':
        return <Package size={14} className="text-emerald-500" />;
      case 'code':
        return <Code2 size={14} className="text-cyan-500" />;
      default:
        return <FileText size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <Layers size={18} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {t('largeDuplicates.title', 'Large & Duplicate Files')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
            {t('largeDuplicates.subtitle', 'Reclaim gigabytes by hunting down massive files, duplicate copies, and forgotten items.')}
          </p>
        </div>

        {/* Global Action & Deletion Mode Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleDeleteToTrash}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold glass-panel text-slate-700 dark:text-neutral-200 cursor-pointer hover:border-blue-500/40 transition-colors"
          >
            <Trash2 size={13} className={deleteToTrash ? 'text-blue-500' : 'text-rose-500'} />
            <span>
              {t('common.mode')}: {deleteToTrash ? t('common.trashMode') : t('common.directDelete')}
            </span>
          </button>

          <Button
            onClick={() => loadData(minLargeSizeMb)}
            loading={isLoading}
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={13} />}
          >
            {isLoading ? t('common.scanning') : t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* Tabs & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl glass-pill w-fit overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('large')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'large'
                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HardDrive size={13} />
            <span>{t('largeDuplicates.tabLarge', 'Large Files')}</span>
            {data && data.large_files.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-500">
                {data.large_files.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('duplicates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'duplicates'
                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Copy size={13} />
            <span>{t('largeDuplicates.tabDuplicates', 'Duplicates')}</span>
            {data && data.duplicate_groups.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-violet-500/10 text-violet-500">
                {data.duplicate_groups.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('old')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'old'
                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock size={13} />
            <span>{t('largeDuplicates.tabOld', 'Old Files (>6 Mos)')}</span>
            {data && data.old_files.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-500">
                {data.old_files.length}
              </span>
            )}
          </button>
        </div>

        {/* Sub-Filters / Thresholds */}
        <div className="flex items-center gap-2">
          {activeTab === 'large' && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 text-[11px] mr-1">{t('largeDuplicates.threshold', 'Min Size')}:</span>
              {[50, 100, 500, 1024].map((mb) => (
                <button
                  key={mb}
                  type="button"
                  onClick={() => setMinLargeSizeMb(mb)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono cursor-pointer transition-colors ${
                    minLargeSizeMb === mb
                      ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                      : 'bg-black/[0.04] dark:bg-white/[0.06] text-slate-600 dark:text-neutral-400 hover:bg-black/[0.08]'
                  }`}
                >
                  {mb >= 1024 ? `${mb / 1024} GB` : `${mb} MB`}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'duplicates' && (
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleSelectDuplicates('keep-newest')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-black/[0.04] dark:bg-white/[0.06] text-slate-700 dark:text-neutral-300 hover:bg-black/[0.08] cursor-pointer"
              >
                {t('largeDuplicates.keepNewest', 'Keep Newest')}
              </button>
              <button
                type="button"
                onClick={() => handleSelectDuplicates('keep-oldest')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-black/[0.04] dark:bg-white/[0.06] text-slate-700 dark:text-neutral-300 hover:bg-black/[0.08] cursor-pointer"
              >
                {t('largeDuplicates.keepOldest', 'Keep Oldest')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Sticky Action Bar for Selection */}
      <div className="p-3 rounded-2xl glass-panel flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSelectAllCurrent}
          >
            {selectedPaths.size > 0 ? t('common.deselectAll') : t('common.selectAll')}
          </Button>

          <span className="text-slate-500 dark:text-neutral-400">
            <strong>{selectedPaths.size}</strong> {t('common.selected')} (
            <strong className="text-blue-600 dark:text-blue-400">
              {formatSize(selectedTotalSize)}
            </strong>
            )
          </span>
        </div>

        <Button
          variant="danger"
          size="sm"
          disabled={selectedPaths.size === 0}
          onClick={() => setShowConfirmModal(true)}
          icon={<Trash2 size={13} />}
        >
          {deleteToTrash ? t('common.trashMode') : t('common.delete')} ({formatSize(selectedTotalSize)})
        </Button>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-12">
          <CardSkeleton />
        </div>
      ) : activeTab === 'large' ? (
        /* Large Files List */
        <div className="space-y-2">
          {!data || data.large_files.length === 0 ? (
            <div className="py-16 text-center rounded-3xl glass-panel max-w-md mx-auto space-y-2">
              <HardDrive size={32} className="mx-auto text-slate-300 dark:text-neutral-600" />
              <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                {t('largeDuplicates.noLargeFiles', 'No large files found')}
              </p>
              <p className="text-xs text-slate-400">
                {t('largeDuplicates.noLargeFilesDesc', 'No loose files exceed the selected threshold.')}
              </p>
            </div>
          ) : (
            data.large_files.map((file) => {
              const isSelected = selectedPaths.has(file.path);
              return (
                <div
                  key={file.id}
                  onClick={() => togglePath(file.path)}
                  className={`flex items-center justify-between gap-3 p-3 rounded-2xl glass-panel cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500/50 bg-blue-500/[0.04]'
                      : 'hover:border-black/10 dark:hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-blue-600 focus:ring-0 shrink-0 cursor-pointer"
                    />
                    <div className="w-8 h-8 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] flex items-center justify-center shrink-0">
                      {getKindIcon(file.kind)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-neutral-100 truncate">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {file.path}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {formatSize(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        revealInFinder(file.path);
                      }}
                      title={t('common.revealInFinder')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      <ExternalLink size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : activeTab === 'duplicates' ? (
        /* Duplicate Groups */
        <div className="space-y-4">
          {!data || data.duplicate_groups.length === 0 ? (
            <div className="py-16 text-center rounded-3xl glass-panel max-w-md mx-auto space-y-2">
              <Copy size={32} className="mx-auto text-slate-300 dark:text-neutral-600" />
              <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                {t('largeDuplicates.noDuplicates', 'No duplicate files found')}
              </p>
              <p className="text-xs text-slate-400">
                {t('largeDuplicates.noDuplicatesDesc', 'Your examined directories have no duplicate files.')}
              </p>
            </div>
          ) : (
            data.duplicate_groups.map((group, gIdx) => (
              <div
                key={group.id}
                className="p-4 rounded-3xl glass-panel space-y-2.5 border border-black/[0.06] dark:border-white/[0.06]"
              >
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/[0.04] dark:border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                      {t('largeDuplicates.group', 'Duplicate Group #{index}', { index: gIdx + 1 })}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500 font-medium">
                      {group.items.length} {t('largeDuplicates.copies', 'copies')}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-500 dark:text-neutral-400">
                    {t('largeDuplicates.wastedSpace', 'Wasted: {size}', { size: formatSize(group.total_wasted_size) })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  {group.items.map((item, itemIdx) => {
                    const isSelected = selectedPaths.has(item.path);
                    return (
                      <div
                        key={item.id}
                        onClick={() => togglePath(item.path)}
                        className={`flex items-center justify-between gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300'
                            : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02] text-slate-700 dark:text-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-slate-300 text-blue-600 focus:ring-0 shrink-0 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{item.path}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {t('largeDuplicates.modified')}: {item.last_modified} {itemIdx === 0 && `• (${t('largeDuplicates.original', 'Original')})`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-mono font-semibold">
                            {formatSize(item.size)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              revealInFinder(item.path);
                            }}
                            title={t('common.revealInFinder')}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 cursor-pointer"
                          >
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Old Untouched Files */
        <div className="space-y-2">
          {!data || data.old_files.length === 0 ? (
            <div className="py-16 text-center rounded-3xl glass-panel max-w-md mx-auto space-y-2">
              <Clock size={32} className="mx-auto text-slate-300 dark:text-neutral-600" />
              <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                {t('largeDuplicates.noOldFiles', 'No old files found')}
              </p>
              <p className="text-xs text-slate-400">
                {t('largeDuplicates.noOldFilesDesc', 'No files older than 6 months were detected in user folders.')}
              </p>
            </div>
          ) : (
            data.old_files.map((file) => {
              const isSelected = selectedPaths.has(file.path);
              return (
                <div
                  key={file.id}
                  onClick={() => togglePath(file.path)}
                  className={`flex items-center justify-between gap-3 p-3 rounded-2xl glass-panel cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500/50 bg-blue-500/[0.04]'
                      : 'hover:border-black/10 dark:hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-blue-600 focus:ring-0 shrink-0 cursor-pointer"
                    />
                    <div className="w-8 h-8 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] flex items-center justify-center shrink-0">
                      {getKindIcon(file.kind)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-neutral-100 truncate">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {file.path} • {file.days_old} {t('largeDuplicates.daysAgo', 'days untouched')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">
                      {formatSize(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        revealInFinder(file.path);
                      }}
                      title={t('common.revealInFinder')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      <ExternalLink size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title={t('modals.confirmTitle')}
        itemsCount={selectedPaths.size}
        totalBytes={selectedTotalSize}
        useTrash={deleteToTrash}
        paths={Array.from(selectedPaths)}
        onConfirm={handleConfirmClean}
        onClose={() => setShowConfirmModal(false)}
        isLoading={isCleaning}
      />
    </div>
  );
}
