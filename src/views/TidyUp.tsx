import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useTranslation } from '../lib/i18n';
import {
  scanTidyDirectory,
  executeTidyOrganization,
  cleanRedundantInstallers,
  revealInFinder,
  pickFolder,
} from '../lib/commands';
import type { TidyScanResult } from '../lib/commands';
import { formatSize } from '../lib/utils';
import Button from '../components/ui/Button';
import FloatingActionBar from '../components/ui/FloatingActionBar';
import PageHeader from '../components/layout/PageHeader';
import Checkbox from '../components/ui/Checkbox';
import ConfirmModal from '../components/ui/ConfirmModal';
import CleaningFlowModal from '../components/ui/CleaningFlowModal';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import {
  FolderTree,
  FolderOpen,
  Trash2,
  Search,
  ExternalLink,
  CheckSquare,
  Square,
  Layers,
  FileText,
  Camera,
  Archive,
  Film,
  Package,
  AlertTriangle,
  ArrowRight,
  FolderInput,
  Download,
  Monitor,
} from 'lucide-react';

const categoryMeta: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  Screenshots: {
    icon: <Camera size={16} className="text-pink-500" />,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-50 dark:bg-pink-500/10',
  },
  Installers: {
    icon: <Package size={16} className="text-amber-500" />,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-500/10',
  },
  Documents: {
    icon: <FileText size={16} className="text-blue-500" />,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-500/10',
  },
  Archives: {
    icon: <Archive size={16} className="text-purple-500" />,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-500/10',
  },
  Media: {
    icon: <Film size={16} className="text-emerald-500" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  Code: {
    icon: <Layers size={16} className="text-indigo-500" />,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-500/10',
  },
  Other: {
    icon: <FolderOpen size={16} className="text-slate-400" />,
    color: 'text-slate-600 dark:text-neutral-400',
    bgColor: 'bg-slate-50 dark:bg-neutral-800',
  },
};

type ActiveTargetTab = 'downloads' | 'desktop' | 'custom';

