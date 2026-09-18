import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { useTranslation } from '../lib/i18n';
import { scanDirectoryTree, revealInFinder, type DiskTreeNode } from '../lib/commands';
import { formatSize } from '../lib/utils';
import Button from '../components/ui/Button';
import PageHeader from '../components/layout/PageHeader';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import {
  PieChart,
  Folder,
  File,
  ChevronRight,
  FolderOpen,
  RefreshCw,
  ExternalLink,
  ArrowUp,
} from 'lucide-react';

const tileColors = [
  'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:border-blue-500/50',
  'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:border-purple-500/50',
  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:border-emerald-500/50',
  'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:border-amber-500/50',
  'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:border-rose-500/50',
  'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 hover:border-cyan-500/50',
  'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 hover:border-indigo-500/50',
  'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/20 hover:border-pink-500/50',
];

export default function DiskVisualizer() {
  const { t } = useTranslation();
  const { selectedDiskMount } = useAppStore();

  const [currentPath, setCurrentPath] = useState<string>(selectedDiskMount || '/');
  const [history, setHistory] = useState<string[]>([]);
  const [rootNode, setRootNode] = useState<DiskTreeNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadTree = useCallback(async (path: string) => {
    setIsLoading(true);
    try {
      const tree = await scanDirectoryTree(path, 2);
      setRootNode(tree);
    } catch (err) {
      console.error('Failed to scan disk tree:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setCurrentPath(selectedDiskMount);
    setHistory([]);
    loadTree(selectedDiskMount);
  }, [selectedDiskMount, loadTree]);

  const handleNavigateInto = (node: DiskTreeNode) => {
    if (!node.isDir) return;
    setHistory((prev) => [...prev, currentPath]);
    setCurrentPath(node.path);
    loadTree(node.path);
  };

  const handleNavigateBack = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, h.length - 1));
    setCurrentPath(prev);
    loadTree(prev);
  };

  const handleBreadcrumbClick = (targetPath: string) => {
    if (targetPath === currentPath) return;
    setHistory((prev) => [...prev, currentPath]);
    setCurrentPath(targetPath);
    loadTree(targetPath);
  };

  // Build breadcrumbs
  const breadcrumbs = currentPath.split('/').filter(Boolean);

  const totalSize = rootNode?.size || 1;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <PageHeader
        icon={<PieChart size={20} />}
        iconColor="text-indigo-500"
        title={t('diskVisualizer.title', 'Interactive Disk Map')}
        subtitle={t('diskVisualizer.subtitle', 'Explore giant directories and navigate deep folder hierarchies visually.')}
        badge={
          rootNode ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              {formatSize(rootNode.size)} ({rootNode.fileCount} files)
            </span>
          ) : undefined
        }
        actions={
          <Button
            onClick={() => loadTree(currentPath)}
            loading={isLoading}
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={13} />}
          >
            {isLoading ? t('common.scanning') : t('common.refresh')}
          </Button>
        }
      />

      {/* Breadcrumb Navigation Bar */}
      <div className="flex items-center justify-between gap-2 p-2 rounded-2xl glass-panel border border-black/4 dark:border-white/6 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-0 text-xs font-semibold">
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleNavigateBack}
              title={t('common.back', 'Back')}
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/8 text-slate-500 cursor-pointer"
            >
              <ArrowUp size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={() => handleBreadcrumbClick('/')}
            className="px-2 py-1 rounded-lg hover:bg-black/4 dark:hover:bg-white/6 text-slate-700 dark:text-neutral-300 cursor-pointer"
          >
            /
          </button>

          {breadcrumbs.map((segment, idx) => {
            const pathUpTo = '/' + breadcrumbs.slice(0, idx + 1).join('/');
            const isLast = idx === breadcrumbs.length - 1;

            return (
              <div key={pathUpTo} className="flex items-center gap-1">
                <ChevronRight size={12} className="text-slate-400 shrink-0" />
                <button
                  type="button"
                  onClick={() => handleBreadcrumbClick(pathUpTo)}
                  className={`px-2 py-1 rounded-lg transition-colors cursor-pointer truncate max-w-35 ${
                    isLast
                      ? 'bg-blue-500 text-white font-bold shadow-xs'
                      : 'hover:bg-black/4 dark:hover:bg-white/6 text-slate-700 dark:text-neutral-300'
                  }`}
                >
                  {segment}
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => revealInFinder(currentPath)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold glass-pill text-slate-600 dark:text-neutral-300 hover:text-blue-500 shrink-0 cursor-pointer"
        >
          <ExternalLink size={12} />
          <span>Finder</span>
        </button>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : rootNode && rootNode.children.length > 0 ? (
        <div className="space-y-6">
          {/* Treemap Visual Grid */}
          <div>
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-bold text-slate-600 dark:text-neutral-400 uppercase tracking-wider text-[11px]">
                {t('diskVisualizer.treemap', 'Proportional Space Allocation')}
              </span>
              <span className="text-slate-400 text-[11px]">
                {t('diskVisualizer.clickToExplore', 'Click any folder tile to dive in')}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {rootNode.children.slice(0, 12).map((child, index) => {
                const percent = Math.max(1, Math.round((child.size / totalSize) * 100));
                const colorClass = tileColors[index % tileColors.length];

                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => child.isDir ? handleNavigateInto(child) : revealInFinder(child.path)}
                    className={`
                      relative p-3.5 rounded-2xl border text-left cursor-pointer
                      transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                      flex flex-col justify-between min-h-27.5 shadow-2xs
                      ${colorClass}
                    `}
                  >
                    <div className="flex items-start justify-between w-full gap-2">
                      <div className="p-1.5 rounded-xl bg-white/40 dark:bg-black/20 shrink-0">
                        {child.isDir ? <Folder size={16} /> : <File size={16} />}
                      </div>
                      <span className="text-xs font-extrabold">{percent}%</span>
                    </div>

                    <div className="min-w-0 mt-2">
                      <p className="text-xs font-bold truncate">{child.name}</p>
                      <p className="text-[11px] opacity-80 mt-0.5">{formatSize(child.size)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ranked Table / List Breakdown */}
          <div className="p-4 rounded-3xl glass-panel border border-black/4 dark:border-white/6 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-black/4 dark:border-white/6 text-xs font-bold text-slate-400 dark:text-neutral-500">
              <span>{t('diskVisualizer.item', 'Item Name')}</span>
              <div className="flex items-center gap-8">
                <span>{t('diskVisualizer.share', 'Share')}</span>
                <span className="w-20 text-right">{t('common.size', 'Size')}</span>
              </div>
            </div>

            <div className="space-y-1">
              {rootNode.children.map((child) => {
                const percent = Math.min(100, Math.round((child.size / totalSize) * 100));

                return (
                  <div
                    key={child.id}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-black/2 dark:hover:bg-white/3 transition-colors group"
                  >
                    <div
                      onClick={() => child.isDir && handleNavigateInto(child)}
                      className={`flex items-center gap-3 min-w-0 flex-1 ${child.isDir ? 'cursor-pointer' : ''}`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                        {child.isDir ? <FolderOpen size={16} /> : <File size={16} />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-neutral-200 truncate group-hover:text-blue-500 transition-colors">
                            {child.name}
                          </span>
                          {child.isDir && (
                            <span className="text-[10px] text-slate-400">
                              ({child.fileCount} files)
                            </span>
                          )}
                        </div>

                        {/* Capacity Bar */}
                        <div className="w-36 h-1.5 bg-black/6 dark:bg-white/8 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 text-xs">
                      <span className="text-slate-400 font-semibold w-12 text-right">
                        {percent}%
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white w-20 text-right font-mono">
                        {formatSize(child.size)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          revealInFinder(child.path);
                        }}
                        title="Reveal in Finder"
                        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/8 text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 cursor-pointer"
                      >
                        <ExternalLink size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl glass-panel border border-black/4 dark:border-white/6">
          <FolderOpen size={36} className="mx-auto text-slate-300 dark:text-neutral-600 mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-neutral-300">
            {t('diskVisualizer.emptyDir', 'This directory is empty or inaccessible')}
          </p>
        </div>
      )}
    </div>
  );
}
