import { useState, useEffect } from 'react';
import {
  Sparkles,
  HardDrive,
  Cpu,
  Maximize2,
  X,
} from 'lucide-react';
import {
  getMemoryStatus,
  purgeInactiveMemory,
  emptyMacTrash,
  openMainWindowFromPopover,
  hidePopover,
  MemoryStatus,
} from '../lib/commands';
import { formatSize } from '../lib/utils';
import { useAppStore } from '../store/appStore';
import Button from '../components/ui/Button';

export default function PopoverView() {
  const { diskInfo, refreshDisks } = useAppStore();
  const [memory, setMemory] = useState<MemoryStatus | null>(null);
  const [isPurgingRam, setIsPurgingRam] = useState(false);
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const loadMetrics = async () => {
    try {
      const mem = await getMemoryStatus();
      setMemory(mem);
      await refreshDisks();
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 3500);
    return () => clearInterval(interval);
  }, []);

  const handlePurgeRam = async () => {
    if (isPurgingRam) return;
    setIsPurgingRam(true);
    setActionFeedback(null);
    try {
      const res = await purgeInactiveMemory();
      await loadMetrics();
      setActionFeedback(`Freed ${formatSize(res.freed_bytes)} RAM`);
      setTimeout(() => setActionFeedback(null), 3000);
    } catch {
      setActionFeedback('Failed to purge RAM');
      setTimeout(() => setActionFeedback(null), 3000);
    } finally {
      setIsPurgingRam(false);
    }
  };

  const handleEmptyTrash = async () => {
    if (isEmptyingTrash) return;
    setIsEmptyingTrash(true);
    setActionFeedback(null);
    try {
      await emptyMacTrash();
      await loadMetrics();
      setActionFeedback('Trash emptied successfully');
      setTimeout(() => setActionFeedback(null), 3000);
    } catch {
      setActionFeedback('Failed to empty trash');
      setTimeout(() => setActionFeedback(null), 3000);
    } finally {
      setIsEmptyingTrash(false);
    }
  };

  const handleOpenMain = (targetPage?: string) => {
    openMainWindowFromPopover(targetPage);
  };

  const diskUsedPct = diskInfo
    ? Math.round((diskInfo.usedSpace / diskInfo.totalSpace) * 100)
    : 0;

  const ramUsedPct = memory ? Math.round(memory.used_percentage) : 0;

  return (
    <div className="w-full h-full glass-panel text-slate-800 dark:text-slate-100 rounded-2xl p-4 flex flex-col justify-between shadow-2xl select-none overflow-hidden font-sans border border-black/8 dark:border-white/12">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-black/6 dark:border-white/8">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-accent-subtle text-accent flex items-center justify-center">
            <Sparkles size={14} />
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-tight text-slate-900 dark:text-white">Beberes Mini</h1>
            <p className="text-[10px] text-slate-400">Status Bar Widget</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => hidePopover()}
          className="w-6 h-6 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {actionFeedback && (
        <div className="my-2 py-1.5 px-3 rounded-xl bg-accent-subtle text-accent text-[11px] font-medium text-center animate-fade-in">
          {actionFeedback}
        </div>
      )}

      {/* Main Gauges */}
      <div className="space-y-3 my-auto py-1">
        {/* RAM Gauge */}
        <div className="p-3 rounded-2xl glass-panel space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Cpu size={14} className="text-secondary-accent" />
              <span className="font-semibold text-slate-800 dark:text-neutral-200">Unified Memory</span>
            </div>
            <span className="font-mono font-bold text-secondary-accent text-xs">
              {ramUsedPct}%
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-secondary-accent transition-all duration-500"
              style={{ width: `${ramUsedPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-400 font-mono">
              {memory ? `${formatSize(memory.used_bytes)} / ${formatSize(memory.total_bytes)}` : '--'}
            </span>
            <Button
              variant="secondary"
              size="sm"
              loading={isPurgingRam}
              onClick={handlePurgeRam}
              className="text-[10px] py-1 px-2 h-auto"
            >
              Purge RAM
            </Button>
          </div>
        </div>

        {/* Disk Gauge */}
        <div className="p-3 rounded-2xl glass-panel space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <HardDrive size={14} className="text-accent" />
              <span className="font-semibold text-slate-800 dark:text-neutral-200">Internal Storage</span>
            </div>
            <span className="font-mono font-bold text-accent text-xs">
              {diskUsedPct}%
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${diskUsedPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-400 font-mono">
              {diskInfo ? `${formatSize(diskInfo.freeSpace)} Free` : '--'}
            </span>
            <Button
              variant="secondary"
              size="sm"
              loading={isEmptyingTrash}
              onClick={handleEmptyTrash}
              className="text-[10px] py-1 px-2 h-auto"
            >
              Empty Trash
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-2 border-t border-black/6 dark:border-white/8 space-y-1.5">
        <Button
          variant="primary"
          size="sm"
          onClick={() => handleOpenMain('dashboard')}
          className="w-full justify-center text-xs py-2"
          icon={<Maximize2 size={13} />}
        >
          Open Full Beberes
        </Button>
      </div>
    </div>
  );
}
