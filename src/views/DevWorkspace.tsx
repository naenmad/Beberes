import { useAppStore } from '../store/appStore';
import { scanDevWorkspaces, cleanSelectedItems, revealInFinder } from '../lib/commands';
import type { CleanResult } from '../lib/commands';
import { formatSize } from '../lib/utils';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Checkbox from '../components/ui/Checkbox';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import {
  FolderOpen,
  Trash2,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Package,
  Box,
  Container,
  Hammer,
  Layers,
  Search,
  ExternalLink,
  ShieldCheck,
  Eye,
  CheckSquare,
  Square,
  Filter,
  Sparkles,
} from 'lucide-react';
import { useState, useMemo } from 'react';

const categoryIcons: Record<string, React.ReactNode> = {
  xcode_cache: <Hammer size={20} className="text-sky-500" />,
  package_cache: <Layers size={20} className="text-indigo-500" />,
  node_modules: <Package size={20} className="text-emerald-500" />,
  cargo_target: <Box size={20} className="text-orange-500" />,
  docker_volumes: <Container size={20} className="text-blue-500" />,
};

type SizeFilter = 'all' | '100mb' | '1gb';

export default function DevWorkspace() {
  const {
    devCategories,
    setDevCategories,
    isScanning,
    setIsScanning,
    isCleaning,
    setIsCleaning,
    isDryRun,
    toggleDryRun,
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

  const selectedSize = getSelectedSize('dev');
  const selectedItems = getSelectedItems('dev');

  const totalItemsCount = devCategories.reduce((acc, cat) => acc + cat.items.length, 0);
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
      const results = await scanDevWorkspaces();
      setDevCategories(results);
      setExpandedCategories(new Set(results.filter((c) => c.items.length > 0).map((c) => c.id)));
    } catch (err) {
      console.error('Dev scan failed:', err);
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
    setIsCleaning(true);
    try {
      const result = await cleanSelectedItems(
        selectedItems.map((item) => item.path),
        isDryRun
      );
      setCleanResult(result);
      if (!isDryRun) {
        recordCleanResult(result.freedBytes, selectedItems.length, false, ['Dev Workspace']);
        setShowConfirmModal(false);
        await runScan();
      } else {
        setShowConfirmModal(false);
      }
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
    const minBytes = sizeFilter === '1gb' ? 1024 * 1024 * 1024 : sizeFilter === '100mb' ? 100 * 1024 * 1024 : 0;

    return devCategories
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
  }, [devCategories, searchQuery, sizeFilter]);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Actions & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search dev caches, packages, or paths..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-neutral-200"
          />
        </div>
        <div className="flex items-center gap-2">
          {totalItemsCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => selectAll('dev', !allItemsSelected)}
              icon={allItemsSelected ? <Square size={14} /> : <CheckSquare size={14} />}
            >
              {allItemsSelected ? 'Deselect All' : 'Select All'}
            </Button>
          )}
          <Button
            onClick={runScan}
            loading={isScanning}
            icon={<RefreshCw size={15} />}
            variant="secondary"
            size="sm"
          >
            {isScanning ? 'Scanning...' : 'Scan Workspaces'}
          </Button>
        </div>
      </div>

      {/* Filter Pills Bar */}
      {devCategories.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 dark:text-neutral-500 flex items-center gap-1">
            <Filter size={12} /> Size filter:
          </span>
          {(['all', '100mb', '1gb'] as SizeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setSizeFilter(f)}
              className={`px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                sizeFilter === f
                  ? 'bg-blue-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-700'
              }`}
            >
              {f === 'all' ? 'All Sizes' : f === '100mb' ? '> 100 MB' : '> 1 GB'}
            </button>
          ))}
        </div>
      )}

      {/* Clean result banner */}
      {cleanResult && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border animate-fade-in ${
            cleanResult.isSimulation
              ? 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20'
              : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                cleanResult.isSimulation
                  ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400'
                  : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {cleanResult.isSimulation ? <ShieldCheck size={18} /> : <Trash2 size={18} />}
            </div>
            <div>
              <p
                className={`text-sm font-medium ${
                  cleanResult.isSimulation
                    ? 'text-sky-800 dark:text-sky-300'
                    : 'text-emerald-800 dark:text-emerald-300'
                }`}
              >
                {cleanResult.isSimulation ? '[Simulation / Dry Run]' : 'Clean Complete:'}{' '}
                {cleanResult.isSimulation
                  ? `Would clean ${cleanResult.cleaned} items safely`
                  : `Successfully cleaned ${cleanResult.cleaned} items`}
              </p>
              <p
                className={`text-xs ${
                  cleanResult.isSimulation
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {cleanResult.isSimulation
                  ? `Estimated space reclaim: ${formatSize(cleanResult.freedBytes)} (no files deleted)`
                  : `Freed ${formatSize(cleanResult.freedBytes)} of disk space`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setCleanResult(null)}
            className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            Dismiss
          </button>
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
                      onChange={() => toggleCategorySelection('dev', category.id)}
                    />
                    <button
                      onClick={() => toggleExpand(category.id)}
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                    >
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-neutral-700/50">
                        {categoryIcons[category.id] || <FolderOpen size={20} className="text-slate-400" />}
                      </div>
                      <div className="text-left flex-1">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                          {category.name}
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-neutral-500">
                          {category.items.length} items
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-slate-600 dark:text-neutral-300 mr-2">
                        {formatSize(category.size)}
                      </span>
                      {isExpanded ? (
                        <ChevronDown size={16} className="text-slate-400" />
                      ) : (
                        <ChevronRight size={16} className="text-slate-400" />
                      )}
                    </button>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardBody className="!py-2">
                    <div className="divide-y divide-slate-50 dark:divide-neutral-700/50">
                      {category.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 py-2.5 hover:bg-slate-50/50 dark:hover:bg-neutral-700/20 -mx-2 px-2 rounded-lg transition-colors duration-150 group"
                        >
                          <Checkbox
                            checked={item.selected}
                            onChange={() =>
                              toggleItemSelection('dev', category.id, item.id)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-700 dark:text-neutral-200 truncate">
                                {item.name}
                              </p>
                              {item.category === 'node_modules' && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                  &gt; 90 days inactive
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 dark:text-neutral-500 truncate">
                              {item.path}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-semibold text-slate-600 dark:text-neutral-300">
                              {formatSize(item.size)}
                            </span>
                            <button
                              onClick={(e) => handleReveal(e, item.path)}
                              title="Reveal in Finder"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 opacity-60 group-hover:opacity-100 transition-all duration-150"
                            >
                              <ExternalLink size={15} />
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
            <Card className="p-12 text-center">
              <Sparkles size={40} className="text-slate-300 dark:text-neutral-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-neutral-400">
                {searchQuery || sizeFilter !== 'all'
                  ? 'No matching developer caches found.'
                  : 'No scan results yet. Click "Scan Workspaces" to detect developer junk.'}
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Sticky Clean Bar with Dry Run Toggle */}
      {selectedItems.length > 0 && (
        <div className="sticky bottom-0 -mx-8 px-8 py-4 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-lg border-t border-slate-100 dark:border-neutral-800 shadow-lg">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-neutral-200">
                  {selectedItems.length} selected ({formatSize(selectedSize)})
                </span>
              </div>

              {/* Simulation Mode Switch */}
              <button
                type="button"
                onClick={toggleDryRun}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  isDryRun
                    ? 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40'
                    : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700 hover:border-slate-300'
                }`}
              >
                <Eye size={12} />
                <span>Dry Run: {isDryRun ? 'ON (Preview)' : 'OFF'}</span>
              </button>
            </div>

            <Button
              onClick={handleCleanClick}
              loading={isCleaning}
              variant={isDryRun ? 'primary' : 'danger'}
              icon={isDryRun ? <ShieldCheck size={16} /> : <Trash2 size={16} />}
            >
              {isCleaning
                ? isDryRun
                  ? 'Simulating...'
                  : 'Cleaning...'
                : isDryRun
                ? `Simulate Clean (${formatSize(selectedSize)})`
                : `Clean Selected (${formatSize(selectedSize)})`}
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
        title="Confirm Dev Workspace Cleanup"
        itemsCount={selectedItems.length}
        totalBytes={selectedSize}
        paths={selectedItems.map((i) => i.path)}
        isDryRun={isDryRun}
      />
    </div>
  );
}
