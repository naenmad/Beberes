import { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { getDiskInfo, scanSystemDirectories, scanDevWorkspaces, cleanSelectedItems } from '../lib/commands';
import type { CleanResult } from '../lib/commands';
import { formatSize } from '../lib/utils';
import Card, { CardBody } from '../components/ui/Card';
import StorageRing from '../components/ui/StorageRing';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import {
  HardDrive,
  Trash2,
  FolderOpen,
  Sparkles,
  Code2,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  Zap,
  Award,
  History,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export default function Dashboard() {
  const {
    diskInfo,
    setDiskInfo,
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
  } = useAppStore();

  const [quickCleanResult, setQuickCleanResult] = useState<CleanResult | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const totalSystemJunk = systemCategories.reduce((acc, cat) => acc + cat.size, 0);
  const totalDevJunk = devCategories.reduce((acc, cat) => acc + cat.size, 0);
  const totalCleanable = totalSystemJunk + totalDevJunk;
  const totalItemsCount =
    systemCategories.reduce((a, c) => a + c.items.length, 0) +
    devCategories.reduce((a, c) => a + c.items.length, 0);

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
        getDiskInfo(),
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

    setIsCleaning(true);
    try {
      const result = await cleanSelectedItems(safePaths, false);
      setQuickCleanResult(result);
      recordCleanResult(result.freedBytes, safePaths.length, false, ['System Caches', 'Package Caches']);
      setShowConfirmModal(false);
      await runFullScan();
    } catch (err) {
      console.error('Smart clean failed:', err);
    } finally {
      setIsCleaning(false);
    }
  };

  useEffect(() => {
    if (!diskInfo) {
      runFullScan();
    }
  }, []);

  const statCards = [
    {
      icon: <HardDrive size={20} />,
      label: 'Total Storage',
      value: diskInfo ? formatSize(diskInfo.totalSpace) : '--',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-500/10',
    },
    {
      icon: <FolderOpen size={20} />,
      label: 'Used Space',
      value: diskInfo ? formatSize(diskInfo.usedSpace) : '--',
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-500/10',
    },
    {
      icon: <ShieldCheck size={20} />,
      label: 'Free Space',
      value: diskInfo ? formatSize(diskInfo.freeSpace) : '--',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      icon: <Trash2 size={20} />,
      label: 'Cleanable Junk',
      value: formatSize(totalCleanable),
      color: 'text-rose-500',
      bgColor: 'bg-rose-50 dark:bg-rose-500/10',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
            System Overview
          </h2>
          <p className="text-sm text-slate-500 dark:text-neutral-400">
            {isScanning
              ? 'Analyzing system & developer directories...'
              : totalCleanable > 0
              ? `Identified ${formatSize(totalCleanable)} across ${totalItemsCount} cleanable items`
              : 'Scan completed. Your system is in optimal condition!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cleanHistory.length > 0 && (
            <Button
              onClick={() => setShowHistoryModal(true)}
              variant="secondary"
              icon={<History size={16} />}
            >
              History
            </Button>
          )}
          {totalCleanable > 0 && !isScanning && (
            <Button
              onClick={handleSmartCleanClick}
              loading={isCleaning}
              variant="danger"
              icon={<Zap size={16} />}
            >
              Smart Clean ({formatSize(totalCleanable)})
            </Button>
          )}
          <Button
            onClick={runFullScan}
            loading={isScanning}
            icon={<RefreshCw size={16} />}
            variant="secondary"
          >
            {isScanning ? 'Scanning...' : 'Full Scan'}
          </Button>
        </div>
      </div>

      {/* Quick Clean Celebration Banner */}
      {quickCleanResult && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                🎉 Smart Clean Completed! Reclaimed {formatSize(quickCleanResult.freedBytes)}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Cleaned {quickCleanResult.cleaned} items safely from your system.
              </p>
            </div>
          </div>
          <button
            onClick={() => setQuickCleanResult(null)}
            className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Lifetime Space Reclaimed Badge */}
      {lifetimeBytesFreed > 0 && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-emerald-500/10 border border-blue-200/50 dark:border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500 text-white shadow-xs">
              <Award size={18} />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">
                Lifetime Space Reclaimed with Beberes
              </span>
              <p className="text-base font-bold text-slate-800 dark:text-white">
                {formatSize(lifetimeBytesFreed)}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowHistoryModal(true)}
            icon={<History size={14} />}
          >
            {cleanHistory.length} clean sessions
          </Button>
        </div>
      )}

      {/* Storage Overview Ring */}
      {diskInfo && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <StorageRing
              used={diskInfo.usedSpace}
              total={diskInfo.totalSpace}
              size={120}
              strokeWidth={10}
            />
            <div className="flex-1 w-full">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">
                Storage Status
              </h3>
              <p className="text-sm text-slate-500 dark:text-neutral-400 mb-4">
                {diskInfo.diskName} — {formatSize(diskInfo.freeSpace)} available
              </p>
              <div className="grid grid-cols-2 gap-3">
                {statCards.map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <span className={stat.color}>{stat.icon}</span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 dark:text-neutral-500">
                        {stat.label}
                      </p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Category Quick Access */}
      {isScanning ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* System Clean Card */}
          <Card hoverable onClick={() => setCurrentPage('system-clean')}>
            <CardBody>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10">
                    <Sparkles size={22} className="text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                      System Clean
                    </h3>
                    <p className="text-sm text-slate-400 dark:text-neutral-500 mt-0.5">
                      {systemCategories.length} categories found
                    </p>
                  </div>
                </div>
                <ArrowRight
                  size={18}
                  className="text-slate-300 dark:text-neutral-600 mt-1"
                />
              </div>
              {totalSystemJunk > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          (totalSystemJunk / (totalCleanable || 1)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-rose-500">
                    {formatSize(totalSystemJunk)}
                  </span>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Dev Workspace Card */}
          <Card hoverable onClick={() => setCurrentPage('dev-workspace')}>
            <CardBody>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-500/10">
                    <Code2 size={22} className="text-violet-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                      Dev Workspace
                    </h3>
                    <p className="text-sm text-slate-400 dark:text-neutral-500 mt-0.5">
                      {devCategories.length} categories found
                    </p>
                  </div>
                </div>
                <ArrowRight
                  size={18}
                  className="text-slate-300 dark:text-neutral-600 mt-1"
                />
              </div>
              {totalDevJunk > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          (totalDevJunk / (totalCleanable || 1)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-rose-500">
                    {formatSize(totalDevJunk)}
                  </span>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Confirmation Modal for Smart Clean */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={executeSmartClean}
        isLoading={isCleaning}
        title="Confirm Smart Cleanup"
        itemsCount={safePaths.length}
        totalBytes={totalCleanable}
        paths={safePaths}
        isDryRun={false}
      />

      {/* Clean History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setShowHistoryModal(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 shadow-2xl p-6 overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-neutral-700/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-500">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                    Clean History
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-neutral-400">
                    Past cleanup sessions on this device
                  </p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowHistoryModal(false)}>
                Close
              </Button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-neutral-700/40 mt-3">
              {cleanHistory.length === 0 ? (
                <p className="text-center py-8 text-sm text-slate-400 dark:text-neutral-500">
                  No clean sessions recorded yet.
                </p>
              ) : (
                cleanHistory.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">
                          Freed {formatSize(item.freedBytes)}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5">
                          <Clock size={12} />
                          {new Date(item.timestamp).toLocaleString()} • {item.itemsCount} items
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