export default function TidyUp() {
  const { t } = useTranslation();
  const { deleteToTrash, recordCleanResult, globalRefreshTrigger } = useAppStore();

  const [activeTab, setActiveTab] = useState<ActiveTargetTab>('downloads');
  const [customPath, setCustomPath] = useState('');
  const [currentScan, setCurrentScan] = useState<TidyScanResult | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Modals
  const [showOrganizeModal, setShowOrganizeModal] = useState(false);
  const [showDmgModal, setShowDmgModal] = useState(false);
  const [showCleaningFlow, setShowCleaningFlow] = useState(false);
  const [flowTitle, setFlowTitle] = useState('Organizing Files');
  const [activeActionStats, setActiveActionStats] = useState<{
    itemsCount: number;
    totalBytes: number;
    paths: string[];
  }>({ itemsCount: 0, totalBytes: 0, paths: [] });

  // Determine current directory path (downloads and desktop shorthand automatically resolved in backend)
  const currentPath = useMemo(() => {
    if (activeTab === 'downloads') return 'downloads';
    if (activeTab === 'desktop') return 'desktop';
    return customPath || 'downloads';
  }, [activeTab, customPath]);

  const runScan = async (targetDir: string = currentPath) => {
    setIsLoading(true);
    try {
      const res = await scanTidyDirectory(targetDir);
      setCurrentScan(res);
      setSelectedItemIds(new Set(res.items.map((i) => i.id)));
    } catch (err) {
      console.error('Failed to scan tidy directory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runScan(currentPath);
  }, [activeTab, customPath, globalRefreshTrigger]);

  const handlePickCustomFolder = async () => {
    const chosen = await pickFolder();
    if (chosen) {
      setCustomPath(chosen);
      setActiveTab('custom');
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (select: boolean) => {
    if (!currentScan) return;
    if (select) {
      setSelectedItemIds(new Set(currentScan.items.map((i) => i.id)));
    } else {
      setSelectedItemIds(new Set());
    }
  };

  const selectedItems = useMemo(() => {
    if (!currentScan) return [];
    return currentScan.items.filter((i) => selectedItemIds.has(i.id));
  }, [currentScan, selectedItemIds]);

  const selectedSize = selectedItems.reduce((sum, i) => sum + i.size, 0);

  const redundantInstallers = useMemo(() => {
    if (!currentScan) return [];
    return currentScan.items.filter((i) => i.isRedundantInstaller);
  }, [currentScan]);

  const filteredItems = useMemo(() => {
    if (!currentScan) return [];
    let items = currentScan.items;
    if (selectedCategory !== 'All') {
      items = items.filter((i) => i.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(q) || i.targetFolder.toLowerCase().includes(q));
    }
    return items;
  }, [currentScan, selectedCategory, searchQuery]);

  const categoryStats = useMemo(() => {
    if (!currentScan) return {};
    const counts: Record<string, { count: number; size: number }> = {};
    for (const item of currentScan.items) {
      if (!counts[item.category]) {
        counts[item.category] = { count: 0, size: 0 };
      }
      counts[item.category].count += 1;
      counts[item.category].size += item.size;
    }
    return counts;
  }, [currentScan]);

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'All': return t('tidyUp.categoryAll');
      case 'Screenshots': return t('tidyUp.categoryScreenshots');
      case 'Installers': return t('tidyUp.categoryInstallers');
      case 'Documents': return t('tidyUp.categoryDocuments');
      case 'Archives': return t('tidyUp.categoryArchives');
      case 'Media': return t('tidyUp.categoryMedia');
      case 'Code': return t('tidyUp.categoryCode');
      case 'Other': return t('tidyUp.categoryOther');
      default: return cat;
    }
  };

  // Execute organization
  const handleExecuteOrganize = async () => {
    if (!currentScan || selectedItems.length === 0) return;
    const count = selectedItems.length;
    const bytes = selectedSize;
    const paths = selectedItems.map((i) => `${i.name} -> ${i.targetFolder}/`);

    setActiveActionStats({
      itemsCount: count,
      totalBytes: bytes,
      paths,
    });

    setShowOrganizeModal(false);
    setFlowTitle(t('tidyUp.organizingFlowTitle'));
    setShowCleaningFlow(true);
    setIsProcessingAction(true);
    try {
      const actions = selectedItems.map((item) => ({
        itemPath: item.path,
        targetFolderName: item.targetFolder,
      }));
      await executeTidyOrganization(currentScan.sourcePath, actions, false);
      await runScan(currentPath);
    } catch (err) {
      console.error('Failed to organize files:', err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Clean redundant installers
  const handleCleanRedundantInstallers = async () => {
    if (redundantInstallers.length === 0) return;
    const count = redundantInstallers.length;
    const bytes = currentScan?.redundantInstallersSize || 0;
    const paths = redundantInstallers.map((i) => i.path);

    setActiveActionStats({
      itemsCount: count,
      totalBytes: bytes,
      paths,
    });

    setShowDmgModal(false);
    setFlowTitle(t('tidyUp.purgingInstallersFlowTitle'));
    setShowCleaningFlow(true);
    setIsProcessingAction(true);
    try {
      const res = await cleanRedundantInstallers(paths, false, deleteToTrash);
      recordCleanResult(res.freedBytes, paths.length, false, ['Redundant Installers']);
      await runScan(currentPath);
    } catch (err) {
      console.error('Failed to clean installers:', err);
    } finally {
      setIsProcessingAction(false);
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

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <PageHeader
        icon={<FolderTree size={20} />}
        iconColor="text-blue-500"
        title={t('tidyUp.title')}
        subtitle={t('tidyUp.subtitle')}
      />

      {/* Target Directory Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 rounded-xl glass-pill w-fit">
          <button
            onClick={() => setActiveTab('downloads')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'downloads'
                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Download size={13} />
            <span>{t('tidyUp.tabDownloads')}</span>
          </button>
          <button
            onClick={() => setActiveTab('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'desktop'
                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Monitor size={13} />
            <span>{t('tidyUp.tabDesktop')}</span>
          </button>
          <button
            onClick={handlePickCustomFolder}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FolderInput size={13} />
            <span>{customPath ? customPath.split('/').pop() : t('tidyUp.tabCustom')}</span>
          </button>
        </div>
      </div>

      {/* Redundant Installers Sweeper Alert Banner */}
      {currentScan && currentScan.redundantInstallersCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {t('tidyUp.redundantInstallersAlert', '{count} Redundant Installers Detected ({size})', {
                  count: currentScan.redundantInstallersCount,
                  size: formatSize(currentScan.redundantInstallersSize),
                })}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {t('tidyUp.redundantInstallersAlertDesc')}
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDmgModal(true)}
            icon={<Trash2 size={14} />}
          >
            {t('tidyUp.trashInstallersBtn', 'Trash Installers ({size})', {
              size: formatSize(currentScan.redundantInstallersSize),
            })}
          </Button>
        </div>
      )}

      {/* Overview Stat Cards */}
      {currentScan && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl glass-panel">
            <span className="text-xs text-slate-400 dark:text-neutral-400">{t('tidyUp.statUnorganized')}</span>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {t('common.itemsCount', '{count} items', { count: currentScan.totalFiles })}
            </p>
          </div>
          <div className="p-4 rounded-2xl glass-panel">
            <span className="text-xs text-slate-400 dark:text-neutral-400">{t('tidyUp.statTotalClutter')}</span>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
              {formatSize(currentScan.totalSize)}
            </p>
          </div>
          <div className="p-4 rounded-2xl glass-panel">
            <span className="text-xs text-slate-400 dark:text-neutral-400">{t('tidyUp.statScreenshots')}</span>
            <p className="text-lg font-bold text-pink-600 dark:text-pink-400 mt-0.5">
              {categoryStats['Screenshots']?.count || 0}
            </p>
          </div>
          <div className="p-4 rounded-2xl glass-panel">
            <span className="text-xs text-slate-400 dark:text-neutral-400">{t('tidyUp.statInstallers')}</span>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {categoryStats['Installers']?.count || 0} ({formatSize(categoryStats['Installers']?.size || 0)})
            </p>
          </div>
        </div>
      )}

      {/* Search & Selection Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('tidyUp.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-neutral-800 border border-black/6 dark:border-white/8 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-neutral-200"
          />
        </div>

        <div className="flex items-center gap-2">
          {currentScan && currentScan.totalFiles > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => selectAll(selectedItemIds.size !== currentScan.totalFiles)}
              icon={
                selectedItemIds.size === currentScan.totalFiles ? (
                  <Square size={13} />
                ) : (
                  <CheckSquare size={13} />
                )
              }
            >
              {selectedItemIds.size === currentScan.totalFiles ? t('common.deselectAll') : t('common.selectAll')}
            </Button>
          )}
        </div>
      </div>

      {/* Category Filter Pills (100% Vector Icons) */}
      {currentScan && currentScan.totalFiles > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {['All', 'Screenshots', 'Installers', 'Documents', 'Archives', 'Media', 'Code', 'Other'].map(
            (cat) => {
              const count = cat === 'All' ? currentScan.totalFiles : categoryStats[cat]?.count || 0;
              if (cat !== 'All' && count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full font-semibold transition-colors shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-black/4 dark:bg-white/6 text-slate-600 dark:text-neutral-400 hover:bg-black/7 dark:hover:bg-white/10'
                  }`}
                >
                  {getCategoryLabel(cat)} ({count})
                </button>
              );
            }
          )}
        </div>
      )}

      {/* File List */}
      {isLoading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="rounded-2xl glass-panel overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center">
              <FolderTree size={36} className="text-slate-300 dark:text-neutral-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-neutral-300">
                {searchQuery || selectedCategory !== 'All'
                  ? t('tidyUp.emptySearch')
                  : t('tidyUp.emptyClean')}
              </p>
              <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1">
                {t('tidyUp.emptyCleanDesc', 'No unorganized loose files found in {path}', { path: currentPath })}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-black/4 dark:divide-white/6">
              {filteredItems.map((item) => {
                const isChecked = selectedItemIds.has(item.id);
                const meta = categoryMeta[item.category] || categoryMeta['Other'];

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-black/2 dark:hover:bg-white/3 transition-colors group"
                  >
                    <Checkbox checked={isChecked} onChange={() => toggleItemSelection(item.id)} />

                    <div className={`p-2 rounded-xl ${meta.bgColor} shrink-0`}>
                      {meta.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-slate-800 dark:text-neutral-200 truncate">
                          {item.name}
                        </p>
                        {item.isRedundantInstaller && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {t('tidyUp.installedAppBadge', 'Installed: {name}', { name: item.installedAppName || '' })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-neutral-500 mt-0.5">
                        <span>{item.lastModified}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-mono">
                          <ArrowRight size={10} /> {item.targetFolder}/
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-bold text-slate-600 dark:text-neutral-300">
                        {formatSize(item.size)}
                      </span>
                      <button
                        onClick={(e) => handleReveal(e, item.path)}
                        title={t('common.revealInFinder')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-black/4 dark:hover:bg-white/6 opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedItems.length}
        selectedSize={selectedSize}
        onClean={() => setShowOrganizeModal(true)}
        isCleaning={isProcessingAction}
        onDeselect={() => setSelectedItemIds(new Set())}
        cleanLabel={t('tidyUp.organizeIntoFolders', 'Organize into Folders ({count} files)', { count: selectedItems.length })}
        actionVariant="primary"
        showModeBadge={false}
      />

      {/* Confirm Organize Modal */}
      <ConfirmModal
        isOpen={showOrganizeModal}
        onClose={() => setShowOrganizeModal(false)}
        onConfirm={handleExecuteOrganize}
        isLoading={isProcessingAction}
        actionType="organize"
        title={t('tidyUp.confirmOrganizeTitle')}
        itemsCount={selectedItems.length}
        totalBytes={selectedSize}
        paths={selectedItems.map((i) => `${i.name} -> ${i.targetFolder}/`)}
        isDryRun={false}
      />

      {/* Confirm DMG Cleanup Modal */}
      <ConfirmModal
        isOpen={showDmgModal}
        onClose={() => setShowDmgModal(false)}
        onConfirm={handleCleanRedundantInstallers}
        isLoading={isProcessingAction}
        actionType="clean"
        title={t('tidyUp.confirmTrashInstallersTitle')}
        itemsCount={redundantInstallers.length}
        totalBytes={currentScan?.redundantInstallersSize || 0}
        paths={redundantInstallers.map((i) => i.path)}
        isDryRun={false}
      />

      {/* Interactive Progress Flow Modal */}
      <CleaningFlowModal
        isOpen={showCleaningFlow}
        onClose={() => setShowCleaningFlow(false)}
        isCleaning={isProcessingAction}
        isDryRun={false}
        mode={flowTitle.includes('Installers') ? 'clean' : 'organize'}
        totalBytes={activeActionStats.totalBytes}
        totalItems={activeActionStats.itemsCount}
        paths={activeActionStats.paths}
        title={flowTitle}
      />
    </div>
  );
}
