import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';
import { formatSize } from '../../lib/utils';
import { useTranslation } from '../../lib/i18n';
import {
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  FolderTree,
  AlertTriangle,
} from 'lucide-react';

export type ModalActionType = 'clean' | 'organize';

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
  useTrash?: boolean;
  actionType?: ModalActionType;
  confirmText?: string;
  hasCriticalFiles?: boolean;
  criticalWarningMessage?: string;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  title,
  itemsCount,
  totalBytes,
  paths,
  isDryRun = false,
  useTrash = false,
  actionType = 'clean',
  confirmText,
  hasCriticalFiles = false,
  criticalWarningMessage,
}: ConfirmModalProps) {
  const { t } = useTranslation();
  const [showAllPaths, setShowAllPaths] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isOrganize = actionType === 'organize';
  const modalTitle = title || (isOrganize ? t('tidyUp.organizeFiles', 'Organize Files') : t('modals.confirmTitle'));
  const displayPaths = showAllPaths ? paths : paths.slice(0, 5);

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 shadow-2xl overflow-hidden animate-scale-in z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-neutral-700/60">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                isOrganize
                  ? 'bg-accent-subtle text-accent'
                  : isDryRun
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : useTrash
                  ? 'bg-accent-subtle text-accent'
                  : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}
            >
              {isOrganize ? (
                <FolderTree size={20} />
              ) : isDryRun ? (
                <Sparkles size={20} />
              ) : (
                <Trash2 size={20} />
              )}
            </div>
            <div>
              <h3 id="confirm-modal-title" className="text-base font-semibold text-slate-900 dark:text-white">
                {modalTitle}
              </h3>
              <p className="text-xs text-slate-400 dark:text-neutral-400">
                {isOrganize
                  ? isDryRun
                    ? 'Simulation mode active • No files will be moved'
                    : t('modals.organizeNotice')
                  : isDryRun
                  ? 'Simulation mode active • No files will actually be deleted'
                  : useTrash
                  ? t('modals.confirmSubtitleTrash')
                  : t('modals.confirmSubtitlePermanent')}
              </p>
            </div>
          </div>
          {!isLoading && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Stat Summary Box */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-100 dark:border-neutral-700/40">
            <div>
              <span className="text-xs text-slate-400 dark:text-neutral-400">
                {isOrganize ? t('modals.filesToOrganize') : t('modals.filesToClean')}
              </span>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {itemsCount} {t('dashboard.items')}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-400 dark:text-neutral-400">
                {isOrganize ? t('modals.totalSize') : t('modals.spaceToReclaim')}
              </span>
              <p
                className={`text-lg font-bold ${
                  isOrganize
                    ? 'text-accent'
                    : isDryRun
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : useTrash
                    ? 'text-accent'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatSize(totalBytes)}
              </p>
            </div>
          </div>

          {/* Mode Notice / Warning */}
          {isOrganize ? (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-accent-subtle border border-accent/20 text-accent text-xs">
              <FolderTree size={16} className="shrink-0 mt-0.5" />
              <span>
                {t('modals.organizeNotice')}
              </span>
            </div>
          ) : isDryRun ? (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs">
              <Sparkles size={16} className="shrink-0 mt-0.5" />
              <span>
                Simulation Mode
              </span>
            </div>
          ) : useTrash ? (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-accent-subtle border border-accent/20 text-accent text-xs">
              <Trash2 size={16} className="shrink-0 mt-0.5" />
              <span>
                {t('modals.trashNotice')}
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>
                {t('modals.permanentNotice')}
              </span>
            </div>
          )}

          {/* Critical Files Warning */}
          {hasCriticalFiles && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200 text-xs">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="space-y-0.5">
                <p className="font-bold text-amber-900 dark:text-amber-200">
                  {t('safety.criticalWarningTitle', 'Critical / Recent Files Detected')}
                </p>
                <p className="text-amber-700 dark:text-amber-300/90 leading-relaxed">
                  {criticalWarningMessage ||
                    t(
                      'safety.criticalWarningDesc',
                      'Selected items include files exceeding 5 GB or modified within the last 24 hours. Please verify before proceeding.'
                    )}
                </p>
              </div>
            </div>
          )}

          {/* Items Preview */}
          <div className="space-y-1.5">
            <button
              onClick={() => setShowAllPaths(!showAllPaths)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200 cursor-pointer transition-colors"
            >
              {showAllPaths ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>
                {isOrganize
                  ? t('modals.previewRelocations', { count: paths.length })
                  : t('modals.previewPaths', { count: paths.length })}
              </span>
            </button>

            <div className="max-h-36 overflow-y-auto space-y-1 p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900/40 border border-slate-100 dark:border-neutral-700/40 text-xs font-mono text-slate-600 dark:text-neutral-300">
              {displayPaths.map((p, idx) => (
                <div key={idx} className="truncate select-all" title={p}>
                  {p}
                </div>
              ))}
              {!showAllPaths && paths.length > 5 && (
                <div className="text-slate-400 dark:text-neutral-500 font-sans italic pt-1">
                  {t('modals.moreItems', { count: paths.length - 5 })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50 dark:bg-neutral-800/80 border-t border-slate-100 dark:border-neutral-700/60">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button
            variant={isOrganize ? 'primary' : isDryRun ? 'primary' : useTrash ? 'primary' : 'danger'}
            onClick={onConfirm}
            loading={isLoading}
            icon={isOrganize ? <FolderTree size={15} /> : <Trash2 size={15} />}
          >
            {isOrganize
              ? isDryRun
                ? 'Simulate Organization'
                : confirmText || `${t('tidyUp.organizeFiles', 'Organize Files')} (${itemsCount})`
              : isDryRun
              ? 'Run Simulation'
              : confirmText ||
                (useTrash
                  ? `${t('common.trashMode')} (${formatSize(totalBytes)})`
                  : `${t('common.clean')} (${formatSize(totalBytes)})`)}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
