import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/appStore';
import { useTranslation } from '../../lib/i18n';
import { formatSize } from '../../lib/utils';
import Button from './Button';
import { Trash2, AlertTriangle, X } from 'lucide-react';

export interface FloatingActionBarProps {
  selectedCount: number;
  selectedSize: number;
  onClean: () => void;
  isCleaning?: boolean;
  onDeselect?: () => void;
  cleanLabel?: string;
  actionVariant?: 'primary' | 'danger';
  showModeBadge?: boolean;
  className?: string;
}

export default function FloatingActionBar({
  selectedCount,
  selectedSize,
  onClean,
  isCleaning = false,
  onDeselect,
  cleanLabel,
  actionVariant,
  showModeBadge = true,
  className = '',
}: FloatingActionBarProps) {
  const { deleteToTrash } = useAppStore();
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  const defaultActionVariant = actionVariant ?? (deleteToTrash ? 'primary' : 'danger');

  const content = (
    <div
      className={`pointer-events-auto max-w-xl w-full sm:w-auto transition-all animate-slide-up select-none ${className}`}
    >
      <div className="glass-panel rounded-2xl shadow-2xl border border-black/8 dark:border-white/10 px-4 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between gap-3 sm:gap-6 backdrop-blur-2xl">
        {/* Left info: count + size + delete mode badge */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-neutral-100 truncate">
            <AlertTriangle size={15} className="text-amber-500 shrink-0" />
            <span>
              {selectedCount} {t('common.selected', 'selected')} ({formatSize(selectedSize)})
            </span>
          </div>

          {showModeBadge && (
            <div
              title={deleteToTrash ? t('settings.trashModeDesc') : t('settings.directDeleteDesc')}
              className={`hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border select-none shrink-0 ${
                deleteToTrash
                  ? 'bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400'
                  : 'bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400'
              }`}
            >
              <Trash2 size={10} />
              <span>
                {t('common.mode')}: {deleteToTrash ? t('common.trashMode') : t('common.directDelete')}
              </span>
            </div>
          )}
        </div>

        {/* Right buttons: Deselect & Clean */}
        <div className="flex items-center gap-2 shrink-0">
          {onDeselect && (
            <button
              type="button"
              onClick={onDeselect}
              title={t('common.deselectAll', 'Deselect All')}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/8 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          )}

          <Button
            onClick={onClean}
            loading={isCleaning}
            variant={defaultActionVariant}
            size="sm"
            icon={<Trash2 size={14} />}
          >
            {cleanLabel ||
              (deleteToTrash
                ? `${t('systemClean.cleanToTrash', 'Clean to Trash')} (${formatSize(selectedSize)})`
                : `${t('systemClean.cleanSelected', 'Clean Selected')} (${formatSize(selectedSize)})`)}
          </Button>
        </div>
      </div>
    </div>
  );

  const portalRoot = typeof document !== 'undefined' ? document.getElementById('floating-action-bar-root') : null;

  if (portalRoot) {
    return createPortal(content, portalRoot);
  }

  // Fallback to document.body if portal anchor not found
  return createPortal(
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex justify-center px-4 w-full">
      {content}
    </div>,
    document.body
  );
}
