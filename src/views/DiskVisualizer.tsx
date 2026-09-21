import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useTranslation } from '../lib/i18n';
import { scanDirectoryTree, revealInFinder, quickLookPreview, type DiskTreeNode } from '../lib/commands';
import { formatSize } from '../lib/utils';
import PageHeader from '../components/layout/PageHeader';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import SunburstChart from '../components/charts/SunburstChart';
import ContextMenu, { type ContextMenuItem } from '../components/ui/ContextMenu';
import {
  PieChart,
  Folder,
  File,
  ChevronRight,
  FolderOpen,
  ExternalLink,
  Eye,
  ArrowUp,
  Disc,
  LayoutGrid,
  List,
  Copy,
} from 'lucide-react';

export default function DiskVisualizer() {
  const { t } = useTranslation();
  const {
    selectedDiskMount,
    globalRefreshTrigger,
    cachedDiskTree,
    setCachedDiskTree,
    visualizerTargetPath,
    setVisualizerTargetPath,
  } = useAppStore();

  const [currentPath, setCurrentPath] = useState<string>(() => cachedDiskTree?.path || '~');
  const [history, setHistory] = useState<string[]>([]);
  const [rootNode, setRootNode] = useState<DiskTreeNode | null>(cachedDiskTree);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'sunburst' | 'treemap' | 'list'>('sunburst');
  const [focusedPath, setFocusedPath] = useState<string | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    isOpen: boolean;
    node: DiskTreeNode | null;
  }>({ x: 0, y: 0, isOpen: false, node: null });

  const handleContextMenu = (e: React.MouseEvent, node: DiskTreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    setFocusedPath(node.path);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      isOpen: true,
      node,
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

  const loadTree = useCallback(async (path: string) => {
    setIsLoading(true);
    try {
      const tree = await scanDirectoryTree(path, 2);
      setRootNode(tree);
      if (tree && tree.path) {
        setCurrentPath(tree.path);
        if (path === '~' || path === '/') {
          setCachedDiskTree(tree);
        }
      }
    } catch (err) {
      console.error('Failed to scan disk tree:', err);
    } finally {
      setIsLoading(false);
    }
  }, [setCachedDiskTree]);

  // Consume visualizerTargetPath from GlobalDropzone
  useEffect(() => {
    if (visualizerTargetPath) {
      loadTree(visualizerTargetPath);
      setVisualizerTargetPath(null);
    }
  }, [visualizerTargetPath, loadTree, setVisualizerTargetPath]);

  useEffect(() => {
    const initial = (selectedDiskMount && selectedDiskMount !== '/') ? selectedDiskMount : '~';
    if (cachedDiskTree && (initial === '~' || initial === cachedDiskTree.path)) {
      return;
    }
    setHistory([]);
    loadTree(initial);
  }, [selectedDiskMount, loadTree, globalRefreshTrigger, cachedDiskTree]);

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

  const contextMenuItems = useMemo<ContextMenuItem[]>(() => {
    if (!contextMenu.node) return [];
    const node = contextMenu.node;

    const items: ContextMenuItem[] = [
      {
        id: 'quicklook',
        label: 'Quick Look',
        icon: <Eye size={14} />,
        shortcut: 'Space',
        onClick: () => quickLookPreview(node.path),
      },
      {
        id: 'reveal',
        label: t('common.revealInFinder', 'Reveal in Finder'),
        icon: <ExternalLink size={14} />,
        onClick: () => revealInFinder(node.path),
      },
      {
        id: 'copy-path',
        label: 'Copy Path',
        icon: <Copy size={14} />,
        shortcut: '⌥⌘C',
        onClick: () => navigator.clipboard.writeText(node.path),
        separatorAfter: node.isDir,
      },
    ];

    if (node.isDir) {
      items.push({
        id: 'open-dir',
        label: 'Browse Directory Inside',
        icon: <FolderOpen size={14} />,
        onClick: () => handleNavigateInto(node),
      });
    }

    return items;
  }, [contextMenu.node, t]);

  // Build breadcrumbs
  const breadcrumbs = currentPath.split('/').filter(Boolean);

  const totalSize = rootNode?.size || 1;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <PageHeader
        icon={<PieChart size={20} />}
        iconColor="text-accent"
        title={t('diskVisualizer.title', 'Interactive Disk Map')}
        subtitle={t('diskVisualizer.subtitle', 'Explore giant directories and navigate deep folder hierarchies visually.')}
        badge={
          rootNode ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent-subtle text-accent">
              {formatSize(rootNode.size)} ({rootNode.fileCount} files)
            </span>
          ) : undefined
        }
      />

      {/* Quick Location Shortcuts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="font-medium text-slate-400 shrink-0">
          {t('diskVisualizer.quickJump', 'Quick jump:')}
        </span>
        <button
          type="button"
          onClick={() => { setHistory((prev) => [...prev, currentPath]); loadTree('~'); }}
          className="px-2.5 py-1 rounded-lg font-medium bg-black/4 dark:bg-white/5 hover:bg-accent-subtle hover:text-accent transition-colors cursor-pointer shrink-0"
        >
          Home (~)
        </button>
        <button
          type="button"
          onClick={() => { setHistory((prev) => [...prev, currentPath]); loadTree('~/Downloads'); }}
          className="px-2.5 py-1 rounded-lg font-medium bg-black/4 dark:bg-white/5 hover:bg-accent-subtle hover:text-accent transition-colors cursor-pointer shrink-0"
        >
          Downloads
        </button>
        <button
          type="button"
          onClick={() => { setHistory((prev) => [...prev, currentPath]); loadTree('~/Developer'); }}
          className="px-2.5 py-1 rounded-lg font-medium bg-black/4 dark:bg-white/5 hover:bg-accent-subtle hover:text-accent transition-colors cursor-pointer shrink-0"
        >
          Developer
        </button>
        <button
          type="button"
          onClick={() => { setHistory((prev) => [...prev, currentPath]); loadTree('/Applications'); }}
          className="px-2.5 py-1 rounded-lg font-medium bg-black/4 dark:bg-white/5 hover:bg-accent-subtle hover:text-accent transition-colors cursor-pointer shrink-0"
        >
          Applications
        </button>
      </div>

      {/* Breadcrumb Navigation Bar */}
      <div className="flex items-center justify-between gap-2 p-2 rounded-2xl glass-panel border border-black/4 dark:border-white/6 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-0 text-xs font-semibold">
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleNavigateBack}
              title={t('common.back', 'Back')}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/8 text-slate-600 dark:text-neutral-300 transition-colors cursor-pointer shrink-0"
            >
              <ArrowUp size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={() => { setHistory([]); loadTree('/'); }}
            className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
              currentPath === '/'
                ? 'bg-accent text-white font-bold shadow-xs'
                : 'hover:bg-black/4 dark:hover:bg-white/6 text-slate-700 dark:text-neutral-300'
            }`}
          >
            /
          </button>

          {breadcrumbs.map((segment, index) => {
            const isLast = index === breadcrumbs.length - 1;
            const pathUpTo = '/' + breadcrumbs.slice(0, index + 1).join('/');

            return (
              <div key={pathUpTo} className="flex items-center gap-1">
                <ChevronRight size={12} className="text-slate-400 shrink-0" />
                <button
                  type="button"
                  onClick={() => handleBreadcrumbClick(pathUpTo)}
                  className={`px-2 py-1 rounded-lg transition-colors cursor-pointer truncate max-w-35 ${
                    isLast
                      ? 'bg-accent text-white font-bold shadow-xs'
                      : 'hover:bg-black/4 dark:hover:bg-white/6 text-slate-700 dark:text-neutral-300'
                  }`}
                >
                  {segment}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Segmented View Mode Toggle */}
          <div className="flex items-center p-0.5 rounded-xl bg-black/4 dark:bg-white/6 border border-black/5 dark:border-white/8 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('sunburst')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'sunburst'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Sunburst Chart (DaisyDisk style)"
            >
              <Disc size={13} />
              <span className="hidden sm:inline">Sunburst</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('treemap')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'treemap'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Treemap Grid"
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline">Treemap</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Ranked List"
            >
              <List size={13} />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => revealInFinder(currentPath)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold glass-pill text-slate-600 dark:text-neutral-300 hover:text-accent shrink-0 cursor-pointer"
          >
            <ExternalLink size={12} />
            <span>Finder</span>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : rootNode && rootNode.children.length > 0 ? (
        <div className="space-y-6">
          {/* Sunburst Multi-Ring Chart (DaisyDisk Mode) */}
          {viewMode === 'sunburst' && (
            <SunburstChart
              rootNode={rootNode}
              onNavigateInto={handleNavigateInto}
              onNavigateBack={handleNavigateBack}
              canNavigateBack={history.length > 0}
            />
          )}

          {/* Treemap Visual Grid */}
          {viewMode === 'treemap' && (
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
                {rootNode.children.slice(0, 12).map((child) => {
                  const percent = Math.max(1, Math.round((child.size / totalSize) * 100));

                  return (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => child.isDir ? handleNavigateInto(child) : revealInFinder(child.path)}
                      className="group relative p-3.5 rounded-2xl glass-panel border border-black/6 dark:border-white/8 hover:border-accent/40 text-left cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between min-h-27.5 shadow-2xs"
                    >
                      <div className="flex items-start justify-between w-full gap-2">
                        <div className="p-1.5 rounded-xl bg-black/5 dark:bg-white/6 text-slate-500 dark:text-neutral-400 group-hover:text-accent transition-colors shrink-0">
                          {child.isDir ? <Folder size={16} /> : <File size={16} />}
                        </div>
                        <span className="text-xs font-black px-1.5 py-0.5 rounded-md bg-accent-subtle text-accent border border-accent/15">
                          {percent}%
                        </span>
                      </div>

                      <div className="min-w-0 mt-2">
                        <p className="text-xs font-bold text-slate-800 dark:text-neutral-100 truncate group-hover:text-accent transition-colors">
                          {child.name}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-neutral-400 mt-0.5 font-mono">
                          {formatSize(child.size)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
                    onMouseEnter={() => setFocusedPath(child.path)}
                    onContextMenu={(e) => handleContextMenu(e, child)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-black/2 dark:hover:bg-white/3 transition-colors group cursor-pointer"
                  >
                    <div
                      onClick={() => child.isDir && handleNavigateInto(child)}
                      className={`flex items-center gap-3 min-w-0 flex-1 ${child.isDir ? 'cursor-pointer' : ''}`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
                        {child.isDir ? <FolderOpen size={16} /> : <File size={16} />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-neutral-200 truncate group-hover:text-accent transition-colors">
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
                            className="h-full bg-accent rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-xs">
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
                          quickLookPreview(child.path);
                        }}
                        title="Quick Look (Space)"
                        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/8 text-slate-400 hover:text-accent cursor-pointer transition-colors"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          revealInFinder(child.path);
                        }}
                        title={t('common.revealInFinder', 'Reveal in Finder')}
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
