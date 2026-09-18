import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../store/appStore';
import { useTranslation } from '../lib/i18n';
import { getDiskInfoByMount, scanSystemDirectories, scanDevWorkspaces, cleanSelectedItems } from '../lib/commands';
import type { CleanResult } from '../lib/commands';
import { formatSize } from '../lib/utils';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import PageHeader from '../components/layout/PageHeader';
import ConfirmModal from '../components/ui/ConfirmModal';
import CleaningFlowModal from '../components/ui/CleaningFlowModal';
import StorageBreakdownBar from '../components/ui/StorageBreakdownBar';
import HealthGauge from '../components/ui/HealthGauge';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import {
  Sparkles,
  Code2,
  ArrowRight,
  Award,
  History,
  Clock,
  CheckCircle2,
  FolderTree,
  Zap,
  Eye,
  Layers,
  Trash2,
  LayoutDashboard,
  HardDrive,
  Usb,
} from 'lucide-react';

export default function Dashboard() {
  const { t } = useTranslation();
  const {
    diskInfo,
    setDiskInfo,
    selectedDiskMount,
    availableDisks,
    refreshDisks,
    systemCategories,
    devCategories,
    setSystemCategories,
    setDevCategories,
    isScanning,
    setIsScanning,
    isCleaning,
    setIsCleaning,
    setCurrentPage,
    lifetimeBytesFreed,
    cleanHistory,
    recordCleanResult,
    deleteToTrash,
    globalRefreshTrigger,
  } = useAppStore();

  const [quickCleanResult, setQuickCleanResult] = useState<CleanResult | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCleaningFlow, setShowCleaningFlow] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const activeDisk = availableDisks.find((d) => d.mountPoint === selectedDiskMount);

  const totalSystemJunk = systemCategories.reduce((acc, cat) => acc + cat.size, 0);
  const totalDevJunk = devCategories.reduce((acc, cat) => acc + cat.size, 0);
  const totalCleanable = totalSystemJunk + totalDevJunk;
  const totalItemsCount =
    systemCategories.reduce((a, c) => a + c.items.length, 0) +
    devCategories.reduce((a, c) => a + c.items.length, 0);
  const totalRecycledItems = cleanHistory.reduce((acc, entry) => acc + (entry.itemsCount || 0), 0);

  // Collect safe paths for Smart Clean
  const safePaths: string[] = [];
  systemCategories.forEach((cat) => {
    cat.items.forEach((item) => safePaths.push(item.path));
  });
  devCategories.forEach((cat) => {
    if (cat.id === 'package_cache' || cat.id === 'xcode_cache') {
      cat.items.forEach((item) => safePaths.push(item.path));
    }
  });

  const runFullScan = async () => {
    setIsScanning(true);
    setQuickCleanResult(null);
    try {
      const [disk, system, dev] = await Promise.all([
        getDiskInfoByMount(selectedDiskMount),
        scanSystemDirectories(),
        scanDevWorkspaces(),
      ]);
      setDiskInfo(disk);
      setSystemCategories(system);
      setDevCategories(dev);
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSmartCleanClick = () => {
    if (safePaths.length === 0) return;
    setShowConfirmModal(true);
  };

  const executeSmartClean = async () => {
    if (safePaths.length === 0) return;

    setShowConfirmModal(false);
    setShowCleaningFlow(true);
    setIsCleaning(true);
    try {
      const result = await cleanSelectedItems(safePaths, false, deleteToTrash);
      setQuickCleanResult(result);
      recordCleanResult(result.freedBytes, safePaths.length, false, ['System Caches', 'Package Caches']);
      await runFullScan();
    } catch (err) {
      console.error('Smart clean failed:', err);
    } finally {
      setIsCleaning(false);
    }
  };

  useEffect(() => {
    refreshDisks();
    runFullScan();
  }, [selectedDiskMount, globalRefreshTrigger]);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Action & Overview Bar */}
      <PageHeader
        icon={<LayoutDashboard size={20} />}
        iconBgColor="bg-blue-500/10 text-blue-600 dark:text-blue-400"
        title={t('dashboard.title')}
        subtitle={
          isScanning
            ? t('dashboard.scanningDesc')
            : totalCleanable > 0
            ? t('dashboard.detectedDesc', { size: formatSize(totalCleanable), count: totalItemsCount })
            : t('dashboard.peakConditionDesc')
        }
        actions={
          <>
            {cleanHistory.length > 0 && (
              <Button
                onClick={() => setShowHistoryModal(true)}
                variant="secondary"
                size="sm"
                icon={<History size={14} />}
              >
                {t('common.history')}
              </Button>
            )}

            {totalCleanable > 0 && !isScanning && (
              <Button
                onClick={handleSmartCleanClick}
                loading={isCleaning}
                variant="danger"
                size="sm"
                icon={<Zap size={14} />}
              >
                {t('dashboard.smartClean')} ({formatSize(totalCleanable)})
              </Button>
            )}
          </>
        }
      />

      {/* Active Storage Drive Banner */}
      {diskInfo && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl glass-panel border border-black/4 dark:border-white/6">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                activeDisk?.isRemovable ? 'bg-amber-500/15 text-amber-500' : 'bg-blue-500/15 text-blue-500'
              }`}
            >
              {activeDisk?.isRemovable ? <Usb size={18} /> : <HardDrive size={18} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {diskInfo.diskName || activeDisk?.name || 'Macintosh HD'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-black/5 dark:bg-white/8 text-slate-600 dark:text-neutral-400 font-mono">
                  {selectedDiskMount}
                </span>
                {activeDisk?.isRemovable && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    USB / Flashdisk
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-0.5">
                {formatSize(diskInfo.freeSpace)} {t('common.free', 'free')} / {formatSize(diskInfo.totalSpace)} {t('drive.capacity', 'capacity')}
              </p>
            </div>
          </div>

          {activeDisk?.isRemovable && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setCurrentPage('quick-review')}
              icon={<Eye size={12} />}
            >
              {t('dashboard.exploreDrive', 'Explore Files')}
            </Button>
          )}
        </div>
      )}

      {/* Storage Breakdown Multi-color Bar (macOS System Settings Style) */}
      {diskInfo && (
        <StorageBreakdownBar
          totalSpace={diskInfo.totalSpace}
          usedSpace={diskInfo.usedSpace}
          freeSpace={diskInfo.freeSpace}
          systemJunkSize={totalSystemJunk}
          devJunkSize={totalDevJunk}
        />
      )}

      {/* Health Gauge & Lifetime Stat */}
      {diskInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HealthGauge
            freeSpace={diskInfo.freeSpace}
            totalSpace={diskInfo.totalSpace}
            cleanableJunk={totalCleanable}
          />

          {/* Cumulative Impact Stats Card */}
          <div className="p-5 rounded-2xl glass-panel">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400 shadow-xs">
                  <Award size={22} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-neutral-200">
                    {t('impact.title', 'Cumulative Clean Impact')}
                  </h4>
                  <p className="text-[11px] text-slate-400 dark:text-neutral-500">
                    {t('impact.subtitle', 'Total lifetime storage and system resources recovered by Beberes')}
                  </p>
                </div>
              </div>

              {cleanHistory.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowHistoryModal(true)}
                  icon={<History size={13} />}
                >
                  {t('common.history')}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3.5 border-t border-black/5 dark:border-white/5">
              <div className="p-3 rounded-xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/6">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                  {t('impact.storageFreed', 'Total Storage Rescued')}
                </span>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  {formatSize(lifetimeBytesFreed)}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/6">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                  {t('impact.cleanCycles', 'Clean Cycles Run')}
                </span>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {cleanHistory.length}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/6">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                  {t('impact.recycledItems', 'Files Processed')}
                </span>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                  {totalRecycledItems.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Cards Grid */}
      {isScanning ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Quick Review Card */}
          <Card hoverable onClick={() => setCurrentPage('quick-review')}>
            <CardBody>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Eye size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t('nav.quickReview')}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">
                      Fast Keyboard Triage
                    </p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-300 dark:text-neutral-600 mt-1" />
              </div>
              <p className="mt-4 text-xs text-slate-500 dark:text-neutral-400">
                {t('dashboard.quickReviewDesc', 'Review and clean files one by one with fast keyboard shortcuts')}
              </p>
            </CardBody>
          </Card>

          {/* Large & Duplicate Files Card */}
          <Card hoverable onClick={() => setCurrentPage('large-duplicates')}>
            <CardBody>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t('nav.largeDuplicates', 'Large & Duplicates')}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">
                      Hunt Big & Cloned Files
                    </p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-300 dark:text-neutral-600 mt-1" />
              </div>
              <p className="mt-4 text-xs text-slate-500 dark:text-neutral-400">
                {t('dashboard.largeDuplicatesDesc', 'Find files over 100MB, duplicate copies, and files untouched for months')}
              </p>
            </CardBody>
          </Card>

          {/* macOS Trash Manager Card */}
          <Card hoverable onClick={() => setCurrentPage('trash-manager')}>
            <CardBody>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t('nav.trashManager', 'Trash Manager')}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">
                      macOS Bin Inspector
                    </p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-300 dark:text-neutral-600 mt-1" />
              </div>
              <p className="mt-4 text-xs text-slate-500 dark:text-neutral-400">
                {t('dashboard.trashManagerDesc', 'Inspect items sitting in macOS Trash and empty them safely')}
              </p>
            </CardBody>
          </Card>

          {/* Tidy Up Card */}
          <Card hoverable onClick={() => setCurrentPage('tidy-up')}>
            <CardBody>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <FolderTree size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t('nav.tidyUp')}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">
                      Desktop & Downloads
                    </p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-300 dark:text-neutral-600 mt-1" />
              </div>
              <p className="mt-4 text-xs text-slate-500 dark:text-neutral-400">
                {t('dashboard.tidyUpDesc')}
              </p>
            </CardBody>
          </Card>

          {/* System Clean Card */}
          <Card hoverable onClick={() => setCurrentPage('system-clean')}>
            <CardBody>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t('nav.systemClean')}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">
                      {systemCategories.length} categories found
                    </p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-300 dark:text-neutral-600 mt-1" />
              </div>
              {totalSystemJunk > 0 ? (
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${Math.min((totalSystemJunk / (totalCleanable || 1)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-rose-500">
                    {formatSize(totalSystemJunk)}
                  </span>
                </div>
              ) : (
                <p className="mt-4 text-xs text-slate-400">System caches are clean.</p>
              )}
            </CardBody>
          </Card>

          {/* Dev Workspace Card */}
          <Card hoverable onClick={() => setCurrentPage('dev-workspace')}>
            <CardBody>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <Code2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t('nav.devWorkspace')}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">
                      {devCategories.length} categories
                    </p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-300 dark:text-neutral-600 mt-1" />
              </div>
              {totalDevJunk > 0 ? (
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full"
                      style={{
                        width: `${Math.min((totalDevJunk / (totalCleanable || 1)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-rose-500">
                    {formatSize(totalDevJunk)}
                  </span>
                </div>
              ) : (
                <p className="mt-4 text-xs text-slate-400">{t('devWorkspace.emptyClean')}</p>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Confirmation Modal before Smart Clean */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={executeSmartClean}
        isLoading={isCleaning}
        title={t('dashboard.smartClean')}
        itemsCount={safePaths.length}
        totalBytes={totalCleanable}
        paths={safePaths}
        useTrash={deleteToTrash}
      />

      {/* Interactive Cleaning Flow Modal */}
      <CleaningFlowModal
        isOpen={showCleaningFlow}
        onClose={() => setShowCleaningFlow(false)}
        isCleaning={isCleaning}
        isDryRun={false}
        totalBytes={quickCleanResult?.freedBytes || totalCleanable}
        totalItems={quickCleanResult?.cleaned || safePaths.length}
        paths={safePaths}
        title={t('dashboard.smartClean')}
      />

      {/* Clean History Modal (Zero Emojis) */}
      {showHistoryModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              onClick={() => setShowHistoryModal(false)}
            />
            <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-800 p-6 shadow-2xl border border-slate-200 dark:border-neutral-700 overflow-hidden animate-scale-in z-10">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-neutral-700/60">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                    <History size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {t('dashboard.historyModalTitle')}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-neutral-400">
                      {t('dashboard.historyModalSubtitle')}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setShowHistoryModal(false)}>
                  {t('common.close')}
                </Button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-neutral-700/60 mt-3">
                {cleanHistory.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-400 dark:text-neutral-500">
                    {t('dashboard.noHistory')}
                  </p>
                ) : (
                  cleanHistory.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-white">
                            {t('dashboard.freed')} {formatSize(item.freedBytes)}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5 font-mono">
                            <Clock size={11} />
                            {new Date(item.timestamp).toLocaleString()} • {item.itemsCount} {t('dashboard.items')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
