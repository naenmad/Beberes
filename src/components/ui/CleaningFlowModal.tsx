import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatSize } from '../../lib/utils';
import Button from './Button';
import { useTranslation } from '../../lib/i18n';
import {
  ShieldCheck,
  HardDrive,
  Trash2,
  Sparkles,
  CheckCircle2,
  FolderTree,
  FolderSync,
  X,
  AlertTriangle,
} from 'lucide-react';

interface CleaningFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCleaning: boolean;
  isDryRun?: boolean;
  totalBytes: number;
  totalItems: number;
  paths?: string[];
  title?: string;
  mode?: 'clean' | 'organize';
}

const cleanStages = [
  { label: 'Verifying file locks & whitelist safety', icon: ShieldCheck },
  { label: 'Analyzing physical APFS storage blocks', icon: HardDrive },
  { label: 'Purging unneeded caches & redundant files', icon: Trash2 },
  { label: 'Reclaiming unallocated disk space', icon: Sparkles },
  { label: 'Cleanup completed and verified', icon: CheckCircle2 },
];

const organizeStages = [
  { label: 'Checking source file permissions', icon: ShieldCheck },
  { label: 'Creating target category folders', icon: FolderTree },
  { label: 'Relocating files to organized folders', icon: FolderSync },
  { label: 'Verifying folder structure integrity', icon: Sparkles },
  { label: 'Files organized successfully', icon: CheckCircle2 },
];

export default function CleaningFlowModal({
  isOpen,
  onClose,
  isCleaning,
  isDryRun = false,
  totalBytes,
  totalItems,
  paths = [],
  title,
  mode = 'clean',
}: CleaningFlowModalProps) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [tickerPath, setTickerPath] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  // Keep frozen copies of stats so they don't reset to 0 if parent re-scans during progress
  const frozenStatsRef = useRef({ totalBytes, totalItems });
  if (isOpen && (totalBytes > 0 || totalItems > 0)) {
    frozenStatsRef.current = { totalBytes, totalItems };
  }

  const isOrganize = mode === 'organize';
  const stages = isOrganize ? organizeStages : cleanStages;
  const modalTitle = title || (isOrganize ? t('tidyUp.organizeFiles') : t('systemClean.title'));

  const displayBytes = totalBytes > 0 ? totalBytes : frozenStatsRef.current.totalBytes;
  const displayItems = totalItems > 0 ? totalItems : frozenStatsRef.current.totalItems;

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setCurrentStageIdx(0);
      setTickerPath('');
      setIsCompleted(false);
      return;
    }

    let interval: ReturnType<typeof setInterval> | null = null;
    let pathIdx = 0;

    if (isCleaning) {
      // Start with initial responsive progress
      setProgress((prev) => (prev === 0 ? 15 : prev));
      if (paths.length > 0) {
        setTickerPath(paths[0]);
      }

      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 92) return prev;
          const step = Math.floor(Math.random() * 8) + 4;
          const next = Math.min(prev + step, 92);

          if (next > 75) setCurrentStageIdx(3);
          else if (next > 45) setCurrentStageIdx(2);
          else if (next > 20) setCurrentStageIdx(1);
          else setCurrentStageIdx(0);

          if (paths.length > 0) {
            setTickerPath(paths[pathIdx % paths.length]);
            pathIdx++;
          }

          return next;
        });
      }, 100);
    } else {
      // When isCleaning is false (backend finished, even if completed instantly)
      setProgress(100);
      setCurrentStageIdx(stages.length - 1);
      const timer = setTimeout(() => {
        setIsCompleted(true);
      }, 350);

      return () => clearTimeout(timer);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, isCleaning, paths, stages.length]);

  // Protect against closing app during active file operations
  useEffect(() => {
    if (isCleaning) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [isCleaning]);

  if (!isOpen) return null;

  const CurrentStageIcon = stages[currentStageIdx]?.icon || Sparkles;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-md transition-opacity"
        onClick={isCompleted ? onClose : undefined}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md rounded-3xl glass-panel p-6 shadow-2xl border border-black/10 dark:border-white/10 animate-scale-in text-center overflow-hidden z-10">
        {/* Safety Close Button (Only accessible when not actively running) */}
        {!isCleaning && (
          <button
            onClick={onClose}
            title="Close dialog"
            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/4 dark:hover:bg-white/6 transition-colors cursor-pointer z-20"
          >
            <X size={16} />
          </button>
        )}

        {!isCompleted ? (
          <div className="space-y-6 py-2">
            {/* Header */}
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400">
                {isDryRun
                  ? 'Simulation Flow'
                  : isOrganize
                  ? 'Organizing Files'
                  : 'Optimization in Progress'}
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {modalTitle}
              </h3>
            </div>

            {/* Circular Progress */}
            <div className="relative flex items-center justify-center w-32 h-32 mx-auto">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className="stroke-slate-100 dark:stroke-neutral-800"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="#0071e3"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={2 * Math.PI * 50 * (1 - progress / 100)}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-200 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {progress}%
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Processing</span>
              </div>
            </div>

            {/* Stage Checklist */}
            <div className="space-y-2 text-left bg-black/2 dark:bg-white/4 p-3.5 rounded-2xl border border-black/4 dark:border-white/6">
              <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-neutral-200">
                <div className="p-1 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
                  <CurrentStageIcon size={14} className="animate-spin-slow" />
                </div>
                <span className="truncate">{stages[currentStageIdx]?.label}</span>
              </div>

              {/* Live Path Ticker */}
              {tickerPath && (
                <p className="text-[10px] font-mono text-slate-400 dark:text-neutral-500 truncate pt-1 border-t border-black/4 dark:border-white/6">
                  {tickerPath}
                </p>
              )}
            </div>

            {/* Safety Warning during active file operations */}
            {isCleaning && (
              <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-left text-[11px] leading-tight animate-fade-in">
                <AlertTriangle size={15} className="shrink-0 text-amber-500 animate-pulse" />
                <span>{t('modals.safetyBanner')}</span>
              </div>
            )}

            {/* Summary Stat */}
            <p className="text-xs text-slate-400 dark:text-neutral-400">
              {isOrganize
                ? `Organizing ${displayItems} files (${formatSize(displayBytes)})`
                : `Reclaiming ${formatSize(displayBytes)} across ${displayItems} items`}
            </p>
          </div>
        ) : (
          /* Completion Celebration Screen (100% No Emojis) */
          <div className="space-y-5 py-4 animate-scale-in">
            {/* Success Badge */}
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/15">
              <CheckCircle2 size={38} />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {isDryRun
                  ? 'Simulation Completed'
                  : isOrganize
                  ? 'Organization Completed'
                  : 'Cleanup Completed'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                {isDryRun
                  ? 'Dry run finished with zero modifications to your filesystem.'
                  : isOrganize
                  ? 'Files have been organized safely into designated category folders.'
                  : 'Storage reclaimed and system caches purged successfully.'}
              </p>
            </div>

            {/* Metric Box */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-black/2 dark:bg-white/4 border border-black/4 dark:border-white/6">
              <div>
                <span className="text-[11px] text-slate-400">
                  {isOrganize ? 'Total Size' : 'Total Reclaimed'}
                </span>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatSize(displayBytes)}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">
                  {isOrganize ? 'Files Organized' : 'Items Cleaned'}
                </span>
                <p className="text-lg font-bold text-slate-800 dark:text-white">
                  {displayItems} files
                </p>
              </div>
            </div>

            <Button variant="primary" onClick={onClose} className="w-full">
              {t('common.close')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
