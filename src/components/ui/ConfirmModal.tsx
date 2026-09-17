import { useState } from 'react';
import Button from './Button';
import { formatSize } from '../../lib/utils';
import {
  AlertTriangle,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  title?: string;
  itemsCount: number;
  totalBytes: number;
  paths: string[];
  isDryRun?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  title = 'Confirm Cleanup',
  itemsCount,
  totalBytes,
  paths,
  isDryRun = false,
}: ConfirmModalProps) {
  const [showAllPaths, setShowAllPaths] = useState(false);

  if (!isOpen) return null;

  const displayPaths = showAllPaths ? paths : paths.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-neutral-700/60">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                isDryRun
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}
            >
              {isDryRun ? <Sparkles size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                {title}
              </h3>
              <p className="text-xs text-slate-400 dark:text-neutral-400">
                {isDryRun
                  ? 'Simulation mode active • No files will actually be deleted'
                  : 'Action is irreversible • Review items before proceeding'}
              </p>
            </div>
          </div>
          {!isLoading && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Stat Summary Box */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-100 dark:border-neutral-700/40">
            <div>
              <span className="text-xs text-slate-400 dark:text-neutral-400">Items to Clean</span>
              <p className="text-lg font-bold text-slate-800 dark:text-white">
                {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-400 dark:text-neutral-400">Space to Reclaim</span>
              <p
                className={`text-lg font-bold ${
                  isDryRun
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`}
              >
                {formatSize(totalBytes)}
              </p>
            </div>
          </div>

          {/* Mode Warning */}
          {isDryRun ? (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs">
              <Sparkles size={16} className="shrink-0 mt-0.5" />
              <span>
                <strong>Dry Run Simulation:</strong> Beberes will verify access and estimate exact reclaimable space without modifying or removing any files.
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>
                Selected files will be deleted permanently. System-critical paths are automatically safeguarded by Beberes whitelist.
              </span>
            </div>
          )}

          {/* Items Preview */}
          <div className="space-y-1.5">
            <button
              onClick={() => setShowAllPaths(!showAllPaths)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200 cursor-pointer transition-colors"
            >
              {showAllPaths ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>Preview paths ({paths.length})</span>
            </button>

            <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-lg bg-slate-50 dark:bg-neutral-900/40 border border-slate-100 dark:border-neutral-700/40 text-xs font-mono text-slate-600 dark:text-neutral-300">
              {displayPaths.map((p, idx) => (
                <div key={idx} className="truncate select-all" title={p}>
                  {p}
                </div>
              ))}
              {!showAllPaths && paths.length > 5 && (
                <div className="text-slate-400 dark:text-neutral-500 font-sans italic pt-1">
                  ...and {paths.length - 5} more items
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50 dark:bg-neutral-800/80 border-t border-slate-100 dark:border-neutral-700/60">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={isDryRun ? 'primary' : 'danger'}
            onClick={onConfirm}
            loading={isLoading}
            icon={<Trash2 size={15} />}
          >
            {isDryRun ? 'Run Simulation' : `Clean ${formatSize(totalBytes)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
