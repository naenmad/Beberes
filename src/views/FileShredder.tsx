import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useTranslation } from '../lib/i18n';
import {
  shredPaths,
  pickFiles,
  pickFolder,
  type ShredResult,
} from '../lib/commands';
import { formatSize } from '../lib/utils';
import Button from '../components/ui/Button';
import PageHeader from '../components/layout/PageHeader';
import ConfirmModal from '../components/ui/ConfirmModal';
import {
  ShieldAlert,
  FileCode,
  Folder,
  Trash2,
  AlertOctagon,
  CheckCircle2,
  Layers,
  Lock,
  X,
} from 'lucide-react';

export default function FileShredder() {
  const { t } = useTranslation();
  const { recordCleanResult, shredderPreloadedPaths, setShredderPreloadedPaths } = useAppStore();

  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [passes, setPasses] = useState<number>(3);
  const [isShredding, setIsShredding] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [lastResult, setLastResult] = useState<ShredResult | null>(null);

  // Consume preloaded paths from GlobalDropzone
  useEffect(() => {
    if (shredderPreloadedPaths && shredderPreloadedPaths.length > 0) {
      setSelectedPaths((prev) => Array.from(new Set([...prev, ...shredderPreloadedPaths])));
      setShredderPreloadedPaths([]);
    }
  }, [shredderPreloadedPaths, setShredderPreloadedPaths]);

  // Pick files
  const handlePickFiles = async () => {
    try {
      const files = await pickFiles();
      if (files && files.length > 0) {
        setSelectedPaths((prev) => Array.from(new Set([...prev, ...files])));
        setLastResult(null);
      }
    } catch (err) {
      console.error('Failed to pick files:', err);
    }
  };

  // Pick folder
  const handlePickFolder = async () => {
    try {
      const folder = await pickFolder();
      if (folder) {
        setSelectedPaths((prev) => Array.from(new Set([...prev, folder])));
        setLastResult(null);
      }
    } catch (err) {
      console.error('Failed to pick folder:', err);
    }
  };

  // Remove single path
  const handleRemovePath = (pathToRemove: string) => {
    setSelectedPaths((prev) => prev.filter((p) => p !== pathToRemove));
  };

  // Clear all paths
  const handleClearAll = () => {
    setSelectedPaths([]);
    setLastResult(null);
  };

  // Execute shredding
  const handleConfirmShred = async () => {
    if (selectedPaths.length === 0) return;
    setIsShredding(true);
    setShowConfirmModal(false);

    try {
      const result = await shredPaths(selectedPaths, passes);
      setLastResult(result);
      if (result.shreddedCount > 0) {
        recordCleanResult(
          result.totalBytes,
          result.shreddedCount,
          false,
          [t('fileShredder.title', 'File Shredder')]
        );
        setSelectedPaths([]);
      }
    } catch (err) {
      console.error('Failed to shred files:', err);
    } finally {
      setIsShredding(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <PageHeader
        icon={<ShieldAlert size={20} />}
        iconColor="text-rose-500"
        title={t('fileShredder.title', 'File Shredder & Secure Wipe')}
        subtitle={t('fileShredder.subtitle', 'Cryptographically sanitize and permanently destroy confidential files with multi-pass hardware overwriting.')}
      />

      {/* Algorithm Pass Selector */}
      <div className="glass-panel p-5 rounded-3xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-rose-500" />
            <span className="text-xs font-semibold text-slate-900 dark:text-white">
              {t('fileShredder.sanitizationStandard', 'Sanitization Standard & Passes')}
            </span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {passes === 1 && t('fileShredder.onePassLabel', '1 Pass - Zero Fill (Fast)')}
            {passes === 3 && t('fileShredder.threePassLabel', '3 Passes - DoD 5220.22-M (Recommended)')}
            {passes === 7 && t('fileShredder.sevenPassLabel', '7 Passes - Gutmann Lite (Ultra Safe)')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1 Pass */}
          <button
            onClick={() => setPasses(1)}
            className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
              passes === 1
                ? 'bg-accent-subtle border-accent/40 text-accent shadow-xs ring-1 ring-accent/20'
                : 'glass-panel border-black/4 dark:border-white/4 text-slate-600 dark:text-neutral-400 hover:border-accent/20'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {t('fileShredder.quickZero', 'Quick Zero')}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${passes === 1 ? 'bg-accent/20 text-accent' : 'bg-black/5 dark:bg-white/5 text-slate-500'}`}>
                {t('fileShredder.passBadge', '{count} Pass', { count: 1 })}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('fileShredder.quickZeroDesc', 'Single pass 0x00 overwrite. Fast for non-confidential large items.')}
            </p>
          </button>

          {/* 3 Passes */}
          <button
            onClick={() => setPasses(3)}
            className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
              passes === 3
                ? 'bg-accent-subtle border-accent/40 text-accent shadow-xs ring-1 ring-accent/20'
                : 'glass-panel border-black/4 dark:border-white/4 text-slate-600 dark:text-neutral-400 hover:border-accent/20'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                DoD 5220.22-M
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${passes === 3 ? 'bg-accent/20 text-accent' : 'bg-black/5 dark:bg-white/5 text-slate-500'}`}>
                {t('fileShredder.passesBadge', '{count} Passes', { count: 3 })}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('fileShredder.dodDesc', 'CSPRNG random + bitwise inverse + random. Defeats laboratory data recovery.')}
            </p>
          </button>

          {/* 7 Passes */}
          <button
            onClick={() => setPasses(7)}
            className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
              passes === 7
                ? 'bg-accent-subtle border-accent/40 text-accent shadow-xs ring-1 ring-accent/20'
                : 'glass-panel border-black/4 dark:border-white/4 text-slate-600 dark:text-neutral-400 hover:border-accent/20'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Gutmann Lite
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${passes === 7 ? 'bg-accent/20 text-accent' : 'bg-black/5 dark:bg-white/5 text-slate-500'}`}>
                {t('fileShredder.passesBadge', '{count} Passes', { count: 7 })}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('fileShredder.gutmannDesc', 'Extreme security multi-cycle pseudo-random wiping for classified files.')}
            </p>
          </button>
        </div>
      </div>

      {/* Target File Dropper & Pickers */}
      <div className="glass-panel p-8 rounded-3xl border-2 border-dashed border-rose-500/20 hover:border-rose-500/40 transition-colors text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
          <ShieldAlert size={28} />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t('fileShredder.dropZoneTitle', 'Select Files or Folders to Shred')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {t(
              'fileShredder.dropZoneDesc',
              'Select items below. They will be overwritten with cryptographic bytes, truncated, renamed, and completely unlinked.'
            )}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            onClick={handlePickFiles}
            variant="primary"
            size="md"
            icon={<FileCode size={15} />}
          >
            {t('fileShredder.pickFiles', 'Select Files...')}
          </Button>

          <Button
            onClick={handlePickFolder}
            variant="secondary"
            size="md"
            icon={<Folder size={15} />}
          >
            {t('fileShredder.pickFolder', 'Select Folder...')}
          </Button>
        </div>
      </div>

      {/* Selected Items Queue */}
      {selectedPaths.length > 0 && (
        <div className="glass-panel rounded-3xl overflow-hidden border border-black/4 dark:border-white/4 space-y-0">
          <div className="p-4 border-b border-black/4 dark:border-white/4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-rose-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {t('fileShredder.queueCount', `${selectedPaths.length} Target(s) Queued`)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClearAll}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2.5 py-1 rounded-lg hover:bg-black/3 dark:hover:bg-white/3 transition-colors"
              >
                {t('common.clear', 'Clear Queue')}
              </button>

              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowConfirmModal(true)}
                icon={<Trash2 size={13} />}
              >
                {t('fileShredder.shredNow', 'Shred Queued Files')}
              </Button>
            </div>
          </div>

          <div className="divide-y divide-black/4 dark:divide-white/4 max-h-64 overflow-y-auto">
            {selectedPaths.map((path) => (
              <div
                key={path}
                className="p-3 px-4 flex items-center justify-between gap-3 text-xs hover:bg-black/1 dark:hover:bg-white/1"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <FileCode size={14} className="text-slate-400 shrink-0" />
                  <span className="font-mono text-slate-700 dark:text-slate-300 truncate">
                    {path}
                  </span>
                </div>

                <button
                  onClick={() => handleRemovePath(path)}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completion Banner */}
      {lastResult && (
        <div className="glass-panel p-4 rounded-2xl flex items-center justify-between border border-emerald-500/20 bg-emerald-500/3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {t('fileShredder.shredComplete', 'Shredding Complete')}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {t(
                  'fileShredder.shredSummary',
                  `Successfully wiped ${lastResult.shreddedCount} files (${formatSize(lastResult.totalBytes)}) across ${passes} passes.`
                )}
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setLastResult(null)}
          >
            {t('common.done', 'Done')}
          </Button>
        </div>
      )}

      {/* High-Level Safety Warning */}
      <div className="glass-panel p-4 rounded-2xl flex items-start gap-3.5 border border-rose-500/20 bg-rose-500/2">
        <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
          <AlertOctagon size={16} />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
            {t('fileShredder.warningTitle', 'Irreversible Data Destruction Warning')}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {t(
              'fileShredder.warningDesc',
              'Unlike standard trash deletion, shredding overwrites sector clusters before unlinking inodes. Files destroyed with this utility cannot be recovered by any commercial or hardware forensic tools.'
            )}
          </p>
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title={t('fileShredder.confirmTitle', 'Permanently Shred Selected Files?')}
        itemsCount={selectedPaths.length}
        totalBytes={0}
        useTrash={false}
        paths={selectedPaths}
        confirmText={t('fileShredder.confirmBtn', 'Shred Items Now')}
        isLoading={isShredding}
        onConfirm={handleConfirmShred}
        onClose={() => setShowConfirmModal(false)}
      />
    </div>
  );
}
