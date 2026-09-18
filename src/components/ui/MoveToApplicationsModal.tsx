import { useState, useEffect } from 'react';
import { useTranslation } from '../../lib/i18n';
import Button from './Button';
import Checkbox from './Checkbox';
import {
  checkIsInApplicationsDir,
  moveToApplicationsAndRelaunch,
} from '../../lib/commands';
import {
  FolderCheck,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';

const STORAGE_KEY_SKIP = 'beberes_skip_move_to_apps';

export default function MoveToApplicationsModal() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  useEffect(() => {
    // Check if user previously elected not to be asked
    const skip = localStorage.getItem(STORAGE_KEY_SKIP);
    if (skip === 'true') {
      return;
    }

    // Check with Tauri backend if app is running outside /Applications
    checkIsInApplicationsDir()
      .then((isInApps) => {
        if (!isInApps) {
          setIsOpen(true);
        }
      })
      .catch((err) => {
        console.warn('Failed to verify application location:', err);
      });
  }, []);

  const handleDismiss = () => {
    if (dontAskAgain) {
      localStorage.setItem(STORAGE_KEY_SKIP, 'true');
    }
    setIsOpen(false);
  };

  const handleMove = async () => {
    setIsMoving(true);
    setError(null);
    try {
      await moveToApplicationsAndRelaunch();
    } catch (err: any) {
      console.error('Failed to move application:', err);
      setError(typeof err === 'string' ? err : err?.message || 'Failed to move application.');
      setIsMoving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in"
      onClick={handleDismiss}
    >
      <div
        className="w-full max-w-lg rounded-3xl glass-panel shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Visual Migration Graphic */}
        <div className="relative p-6 text-center border-b border-black/4 dark:border-white/6 bg-linear-to-b from-blue-500/5 to-transparent">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isMoving}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/4 dark:hover:bg-white/6 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X size={16} />
          </button>

          {/* Interactive Visual Transfer Badges */}
          <div className="flex items-center justify-center gap-4 my-2">
            <div className="relative group">
              <img
                src="/icon-beberes.webp"
                alt="Beberes"
                className="w-16 h-16 rounded-2xl object-cover shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/30"
              />
              <span className="absolute -bottom-2 -right-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase bg-amber-500/90 text-white shadow">
                Current
              </span>
            </div>

            <div className="flex flex-col items-center justify-center text-blue-500 animate-pulse">
              <div className="p-2 rounded-full bg-blue-500/10 border border-blue-500/20">
                <ArrowRight size={20} />
              </div>
            </div>

            <div className="relative group">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/30 text-white">
                <FolderCheck size={32} />
              </div>
              <span className="absolute -bottom-2 -right-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase bg-emerald-500/90 text-white shadow">
                /Apps
              </span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-3">
            {t('installer.title', 'Move to Applications Folder?')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto leading-relaxed">
            {t(
              'installer.subtitle',
              'Beberes is currently running outside your macOS Applications folder.'
            )}
          </p>
        </div>

        {/* Value Highlights */}
        <div className="p-6 space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-black/2 dark:bg-white/2 border border-black/5 dark:border-white/5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <RefreshCw size={16} />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {t('installer.benefit1Title', 'Smoother Background Updates')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                {t(
                  'installer.benefit1Desc',
                  'Allows seamless background updates and persistent settings.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-black/2 dark:bg-white/2 border border-black/5 dark:border-white/5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {t('installer.benefit2Title', 'Security & Permissions')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                {t(
                  'installer.benefit2Desc',
                  'Ensures full disk access and macOS Gatekeeper security policies stay intact.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-black/2 dark:bg-white/2 border border-black/5 dark:border-white/5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {t('installer.benefit3Title', 'Clean System Integration')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                {t(
                  'installer.benefit3Desc',
                  'Spotlight, Raycast, and Launchpad will easily index and launch Beberes.'
                )}
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Don't ask again toggle */}
          <div className="pt-2 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400 cursor-pointer select-none">
              <Checkbox
                checked={dontAskAgain}
                onChange={(checked) => setDontAskAgain(checked)}
              />
              <span>{t('installer.dontAskAgain', 'Do not ask again on this device')}</span>
            </label>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-6 pt-0 flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            size="md"
            onClick={handleDismiss}
            disabled={isMoving}
          >
            {t('installer.dontMove', 'Keep in Current Location')}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleMove}
            disabled={isMoving}
            icon={isMoving ? <Loader2 size={16} className="animate-spin" /> : <FolderCheck size={16} />}
          >
            {isMoving
              ? t('installer.moving', 'Moving...')
              : t('installer.moveBtn', 'Move to Applications & Relaunch')}
          </Button>
        </div>
      </div>
    </div>
  );
}
