import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { useTranslation } from '../lib/i18n';
import {
  scanFinderItems,
  cleanSelectedItems,
  revealInFinder,
  quickLookPreview,
  type FinderScanResult,
  type FileMetadataItem,
} from '../lib/commands';
import { formatSize } from '../lib/utils';
import Button from '../components/ui/Button';
import PageHeader from '../components/layout/PageHeader';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import Checkbox from '../components/ui/Checkbox';
import ConfirmModal from '../components/ui/ConfirmModal';
import VirtualList from '../components/ui/VirtualList';
import ContextMenu, { type ContextMenuItem } from '../components/ui/ContextMenu';
import {
  Copy,
  HardDrive,
  Clock,
  ExternalLink,
  Eye,
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
  const {
    deleteToTrash,
    recordCleanResult,
    globalRefreshTrigger,
    stagedItems,
    stageItem,
    unstageItem,
    stageMultipleItems,
    unstageMultipleItems,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<FinderTab>('large');
  const [minLargeSizeMb, setMinLargeSizeMb] = useState<number>(100);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<FinderScanResult | null>(null);

  // Selected file IDs for deletion
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [focusedPath, setFocusedPath] = useState<string | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    isOpen: boolean;
    file: FileMetadataItem | null;
  }>({ x: 0, y: 0, isOpen: false, file: null });

  const handleContextMenu = (e: React.MouseEvent, file: FileMetadataItem) => {
    e.preventDefault();
    e.stopPropagation();
    setFocusedPath(file.path);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      isOpen: true,
      file,
    });
  };

  // Native macOS Quick Look Spacebar handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && focusedPath && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        quickLookPreview(focusedPath);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedPath]);

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
  }, [minLargeSizeMb, globalRefreshTrigger, loadData]);


  // Toggle single path selection
  const togglePath = (path: string, itemObj?: { name: string; size: number }) => {
    const key = `large_${path}`;
    if (stagedItems[key]) {
      unstageItem(key);
      setSelectedPaths((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    } else {
      let name = itemObj?.name || path.split('/').pop() || path;
      let size = itemObj?.size || 0;
      if (!itemObj && data) {
        const all = [
          ...data.large_files,
          ...data.old_files,
          ...data.duplicate_groups.flatMap((g) => g.items),
        ];
        const found = all.find((f) => f.path === path);
        if (found) {
          name = found.name;
          size = found.size;
        }
      }
      stageItem({
        id: key,
        name,
        path,
        size,
        originPage: 'large-duplicates',
        categoryName: t('largeDuplicates.title'),
        itemType: 'file',
      });
      setSelectedPaths((prev) => {
        const next = new Set(prev);
        next.add(path);
        return next;
      });
    }
  };

  // Context menu items definition
  const contextMenuItems = useMemo<ContextMenuItem[]>(() => {
    if (!contextMenu.file) return [];
    const file = contextMenu.file;
    const isSelected = selectedPaths.has(file.path);
    const key = `large_${file.path}`;
    const isStaged = !!stagedItems[key];

    return [
      {
        id: 'quicklook',
        label: 'Quick Look',
        icon: <Eye size={14} />,
        shortcut: 'Space',
        onClick: () => quickLookPreview(file.path),
      },
      {
        id: 'reveal',
        label: t('common.revealInFinder', 'Reveal in Finder'),
        icon: <ExternalLink size={14} />,
        onClick: () => revealInFinder(file.path),
      },
      {
        id: 'copy-path',
        label: 'Copy Path',
        icon: <Copy size={14} />,
        shortcut: '⌥⌘C',
        onClick: () => navigator.clipboard.writeText(file.path),
        separatorAfter: true,
      },
      {
        id: 'stage',
        label: isStaged ? 'Unstage from Clean List' : 'Stage for Deletion',
        icon: <Layers size={14} />,
        onClick: () => togglePath(file.path, { name: file.name, size: file.size }),
      },
      {
        id: 'toggle-select',
        label: isSelected ? 'Deselect Item' : 'Select Item',
        icon: <HardDrive size={14} />,
        onClick: () => togglePath(file.path, { name: file.name, size: file.size }),
        danger: isSelected,
      },
    ];
  }, [contextMenu.file, selectedPaths, stagedItems, t]);

  // Smart duplicate selections
  const handleSelectDuplicates = (strategy: 'keep-newest' | 'keep-oldest' | 'all-copies' | 'none') => {
    if (!data) return;
    const allDupPaths = data.duplicate_groups.flatMap((g) => g.items.map((i) => i.path));
    unstageMultipleItems(allDupPaths.map((p) => `large_${p}`));

    if (strategy === 'none') {
      setSelectedPaths(new Set());
      return;
    }

    const itemsToStage: FileMetadataItem[] = [];
    data.duplicate_groups.forEach((group) => {
      if (group.items.length <= 1) return;

      if (strategy === 'all-copies') {
        for (let i = 1; i < group.items.length; i++) {
          itemsToStage.push(group.items[i]);
        }
      } else if (strategy === 'keep-newest') {
        const sorted = [...group.items].sort((a, b) => b.last_modified.localeCompare(a.last_modified));
        for (let i = 1; i < sorted.length; i++) {
          itemsToStage.push(sorted[i]);
        }
      } else if (strategy === 'keep-oldest') {
        const sorted = [...group.items].sort((a, b) => a.last_modified.localeCompare(b.last_modified));
        for (let i = 1; i < sorted.length; i++) {
          itemsToStage.push(sorted[i]);
        }
      }
    });

    stageMultipleItems(
      itemsToStage.map((i) => ({
        id: `large_${i.path}`,
        name: i.name,
        path: i.path,
        size: i.size,
        originPage: 'large-duplicates' as const,
        categoryName: t('largeDuplicates.title'),
        itemType: 'file' as const,
      }))
    );
    setSelectedPaths(new Set(itemsToStage.map((i) => i.path)));
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

    const allStaged =
      currentItems.length > 0 &&
      currentItems.every((i) => Boolean(stagedItems[`large_${i.path}`]));

    if (allStaged) {
      unstageMultipleItems(currentItems.map((i) => `large_${i.path}`));
      setSelectedPaths(new Set());
    } else {
      stageMultipleItems(
        currentItems.map((i) => ({
          id: `large_${i.path}`,
          name: i.name,
          path: i.path,
          size: i.size,
          originPage: 'large-duplicates' as const,
          categoryName: t('largeDuplicates.title'),
          itemType: 'file' as const,
        }))
      );
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

  // Check if selected items contain critical files (> 5 GB or modified within last 24h)
  const hasSelectedCritical = useMemo(() => {
    if (!data || selectedPaths.size === 0) return false;
    const all = [
      ...data.large_files,
      ...data.old_files,
      ...data.duplicate_groups.flatMap((g) => g.items),
    ];
    const DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();

    return all.some((item) => {
      if (!selectedPaths.has(item.path)) return false;
      const isHuge = item.size >= 5 * 1024 * 1024 * 1024;
      const isRecent =
        item.days_old !== undefined
          ? item.days_old <= 1
          : item.last_modified
          ? now - new Date(item.last_modified).getTime() <= DAY_MS
          : false;
      return isHuge || isRecent;
    });
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
        return <ImageIcon size={14} className="text-accent" />;
      case 'video':
        return <Film size={14} className="text-accent" />;
      case 'audio':
        return <Music size={14} className="text-accent" />;
      case 'document':
        return <FileText size={14} className="text-accent" />;
      case 'archive':
        return <Archive size={14} className="text-accent" />;
      case 'installer':
        return <Package size={14} className="text-accent" />;
      case 'code':
        return <Code2 size={14} className="text-accent" />;
      default:
        return <FileText size={14} className="text-accent" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <PageHeader
        icon={<Layers size={20} />}
        iconColor="text-accent"
        title={t('largeDuplicates.title', 'Large & Duplicate Files')}
        subtitle={t('largeDuplicates.subtitle', 'Reclaim gigabytes by hunting down massive files, duplicate copies, and forgotten items.')}
      />

      {/* Tabs & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl glass-pill w-fit overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('large')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'large'
                ? 'bg-white dark:bg-neutral-700 text-accent shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HardDrive size={13} />
            <span>{t('largeDuplicates.tabLarge', 'Large Files')}</span>
            {data && data.large_files.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-accent-subtle text-accent">
                {data.large_files.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('duplicates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'duplicates'
                ? 'bg-white dark:bg-neutral-700 text-accent shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Copy size={13} />
            <span>{t('largeDuplicates.tabDuplicates', 'Duplicates')}</span>
            {data && data.duplicate_groups.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-accent-subtle text-accent border border-accent/20">
                {data.duplicate_groups.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('old')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'old'
                ? 'bg-white dark:bg-neutral-700 text-accent shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock size={13} />
            <span>{t('largeDuplicates.tabOld', 'Old Files (>6 Mos)')}</span>
            {data && data.old_files.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-accent-subtle text-accent border border-accent/20">
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
                      ? 'bg-accent text-white shadow-2xs font-semibold'
                      : 'bg-black/4 dark:bg-white/6 text-slate-600 dark:text-neutral-400 hover:bg-black/8'
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
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-black/4 dark:bg-white/6 text-slate-700 dark:text-neutral-300 hover:bg-black/8 cursor-pointer"
              >
                {t('largeDuplicates.keepNewest', 'Keep Newest')}
              </button>
              <button
                type="button"
                onClick={() => handleSelectDuplicates('keep-oldest')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-black/4 dark:bg-white/6 text-slate-700 dark:text-neutral-300 hover:bg-black/8 cursor-pointer"
              >
                {t('largeDuplicates.keepOldest', 'Keep Oldest')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Selection Subheader */}
      {selectedPaths.size > 0 && (
        <div className="flex items-center justify-between gap-3 text-xs">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSelectAllCurrent}
          >
            {selectedPaths.size > 0 ? t('common.deselectAll') : t('common.selectAll')}
          </Button>

          <span className="text-slate-500 dark:text-neutral-400">
            <strong>{selectedPaths.size}</strong> {t('common.selected')} ({formatSize(selectedTotalSize)})
          </span>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-12">
          <CardSkeleton />
        </div>
      ) : activeTab === 'large' ? (
        /* Large Files List */
        <div className="space-y-2">
          {!data || data.large_files.length === 0 ? (
            <div className="rounded-2xl glass-panel overflow-hidden py-16 text-center w-full space-y-2">
              <HardDrive size={32} className="mx-auto text-slate-300 dark:text-neutral-600" />
              <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                {t('largeDuplicates.noLargeFiles', 'No large files found')}
              </p>
              <p className="text-xs text-slate-400">
                {t('largeDuplicates.noLargeFilesDesc', 'No loose files exceed the selected threshold.')}
              </p>
            </div>
          ) : (
            <VirtualList
              items={data.large_files}
              itemHeight={68}
              renderItem={(file) => {
                const isSelected = selectedPaths.has(file.path);
                return (
                  <div
                    key={file.id}
                    onClick={() => togglePath(file.path)}
                    onMouseEnter={() => setFocusedPath(file.path)}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                    className={`flex items-center justify-between gap-3 p-3 mb-2 rounded-2xl glass-panel cursor-pointer transition-all ${
                      isSelected
                        ? 'border-accent/50 bg-accent-subtle/30'
                        : 'hover:border-black/10 dark:hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => togglePath(file.path)}
                      />
                      <div className="w-8 h-8 rounded-xl bg-black/3 dark:bg-white/5 flex items-center justify-center shrink-0">
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

                    <div className="flex items-center gap-2 shrink-0">
                      {file.size >= 5 * 1024 * 1024 * 1024 && (
                        <span className="hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {t('safety.criticalBadge', 'Critical (> 5 GB)')}
                        </span>
                      )}
                      {(file.days_old !== undefined
                        ? file.days_old <= 1
                        : file.last_modified
                        ? Date.now() - new Date(file.last_modified).getTime() <= 24 * 60 * 60 * 1000
                        : false) && (
                        <span className="hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent-subtle text-accent border border-accent/20">
                          {t('safety.recentBadge', 'Recent (< 24h)')}
                        </span>
                      )}
                      <span className="text-xs font-mono font-semibold text-accent">
                        {formatSize(file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          quickLookPreview(file.path);
                        }}
                        title="Quick Look (Space)"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          revealInFinder(file.path);
                        }}
                        title={t('common.revealInFinder')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-black/4 dark:hover:bg-white/6 transition-colors cursor-pointer"
                      >
                        <ExternalLink size={13} />
                      </button>
                    </div>
                  </div>
                );
              }}
            />
          )}
        </div>
      ) : activeTab === 'duplicates' ? (
        /* Duplicate File Groups */
        <div className="space-y-4">
          {!data || data.duplicate_groups.length === 0 ? (
            <div className="rounded-2xl glass-panel overflow-hidden py-16 text-center w-full space-y-2">
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
                className="p-4 rounded-3xl glass-panel space-y-2.5 border border-black/6 dark:border-white/6"
              >
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/4 dark:border-white/4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                      {t('largeDuplicates.group', 'Duplicate Group #{index}', { index: gIdx + 1 })}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-subtle text-accent border border-accent/20 font-medium">
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
                        onContextMenu={(e) => handleContextMenu(e, item)}
                        className={`flex items-center justify-between gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-accent-subtle text-accent font-medium'
                            : 'hover:bg-black/2 dark:hover:bg-white/2 text-slate-700 dark:text-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => togglePath(item.path)}
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
                              quickLookPreview(item.path);
                            }}
                            title="Quick Look (Space)"
                            className="p-1 rounded text-slate-400 hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                          >
                            <Eye size={12} />
                          </button>
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
            <div className="rounded-2xl glass-panel overflow-hidden py-16 text-center w-full space-y-2">
              <Clock size={32} className="mx-auto text-slate-300 dark:text-neutral-600" />
              <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                {t('largeDuplicates.noOldFiles', 'No old files found')}
              </p>
              <p className="text-xs text-slate-400">
                {t('largeDuplicates.noOldFilesDesc', 'No files older than 6 months were detected in user folders.')}
              </p>
            </div>
          ) : (
            <VirtualList
              items={data.old_files}
              itemHeight={68}
              renderItem={(file) => {
                const isSelected = selectedPaths.has(file.path);
                return (
                  <div
                    key={file.id}
                    onClick={() => togglePath(file.path)}
                    onMouseEnter={() => setFocusedPath(file.path)}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                    className={`flex items-center justify-between gap-3 p-3 mb-2 rounded-2xl glass-panel cursor-pointer transition-all ${
                      isSelected
                        ? 'border-accent/50 bg-accent-subtle/30'
                        : 'hover:border-black/10 dark:hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => togglePath(file.path)}
                      />
                      <div className="w-8 h-8 rounded-xl bg-black/3 dark:bg-white/5 flex items-center justify-center shrink-0">
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
                      <span className="text-xs font-mono font-semibold text-accent">
                        {formatSize(file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          quickLookPreview(file.path);
                        }}
                        title="Quick Look (Space)"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          revealInFinder(file.path);
                        }}
                        title={t('common.revealInFinder')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-black/4 dark:hover:bg-white/6 transition-colors cursor-pointer"
                      >
                        <ExternalLink size={13} />
                      </button>
                    </div>
                  </div>
                );
              }}
            />
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
        hasCriticalFiles={hasSelectedCritical}
      />

      {/* Floating Glassmorphic Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        items={contextMenuItems}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
