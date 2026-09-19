import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/appStore';
import { useTranslation } from '../../lib/i18n';
import { formatSize } from '../../lib/utils';
import { Trash2, AlertTriangle, X, Layers, Loader2 } from 'lucide-react';

export interface FloatingActionBarProps {
  selectedCount: number;
  selectedSize: number;
  onClean: () => void;
  isCleaning?: boolean;
  onDeselect?: () => void;
  onReview?: () => void;
  cleanLabel?: string;
  actionVariant?: 'primary' | 'danger';
  showModeBadge?: boolean;
  disablePortal?: boolean;
  className?: string;
}

export default function FloatingActionBar({
  selectedCount,
  selectedSize,
  onClean,
  isCleaning = false,
  onDeselect,
  onReview,
  cleanLabel,
  actionVariant,
  showModeBadge: _showModeBadge,
  disablePortal = false,
  className = '',
}: FloatingActionBarProps) {
  const { deleteToTrash } = useAppStore();
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  const isDanger = actionVariant === 'danger' || (!actionVariant && !deleteToTrash);

  const content = (
    <div
      className={`pointer-events-auto transition-all animate-slide-up select-none ${className}`}
    >
      <div className="h-11 inline-flex items-center gap-2 p-1.5 pl-4 rounded-full glass-panel shadow-2xl border border-black/10 dark:border-white/15 backdrop-blur-2xl">
        {/* Left info: count + size */}
        <div
          onClick={onReview}
          className={`flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-neutral-100 shrink-0 ${
            onReview ? 'cursor-pointer hover:opacity-85 transition-opacity' : ''
          }`}
          title={onReview ? t('queue.reviewBtn') : undefined}
        >
          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
          <span>
            {selectedCount} {t('common.selected', 'selected')}
          </span>
          <span className="text-[11px] font-mono opacity-65 font-normal">
            ({formatSize(selectedSize)})
          </span>
        </div>

        {/* Middle buttons: Review Queue & Deselect */}
        {(onReview || onDeselect) && (
          <div className="flex items-center gap-1 shrink-0 ml-1">
            {onReview && (
              <button
                type="button"
                onClick={onReview}
                className="h-8 px-2.5 rounded-full text-xs font-semibold text-slate-700 dark:text-neutral-200 hover:text-accent hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                title={t('queue.reviewBtn')}
              >
                <Layers size={13} />
                <span className="hidden sm:inline">{t('queue.reviewBtn')}</span>
              </button>
            )}

            {onDeselect && (
              <button
                type="button"
                onClick={onDeselect}
                title={t('common.deselectAll', 'Deselect All')}
                className="h-8 w-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Action Button: Embedded neatly inside the capsule */}
        <button
          type="button"
          onClick={onClean}
          disabled={isCleaning}
          className={`h-8 px-3.5 rounded-full text-xs font-bold text-white shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${
            isDanger
              ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
              : 'bg-accent hover:bg-accent-hover shadow-accent/20'
          }`}
        >
          {isCleaning ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Trash2 size={13} />
          )}
          <span>
            {cleanLabel ||
              (deleteToTrash
                ? t('systemClean.cleanToTrash', 'Clean to Trash')
                : t('systemClean.cleanSelected', 'Clean Selected'))}
          </span>
        </button>
      </div>
    </div>
  );

  if (disablePortal) {
    return content;
  }

  const portalRoot = typeof document !== 'undefined' ? document.getElementById('floating-action-bar-root') : null;

  if (portalRoot) {
    return createPortal(content, portalRoot);
  }

  return createPortal(
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex justify-center px-4">
      {content}
    </div>,
    document.body
  );
}
