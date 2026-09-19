import { useState } from 'react';
import { useAppStore, StagedCleanItem } from '../../store/appStore';
import { useTranslation } from '../../lib/i18n';
import { formatSize } from '../../lib/utils';
import { cleanSelectedItems, uninstallApp, cleanOrphanedLeftovers } from '../../lib/commands';
import {
  X,
  Trash2,
  Layers,
  Sparkles,
  Terminal,
  AppWindow,
  FileArchive,
  FolderDown,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import Button from './Button';
import CleaningFlowModal from './CleaningFlowModal';

export default function StagedItemsModal() {
  const {
    isStagedModalOpen,
    closeStagedModal,
    stagedItems,
    unstageItem,
    clearStagingQueue,
    deleteToTrash,
    recordCleanResult,
    triggerGlobalRefresh,
  } = useAppStore();

  const { t } = useTranslation();
  const [isCleaning, setIsCleaning] = useState(false);
  const [showCleaningFlow, setShowCleaningFlow] = useState(false);
  const [cleanedStats, setCleanedStats] = useState<{ bytesFreed: number; itemsCount: number } | null>(null);

  if (!isStagedModalOpen) return null;

  const itemsList: StagedCleanItem[] = Object.values(stagedItems);
  const totalSize = itemsList.reduce((sum, it) => sum + (it.size || 0), 0);
  const totalCount = itemsList.length;

  // Group items by originPage
  const pageGroups = itemsList.reduce<Record<string, StagedCleanItem[]>>((acc, item) => {
    const page = item.originPage || 'system-clean';
    if (!acc[page]) acc[page] = [];
    acc[page].push(item);
    return acc;
  }, {});

  const getPageTitle = (page: string) => {
    switch (page) {
      case 'system-clean':
      case 'system':
        return t('systemClean.title');
      case 'apps':
        return t('apps.title');
      case 'dev-workspace':
      case 'developer':
        return t('devWorkspace.title');
      case 'large-duplicates':
        return t('largeDuplicates.title');
      case 'trash-manager':
      case 'trash':
        return t('trashManager.title');
      case 'tidy-up':
        return t('tidyUp.title');
      default:
        return page;
    }
  };

  const getPageIcon = (page: string) => {
    switch (page) {
      case 'system-clean':
      case 'system':
        return <Sparkles size={14} className="text-accent" />;
      case 'apps':
        return <AppWindow size={14} className="text-accent" />;
      case 'dev-workspace':
      case 'developer':
        return <Terminal size={14} className="text-accent" />;
      case 'large-duplicates':
        return <FileArchive size={14} className="text-accent" />;
      case 'trash-manager':
      case 'trash':
        return <Trash2 size={14} className="text-rose-500" />;
      case 'tidy-up':
        return <FolderDown size={14} className="text-accent" />;
      default:
        return <Layers size={14} className="text-slate-500" />;
    }
  };

  const handleExecuteAllClean = async () => {
    if (itemsList.length === 0) return;

    setIsCleaning(true);
    setShowCleaningFlow(true);

    let freedBytesTotal = 0;
    let itemsCleanedTotal = 0;
    const categoryNames: string[] = [];

    try {
      // 1. Separate app uninstalls, orphaned leftovers, and file/folder paths
      const appsToUninstall = itemsList.filter((it) => it.itemType === 'app');
      const orphanedToClean = itemsList.filter((it) => it.itemType === 'orphaned');
      const regularItems = itemsList.filter((it) => it.itemType !== 'app' && it.itemType !== 'orphaned');

      // 2. Handle Applications
      for (const appItem of appsToUninstall) {
        try {
          const leftovers = appItem.extraData?.leftoverPaths || [];
          const res = await uninstallApp(appItem.path, leftovers, false, deleteToTrash);
          freedBytesTotal += res.freedBytes;
          itemsCleanedTotal += res.deletedCount;
          categoryNames.push(`App: ${appItem.name}`);
        } catch (err) {
          console.error(`Failed to uninstall ${appItem.name}:`, err);
        }
      }

      // 3. Handle Orphaned Leftovers
      if (orphanedToClean.length > 0) {
        try {
          const paths = orphanedToClean.map((it) => it.path);
          const count = await cleanOrphanedLeftovers(paths);
          const orphanedBytes = orphanedToClean.reduce((s, it) => s + (it.size || 0), 0);
          freedBytesTotal += orphanedBytes;
          itemsCleanedTotal += count;
          categoryNames.push(t('apps.orphanedTab'));
        } catch (err) {
          console.error('Failed to clean orphaned items:', err);
        }
      }

      // 4. Handle Regular Files & System/Dev Junk
      if (regularItems.length > 0) {
        try {
          const paths = regularItems.map((it) => it.path);
          const res = await cleanSelectedItems(paths, false, deleteToTrash);
          freedBytesTotal += res.freedBytes;
          itemsCleanedTotal += res.cleaned;
          categoryNames.push(t('queue.title'));
        } catch (err) {
          console.error('Failed to clean regular items:', err);
        }
      }

      setCleanedStats({ bytesFreed: freedBytesTotal, itemsCount: itemsCleanedTotal });
      recordCleanResult(
        freedBytesTotal,
        itemsCleanedTotal || totalCount,
        false,
        categoryNames.length > 0 ? categoryNames : [t('queue.title')]
      );

      // Clear the staged items and refresh views
      clearStagingQueue();
      triggerGlobalRefresh();
    } catch (err) {
      console.error('Queue cleanup failed:', err);
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
        <div
          role="dialog"
          aria-modal="true"
          className="glass-panel w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl border border-black/10 dark:border-white/15 flex flex-col overflow-hidden backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
                <Layers size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{t('queue.title')}</span>
                  {totalCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-accent-subtle text-accent">
                      {totalCount}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  {t('queue.subtitle')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {totalCount > 0 && (
                <button
                  type="button"
                  onClick={clearStagingQueue}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-500 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-black/4 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw size={12} />
                  <span>{t('queue.clearAll')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={closeStagedModal}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {totalCount === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 flex items-center justify-center mx-auto">
                  <Layers size={28} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-neutral-300">
                    {t('queue.emptyTitle')}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-neutral-500 max-w-sm mx-auto mt-1">
                    {t('queue.emptyDesc')}
                  </p>
                </div>
              </div>
            ) : (
              Object.entries(pageGroups).map(([pageKey, items]) => (
                <div key={pageKey} className="space-y-2.5">
                  {/* Group header */}
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-neutral-300 px-1">
                    <div className="flex items-center gap-2">
                      {getPageIcon(pageKey)}
                      <span>{getPageTitle(pageKey)}</span>
                      <span className="text-[11px] font-normal text-slate-400 dark:text-neutral-500">
                        ({items.length})
                      </span>
                    </div>
                    <span className="font-mono text-slate-500 dark:text-neutral-400">
                      {formatSize(items.reduce((s, i) => s + (i.size || 0), 0))}
                    </span>
                  </div>

                  {/* Group items */}
                  <div className="divide-y divide-black/4 dark:divide-white/6 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 overflow-hidden">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {item.extraData?.icon ? (
                            <img
                              src={item.extraData.icon}
                              alt={item.name}
                              className="w-5 h-5 rounded-md object-contain shrink-0"
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-800 dark:text-neutral-100 truncate">
                                {item.name}
                              </span>
                              {item.categoryName && (
                                <span className="text-[10px] px-2 py-0.2 rounded-md bg-black/4 dark:bg-white/6 text-slate-500 dark:text-neutral-400 truncate">
                                  {item.categoryName}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-slate-400 dark:text-neutral-500 truncate mt-0.5">
                              {item.path}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-mono font-semibold text-slate-700 dark:text-neutral-300">
                            {formatSize(item.size)}
                          </span>
                          <button
                            type="button"
                            onClick={() => unstageItem(item.id)}
                            title={t('queue.removeFromQueue')}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {totalCount > 0 && (
            <div className="p-4 sm:p-5 border-t border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-neutral-400">
                <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                <span>
                  {t('queue.itemsCount', '{count} items ({size})', {
                    count: totalCount,
                    size: formatSize(totalSize),
                  })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={closeStagedModal}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant={deleteToTrash ? 'primary' : 'danger'}
                  size="sm"
                  loading={isCleaning}
                  onClick={handleExecuteAllClean}
                  icon={<Trash2 size={14} />}
                >
                  {isCleaning
                    ? t('queue.cleaningAll')
                    : t('queue.cleanAll', 'Clean All Staged ({size})', { size: formatSize(totalSize) })}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cleaning Progress Flow Modal */}
      <CleaningFlowModal
        isOpen={showCleaningFlow}
        onClose={() => {
          setShowCleaningFlow(false);
          closeStagedModal();
        }}
        isCleaning={isCleaning}
        isDryRun={false}
        totalBytes={cleanedStats?.bytesFreed || totalSize}
        totalItems={cleanedStats?.itemsCount || totalCount}
        paths={itemsList.map((i) => i.path)}
        title={t('queue.title')}
      />
    </>
  );
}
