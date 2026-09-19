import { useAppStore } from '../store/appStore';
import { useTranslation } from '../lib/i18n';
import {
  scanDevWorkspaces,
  cleanSelectedItems,
  revealInFinder,
  runBrewCleanup,
  listActivePorts,
  killProcessByPid,
  scanXcodeEnvironments,
  purgeUnavailableSimulators,
  cleanXcodeTarget,
  scanDormantProjects,
  hibernateProject,
  type CleanResult,
  type ListeningPort,
  type XcodeEnvironmentReport,
  type DormantProject,
} from '../lib/commands';
import { formatSize } from '../lib/utils';
import Card from '../components/ui/Card';
import Checkbox from '../components/ui/Checkbox';
import Button from '../components/ui/Button';
import PageHeader from '../components/layout/PageHeader';
import ConfirmModal from '../components/ui/ConfirmModal';
import CleaningFlowModal from '../components/ui/CleaningFlowModal';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import {
  ChevronDown,
  ChevronRight,
  Search,
  ExternalLink,
  CheckSquare,
  Square,
  Sparkles,
  Code2,
  Terminal,
  RefreshCw,
  X,
  Radio,
  Layers,
  Moon,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import {
  RustIcon,
  FlutterIcon,
  GoIcon,
  NodeIcon,
  PythonIcon,
  XcodeIcon,
  JavaIcon,
  PhpIcon,
  DockerIcon,
  AiModelsIcon,
  RubyIcon,
  DotNetIcon,
  CppIcon,
  PackageCacheIcon,
} from '../components/icons/TechBrandIcons';
import { useState, useMemo, useEffect } from 'react';

const categoryIcons: Record<string, React.ReactNode> = {
  xcode_cache: <XcodeIcon size={18} className="text-accent" />,
  package_cache: <PackageCacheIcon size={18} className="text-accent" />,
  node_modules: <NodeIcon size={18} className="text-accent" />,
  cargo_target: <RustIcon size={18} className="text-accent" />,
  docker_volumes: <DockerIcon size={18} className="text-accent" />,
  flutter_cache: <FlutterIcon size={18} className="text-accent" />,
  golang_cache: <GoIcon size={18} className="text-accent" />,
  maven_cache: <JavaIcon size={18} className="text-accent" />,
  composer_cache: <PhpIcon size={18} className="text-accent" />,
  ai_models: <AiModelsIcon size={18} className="text-accent" />,
  ruby_cache: <RubyIcon size={18} className="text-accent" />,
  nuget_cache: <DotNetIcon size={18} className="text-accent" />,
  cpp_cache: <CppIcon size={18} className="text-accent" />,
  python_cache: <PythonIcon size={18} className="text-accent" />,
};

type SizeFilter = 'all' | '100mb' | '1gb';
type DevTab = 'artifacts' | 'ports' | 'xcode' | 'hibernate';

export default function DevWorkspace() {
  const { t } = useTranslation();
  const {
    devCategories,
    setDevCategories,
    isScanning,
    setIsScanning,
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

  const [activeTab, setActiveTab] = useState<DevTab>('artifacts');

  // Artifacts Tab State
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [cleanResult, setCleanResult] = useState<CleanResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCleaningFlow, setShowCleaningFlow] = useState(false);

  // Homebrew Pruner State
  const [isCleaningBrew, setIsCleaningBrew] = useState(false);
  const [brewOutput, setBrewOutput] = useState<string | null>(null);
  const [showBrewLog, setShowBrewLog] = useState(false);

  // Port Hunter State
  const [ports, setPorts] = useState<ListeningPort[]>([]);
  const [isLoadingPorts, setIsLoadingPorts] = useState(false);
  const [portSearch, setPortSearch] = useState('');
  const [killTarget, setKillTarget] = useState<ListeningPort | null>(null);
  const [isKillingPort, setIsKillingPort] = useState(false);
  const [portToast, setPortToast] = useState<string | null>(null);

  // Xcode Purger State
  const [xcodeReport, setXcodeReport] = useState<XcodeEnvironmentReport | null>(null);
  const [isLoadingXcode, setIsLoadingXcode] = useState(false);
  const [isPurgingSims, setIsPurgingSims] = useState(false);
  const [cleaningXcodeId, setCleaningXcodeId] = useState<string | null>(null);
  const [xcodeToast, setXcodeToast] = useState<string | null>(null);

  // Project Hibernate State
  const [dormantProjects, setDormantProjects] = useState<DormantProject[]>([]);
  const [isLoadingDormant, setIsLoadingDormant] = useState(false);
  const [dormantDays, setDormantDays] = useState<number>(30);
  const [dormantSearch, setDormantSearch] = useState('');
  const [hibernatingPath, setHibernatingPath] = useState<string | null>(null);
  const [hibernateToast, setHibernateToast] = useState<string | null>(null);

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

  // --- Handlers for Artifacts & Homebrew ---
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

  const handleBrewCleanup = async () => {
    setIsCleaningBrew(true);
    setBrewOutput(null);
    try {
      const res = await runBrewCleanup();
      setBrewOutput(
        res.trim() || t('devWorkspace.homebrewSuccess')
      );
      setShowBrewLog(true);
      await runScan();
    } catch (err: any) {
      setBrewOutput(t('devWorkspace.homebrewError', 'Failed to run brew cleanup: {error}', { error: String(err) }));
      setShowBrewLog(true);
    } finally {
      setIsCleaningBrew(false);
    }
  };

  const handleClean = async () => {
    if (selectedItems.length === 0) return;
    setShowConfirmModal(false);
    setShowCleaningFlow(true);
    setIsCleaning(true);

    try {
      const paths = selectedItems.map((item) => item.path);
      const result = await cleanSelectedItems(paths, false, deleteToTrash);
      setCleanResult(result);
      recordCleanResult(result.freedBytes, result.cleaned, false, [t('devWorkspace.title')]);
      await runScan();
    } catch (err) {
      console.error('Clean failed:', err);
    } finally {
      setIsCleaning(false);
    }
  };

  // --- Handlers for Port Hunter ---
  const fetchPorts = async () => {
    setIsLoadingPorts(true);
    try {
      const res = await listActivePorts();
      setPorts(res);
    } catch (err: any) {
      console.error('Failed to list ports:', err);
      setPortToast(`Error: ${err}`);
    } finally {
      setIsLoadingPorts(false);
    }
  };

  const executeKillPort = async () => {
    if (!killTarget) return;
    setIsKillingPort(true);
    try {
      const res = await killProcessByPid(killTarget.pid, true);
      setPortToast(res.message);
      setKillTarget(null);
      await fetchPorts();
    } catch (err: any) {
      setPortToast(`Failed: ${err}`);
    } finally {
      setIsKillingPort(false);
    }
  };

  // --- Handlers for Xcode Purger ---
  const fetchXcode = async () => {
    setIsLoadingXcode(true);
    try {
      const res = await scanXcodeEnvironments();
      setXcodeReport(res);
    } catch (err: any) {
      console.error('Failed to scan Xcode:', err);
    } finally {
      setIsLoadingXcode(false);
    }
  };

  const handlePurgeSimulators = async () => {
    setIsPurgingSims(true);
    try {
      const res = await purgeUnavailableSimulators();
      setXcodeToast(res.message);
      await fetchXcode();
    } catch (err: any) {
      setXcodeToast(`Failed to purge simulators: ${err}`);
    } finally {
      setIsPurgingSims(false);
    }
  };

  const handleCleanXcodeTarget = async (targetId: string) => {
    setCleaningXcodeId(targetId);
    try {
      const res = await cleanXcodeTarget(targetId);
      setXcodeToast(res.message);
      recordCleanResult(res.freedBytes, res.cleanedCount, false, ['Xcode & Simulators']);
      await fetchXcode();
    } catch (err: any) {
      setXcodeToast(`Failed to clean target: ${err}`);
    } finally {
      setCleaningXcodeId(null);
    }
  };

  // --- Handlers for Project Hibernate ---
  const fetchDormant = async (days = dormantDays) => {
    setIsLoadingDormant(true);
    try {
      const res = await scanDormantProjects(undefined, days);
      setDormantProjects(res);
    } catch (err: any) {
      console.error('Failed to scan dormant projects:', err);
    } finally {
      setIsLoadingDormant(false);
    }
  };

  const handleHibernate = async (project: DormantProject) => {
    setHibernatingPath(project.path);
    try {
      const artifactPaths = project.artifacts.map((a) => a.path);
      const res = await hibernateProject(project.path, artifactPaths);
      setHibernateToast(res.message);
      recordCleanResult(res.freed_bytes, res.removed_artifacts_count, false, ['Project Hibernate']);
      await fetchDormant(dormantDays);
    } catch (err: any) {
      setHibernateToast(`Failed to hibernate: ${err}`);
    } finally {
      setHibernatingPath(null);
    }
  };

  // Initial & Tab-switch data fetching
  useEffect(() => {
    if (devCategories.length === 0) {
      runScan();
    }
  }, [globalRefreshTrigger]);

  useEffect(() => {
    if (activeTab === 'ports' && ports.length === 0) {
      fetchPorts();
    } else if (activeTab === 'xcode' && !xcodeReport) {
      fetchXcode();
    } else if (activeTab === 'hibernate' && dormantProjects.length === 0) {
      fetchDormant(dormantDays);
    }
  }, [activeTab]);

  // Filtered Artifacts
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

  // Filtered Ports
  const filteredPorts = useMemo(() => {
    const q = portSearch.toLowerCase().trim();
    if (!q) return ports;
    return ports.filter(
      (p) =>
        p.port.toString().includes(q) ||
        p.process_name.toLowerCase().includes(q) ||
        p.pid.toString().includes(q) ||
        p.user.toLowerCase().includes(q)
    );
  }, [ports, portSearch]);

  // Filtered Dormant Projects
  const filteredDormant = useMemo(() => {
    const q = dormantSearch.toLowerCase().trim();
    if (!q) return dormantProjects;
    return dormantProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.path.toLowerCase().includes(q) ||
        p.last_commit_subject.toLowerCase().includes(q)
    );
  }, [dormantProjects, dormantSearch]);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <PageHeader
        icon={<Code2 size={20} />}
        iconColor="text-accent"
        title={t('devWorkspace.title')}
        subtitle={t('devWorkspace.subtitle')}
        badge={
          totalItemsCount > 0 ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent-subtle text-accent">
              {t('devWorkspace.itemsCount', '{count} items', { count: totalItemsCount })}
            </span>
          ) : undefined
        }
      />

      {/* Segmented Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('artifacts')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'artifacts'
              ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
          }`}
        >
          <Layers size={14} />
          <span>{t('devWorkspace.tabArtifacts', 'Build & Caches')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ports')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'ports'
              ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
          }`}
        >
          <Radio size={14} className="text-accent" />
          <span>{t('devWorkspace.tabPorts', 'Zombie Port Hunter')}</span>
          {ports.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-accent-subtle text-accent font-mono">
              {ports.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('xcode')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'xcode'
              ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
          }`}
        >
          <XcodeIcon size={14} />
          <span>{t('devWorkspace.tabXcode', 'Xcode & Simulators')}</span>
          {xcodeReport && xcodeReport.unavailable_simulators_count > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono">
              {xcodeReport.unavailable_simulators_count}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hibernate')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'hibernate'
              ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
          }`}
        >
          <Moon size={14} className="text-amber-500" />
          <span>{t('devWorkspace.tabHibernate', 'Project Hibernate')}</span>
          {dormantProjects.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
              {dormantProjects.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BUILD ARTIFACTS & TECH STACKS */}
      {/* ========================================================================= */}
      {activeTab === 'artifacts' && (
        <div className="space-y-6">
          {/* Homebrew & Global Tooling Hygiene Card */}
          <Card className="p-4! border-accent/20 bg-accent-subtle">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-accent-subtle border border-accent/20 flex items-center justify-center shrink-0">
                  <Terminal size={18} className="text-accent" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {t('devWorkspace.homebrewTitle')}
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-accent-subtle text-accent border border-accent/20">
                      brew cleanup --prune=all
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                    {t('devWorkspace.homebrewDesc')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {brewOutput && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBrewLog(!showBrewLog)}
                    className="text-xs"
                  >
                    {showBrewLog ? t('devWorkspace.homebrewCloseLog') : t('devWorkspace.homebrewShowLog')}
                  </Button>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isCleaningBrew}
                  onClick={handleBrewCleanup}
                  className="flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={isCleaningBrew ? 'animate-spin' : ''} />
                  <span>{isCleaningBrew ? t('devWorkspace.homebrewCleaning') : t('devWorkspace.homebrewPruneBtn')}</span>
                </Button>
              </div>
            </div>

            {brewOutput && showBrewLog && (
              <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5">
                <div className="flex items-center justify-between mb-1.5 text-[11px] text-slate-400">
                  <span>{t('devWorkspace.homebrewOutputTitle')}</span>
                  <button
                    type="button"
                    onClick={() => setShowBrewLog(false)}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 text-[11px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border border-white/10">
                  {brewOutput}
                </pre>
              </div>
            )}
          </Card>

          {/* Search, Filter & Bulk Select Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/40 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5 backdrop-blur-md">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('devWorkspace.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-white/60 dark:bg-neutral-900/60 border border-black/8 dark:border-white/8 focus:border-accent focus:outline-none transition-all placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                {(['all', '100mb', '1gb'] as SizeFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSizeFilter(f)}
                    className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition-all cursor-pointer ${
                      sizeFilter === f
                        ? 'bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                        : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
                    }`}
                  >
                    {f === 'all'
                      ? t('devWorkspace.filterAll')
                      : f === '100mb'
                      ? t('devWorkspace.filter100mb')
                      : t('devWorkspace.filter1gb')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectAll('dev', !allItemsSelected)}
                disabled={totalItemsCount === 0 || isScanning}
                className="flex items-center gap-1.5 text-xs"
              >
                {allItemsSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                <span>{allItemsSelected ? t('common.deselectAll') : t('common.selectAll')}</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={runScan}
                disabled={isScanning}
                className="flex items-center gap-1.5 text-xs"
              >
                <RefreshCw size={13} className={isScanning ? 'animate-spin' : ''} />
                <span>{t('devWorkspace.scanButton')}</span>
              </Button>
            </div>
          </div>

          {/* Clean Confirmation Bar */}
          {cleanResult && !isCleaning && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-emerald-900 dark:text-emerald-300">
                    {t('common.cleanupComplete')}
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    {t('common.freedSpace', { size: formatSize(cleanResult.freedBytes) })} &bull;{' '}
                    {cleanResult.cleaned} {t('common.itemsCleaned')}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCleanResult(null)} className="text-emerald-700">
                {t('common.dismiss')}
              </Button>
            </div>
          )}

          {/* Skeleton Loaders */}
          {isScanning && devCategories.length === 0 && (
            <div className="space-y-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          )}

          {/* Empty State */}
          {!isScanning && filteredCategories.length === 0 && (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-accent-subtle flex items-center justify-center text-accent">
                  <Sparkles size={24} />
                </div>
                <h3 className="font-semibold text-sm text-slate-800 dark:text-neutral-200">
                  {searchQuery ? t('devWorkspace.emptySearch') : t('devWorkspace.emptyClean')}
                </h3>
              </div>
            </Card>
          )}

          {/* Categories Accordion List */}
          <div className="space-y-4">
            {filteredCategories.map((category) => {
              const isExpanded = expandedCategories.has(category.id);
              const isAllCatSelected = category.items.length > 0 && category.items.every((i) => i.selected);
              const isSomeCatSelected = category.items.some((i) => i.selected);

              return (
                <Card key={category.id} className="overflow-hidden border-black/5 dark:border-white/5 transition-all">
                  <div className="p-3.5 flex items-center justify-between gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <Checkbox
                        checked={isAllCatSelected}
                        indeterminate={isSomeCatSelected && !isAllCatSelected}
                        onChange={() => toggleCategorySelection('dev', category.id)}
                      />

                      <div className="flex items-center gap-2.5 min-w-0 cursor-pointer" onClick={() => toggleExpand(category.id)}>
                        <div className="p-1.5 rounded-lg bg-accent-subtle text-accent border border-accent/15">
                          {categoryIcons[category.id] || <Code2 size={16} />}
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs font-semibold text-slate-800 dark:text-neutral-200 truncate">
                            {category.name}
                          </h4>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {category.items.length} {t('common.items')} &bull; {formatSize(category.size)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleExpand(category.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5 bg-black/[0.01] dark:bg-white/[0.01]">
                      {category.items.map((item) => (
                        <div
                          key={item.id}
                          className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Checkbox
                              checked={item.selected}
                              onChange={() => toggleItemSelection('dev', category.id, item.id)}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-700 dark:text-neutral-200 truncate">
                                {item.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono truncate">{item.path}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-mono font-medium text-slate-500 dark:text-neutral-400">
                              {formatSize(item.size)}
                            </span>
                            <button
                              type="button"
                              onClick={() => revealInFinder(item.path)}
                              title={t('common.revealInFinder')}
                              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                            >
                              <ExternalLink size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ZOMBIE PORT HUNTER & PROCESS KILLER */}
      {/* ========================================================================= */}
      {activeTab === 'ports' && (
        <div className="space-y-4">
          {portToast && (
            <div className="p-3 rounded-xl bg-accent-subtle border border-accent/20 text-accent text-xs flex items-center justify-between">
              <span>{portToast}</span>
              <button type="button" onClick={() => setPortToast(null)} className="cursor-pointer">
                <X size={12} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/40 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5 backdrop-blur-md">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('devWorkspace.portsPlaceholder')}
                value={portSearch}
                onChange={(e) => setPortSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-white/60 dark:bg-neutral-900/60 border border-black/8 dark:border-white/8 focus:border-accent focus:outline-none transition-all placeholder:text-slate-400"
              />
              {portSearch && (
                <button
                  type="button"
                  onClick={() => setPortSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={fetchPorts}
              disabled={isLoadingPorts}
              className="flex items-center gap-1.5 text-xs"
            >
              <RefreshCw size={13} className={isLoadingPorts ? 'animate-spin' : ''} />
              <span>{t('devWorkspace.portsRefresh', 'Refresh Ports')}</span>
            </Button>
          </div>

          {isLoadingPorts && ports.length === 0 ? (
            <div className="space-y-2">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : filteredPorts.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-accent-subtle flex items-center justify-center text-accent">
                  <Radio size={20} />
                </div>
                <h4 className="text-xs font-semibold text-slate-800 dark:text-neutral-200">
                  {t('devWorkspace.portsEmpty', 'No active listening TCP ports detected')}
                </h4>
              </div>
            </Card>
          ) : (
            <div className="rounded-2xl border border-black/8 dark:border-white/8 overflow-hidden bg-white/40 dark:bg-neutral-800/40 backdrop-blur-md">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-slate-400 font-medium text-[11px]">
                    <th className="py-2.5 px-4 font-mono">{t('devWorkspace.portsColPort')}</th>
                    <th className="py-2.5 px-4">{t('devWorkspace.portsColProcess')}</th>
                    <th className="py-2.5 px-4">{t('devWorkspace.portsColAddress')}</th>
                    <th className="py-2.5 px-4">{t('devWorkspace.portsColUser')}</th>
                    <th className="py-2.5 px-4 text-right">{t('devWorkspace.portsColAction')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {filteredPorts.map((p) => (
                    <tr
                      key={`${p.port}-${p.pid}`}
                      className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono font-bold text-accent">
                        :{p.port}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 dark:text-neutral-200">
                            {p.process_name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 text-slate-500 dark:text-neutral-400">
                            PID {p.pid}
                          </span>
                          {p.memory_bytes > 0 && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({formatSize(p.memory_bytes)})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 dark:text-neutral-400">
                        {p.address}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-neutral-300">{p.user}</td>
                      <td className="py-2.5 px-4 text-right">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setKillTarget(p)}
                          className="text-[11px] py-1 px-2.5 rounded-lg"
                        >
                          {t('devWorkspace.portsKillBtn')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Kill Port Modal */}
          {killTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
              <div className="w-full max-w-sm p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 shadow-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t('devWorkspace.portsKillConfirmTitle', 'Terminate {name} (PID {pid})?', {
                        name: killTarget.process_name,
                        pid: killTarget.pid,
                      })}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono">
                      PID: {killTarget.pid} &bull; Port :{killTarget.port}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-neutral-300">
                  {t('devWorkspace.portsKillConfirmDesc', 'This will send a force termination signal (SIGKILL) to free port :{port}. Unsaved state in this process will be lost.', {
                    port: killTarget.port,
                  })}
                </p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setKillTarget(null)}
                    disabled={isKillingPort}
                  >
                    {t('devWorkspace.portsCancel')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={executeKillPort}
                    disabled={isKillingPort}
                  >
                    {isKillingPort ? t('devWorkspace.portsKilling') : t('devWorkspace.portsKillSubmit')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: XCODE & SIMULATOR DEEP PURGER */}
      {/* ========================================================================= */}
      {activeTab === 'xcode' && (
        <div className="space-y-4">
          {xcodeToast && (
            <div className="p-3 rounded-xl bg-accent-subtle border border-accent/20 text-accent text-xs flex items-center justify-between">
              <span>{xcodeToast}</span>
              <button type="button" onClick={() => setXcodeToast(null)} className="cursor-pointer">
                <X size={12} />
              </button>
            </div>
          )}

          {/* Unavailable Simulators Banner */}
          {xcodeReport && xcodeReport.unavailable_simulators_count > 0 && (
            <Card className="p-4! border-rose-500/20 bg-rose-500/[0.04]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {t('devWorkspace.xcodeUnavailableBadge', '{count} Unavailable Simulators Detected', {
                        count: xcodeReport.unavailable_simulators_count,
                      })}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                      {t('devWorkspace.xcodeUnavailableDesc')}
                    </p>
                  </div>
                </div>

                <Button
                  variant="danger"
                  size="sm"
                  disabled={isPurgingSims}
                  onClick={handlePurgeSimulators}
                  className="shrink-0 flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={isPurgingSims ? 'animate-spin' : ''} />
                  <span>{isPurgingSims ? t('devWorkspace.xcodePurgingSims') : t('devWorkspace.xcodePurgeSimsBtn')}</span>
                </Button>
              </div>
            </Card>
          )}

          {/* Target Items Grid */}
          {isLoadingXcode && !xcodeReport ? (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {xcodeReport?.targets.map((target) => (
                <Card key={target.id} className="p-4 flex flex-col justify-between space-y-3 border-black/8 dark:border-white/8">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                        {target.title}
                      </h4>
                      <span className="text-xs font-mono font-bold text-accent">
                        {formatSize(target.size_bytes)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1">
                      {target.description}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-2 truncate">{target.path}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                    <span className="text-[10px] text-slate-400">
                      {target.is_safe ? t('devWorkspace.xcodeSafeBadge') : t('devWorkspace.xcodeDiscretionBadge')}
                    </span>
                    <Button
                      variant={target.is_safe ? 'secondary' : 'ghost'}
                      size="sm"
                      disabled={target.size_bytes === 0 || cleaningXcodeId === target.id}
                      onClick={() => handleCleanXcodeTarget(target.id)}
                      className="text-xs"
                    >
                      {cleaningXcodeId === target.id ? t('devWorkspace.xcodeCleaning') : t('devWorkspace.xcodeCleanTargetBtn')}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DORMANT PROJECTS HIBERNATE */}
      {/* ========================================================================= */}
      {activeTab === 'hibernate' && (
        <div className="space-y-4">
          {hibernateToast && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between">
              <span>{hibernateToast}</span>
              <button type="button" onClick={() => setHibernateToast(null)} className="cursor-pointer">
                <X size={12} />
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/40 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5 backdrop-blur-md">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('devWorkspace.hibernatePlaceholder')}
                value={dormantSearch}
                onChange={(e) => setDormantSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-white/60 dark:bg-neutral-900/60 border border-black/8 dark:border-white/8 focus:border-amber-500 focus:outline-none transition-all placeholder:text-slate-400"
              />
              {dormantSearch && (
                <button
                  type="button"
                  onClick={() => setDormantSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
              {[30, 90, 180].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDormantDays(d);
                    fetchDormant(d);
                  }}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition-all cursor-pointer ${
                    dormantDays === d
                      ? 'bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
                  }`}
                >
                  {t('devWorkspace.thresholdDays', '> {days} Days', { days: d })}
                </button>
              ))}
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchDormant(dormantDays)}
              disabled={isLoadingDormant}
              className="flex items-center gap-1.5 text-xs"
            >
              <RefreshCw size={13} className={isLoadingDormant ? 'animate-spin' : ''} />
              <span>{isLoadingDormant ? t('devWorkspace.hibernateScanning') : t('devWorkspace.hibernateScanBtn')}</span>
            </Button>
          </div>

          {isLoadingDormant && dormantProjects.length === 0 ? (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : filteredDormant.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-accent-subtle flex items-center justify-center text-accent">
                  <CheckCircle2 size={20} />
                </div>
                <h4 className="text-xs font-semibold text-slate-800 dark:text-neutral-200">
                  {t('devWorkspace.hibernateEmptyTitle')}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                  {t('devWorkspace.hibernateEmptyDesc')}
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredDormant.map((proj) => (
                <Card key={proj.path} className="p-4 border-black/8 dark:border-white/8">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-neutral-100 truncate">
                          {proj.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-black/5 dark:bg-white/8 text-slate-600 dark:text-neutral-300 border border-black/5 dark:border-white/5">
                          {t('devWorkspace.hibernateDaysAgo', '{days} days ago', { days: proj.inactive_days })}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{proj.path}</p>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 italic truncate">
                        "{proj.last_commit_subject}"
                      </p>

                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {proj.artifacts.map((a) => (
                          <span
                            key={a.name}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 text-slate-600 dark:text-neutral-300 border border-black/5 dark:border-white/5"
                          >
                            {a.name} ({formatSize(a.size_bytes)})
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0 self-end sm:self-center">
                      <span className="text-xs font-mono font-bold text-accent">
                        {formatSize(proj.total_reclaimable_bytes)}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={hibernatingPath === proj.path}
                        onClick={() => handleHibernate(proj)}
                        className="text-xs flex items-center gap-1.5"
                      >
                        <Moon size={12} className={hibernatingPath === proj.path ? 'animate-spin' : ''} />
                        <span>{hibernatingPath === proj.path ? t('devWorkspace.hibernateActionActive') : t('devWorkspace.hibernateActionBtn')}</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Artifacts */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleClean}
        title={t('confirmModal.title')}
        itemsCount={selectedItems.length}
        totalBytes={selectedSize}
        paths={selectedItems.map((i) => i.path)}
        useTrash={deleteToTrash}
      />

      {/* Animated Flow Modal */}
      <CleaningFlowModal
        isOpen={showCleaningFlow}
        onClose={() => setShowCleaningFlow(false)}
        isCleaning={isCleaning}
        totalItems={cleanResult?.cleaned || selectedItems.length}
        totalBytes={cleanResult?.freedBytes || selectedSize}
        paths={selectedItems.map((i) => i.path)}
      />
    </div>
  );
}
