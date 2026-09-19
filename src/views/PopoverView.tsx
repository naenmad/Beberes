import { useState, useEffect } from 'react';
import {
  Sparkles,
  HardDrive,
  Cpu,
  Trash2,
  Maximize2,
  X,
  RefreshCw,
  Zap,
  Code,
  ShieldCheck,
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
      // Ignored in background refresh
    }
  };

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 3000);
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
    } catch (e: any) {
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
    <div className="w-full h-full bg-slate-950/95 backdrop-blur-2xl text-slate-100 border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-2xl select-none overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wide text-white flex items-center gap-1.5">
              Beberes Mini
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                v1.3.0
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleOpenMain('dashboard')}
            title="Open Full Beberes"
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => hidePopover()}
            title="Close Popover"
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionFeedback && (
        <div className="my-1 py-1.5 px-3 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium text-center animate-fade-in flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          {actionFeedback}
        </div>
      )}

      {/* Main Metrics Card */}
      <div className="space-y-3 my-2">
        {/* Memory Bar */}
        <div className="bg-white/5 border border-white/5 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              Unified Memory (RAM)
            </span>
            <span className="font-semibold font-mono text-white">
              {memory ? `${formatSize(memory.used_bytes)} / ${formatSize(memory.total_bytes)}` : '--'}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                ramUsedPct > 85 ? 'bg-rose-500' : ramUsedPct > 65 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${ramUsedPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              Inactive: {memory ? formatSize(memory.inactive_bytes) : '--'}
            </span>
            <button
              onClick={handlePurgeRam}
              disabled={isPurgingRam}
              className="px-2 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 flex items-center gap-1 transition-colors disabled:opacity-50 text-[10px] font-medium"
            >
              <RefreshCw className={`w-3 h-3 ${isPurgingRam ? 'animate-spin' : ''}`} />
              {isPurgingRam ? 'Purging...' : 'Free RAM'}
            </button>
          </div>
        </div>

        {/* Storage Bar */}
        <div className="bg-white/5 border border-white/5 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              Macintosh HD (SSD)
            </span>
            <span className="font-semibold font-mono text-white">
              {diskInfo ? `${formatSize(diskInfo.freeSpace)} Free` : '--'}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-1.5">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                diskUsedPct > 90 ? 'bg-rose-500' : diskUsedPct > 75 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${diskUsedPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{diskUsedPct}% Used</span>
            <span>Total {diskInfo ? formatSize(diskInfo.totalSpace) : '--'}</span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2 my-1">
        <button
          onClick={() => handleOpenMain('system-clean')}
          className="p-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-left transition-all group"
        >
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-emerald-300">Quick Clean</span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-1">Clear system cache & logs</p>
        </button>

        <button
          onClick={handleEmptyTrash}
          disabled={isEmptyingTrash}
          className="p-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-left transition-all group disabled:opacity-50"
        >
          <div className="flex items-center gap-2 mb-1">
            <Trash2 className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-rose-300">
              {isEmptyingTrash ? 'Emptying...' : 'Empty Trash'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-1">Clean macOS trash bin</p>
        </button>

        <button
          onClick={() => handleOpenMain('dev-workspace')}
          className="p-2.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-left transition-all group"
        >
          <div className="flex items-center gap-2 mb-1">
            <Code className="w-3.5 h-3.5 text-violet-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-violet-300">Dev Clean</span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-1">node_modules & build caches</p>
        </button>

        <button
          onClick={() => handleOpenMain('dashboard')}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group"
        >
          <div className="flex items-center gap-2 mb-1">
            <Maximize2 className="w-3.5 h-3.5 text-slate-300 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-slate-200">Full App</span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-1">Open complete dashboard</p>
        </button>
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
        <span>100% Local & Privacy-First</span>
        <button
          onClick={() => handleOpenMain('dashboard')}
          className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
        >
          Open Beberes &rarr;
        </button>
      </div>
    </div>
  );
}
