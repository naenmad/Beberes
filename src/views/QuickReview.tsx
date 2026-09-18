import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { useTranslation } from '../lib/i18n';
import {
  scanReviewFiles,
  readFileThumbnail,
  renameFile,
  cleanSelectedItems,
  revealInFinder,
  pickFolder,
  type ReviewFileItem,
} from '../lib/commands';
import { formatSize } from '../lib/utils';
import Button from '../components/ui/Button';
import PageHeader from '../components/layout/PageHeader';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import {
  Sparkles,
  Trash2,
  Check,
  Edit3,
  RotateCcw,
  Maximize2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Download,
  Monitor,
  Camera,
  Image as ImageIcon,
  FolderInput,
  FileText,
  Film,
  Music,
  Archive,
  Package,
  Code2,
  AlertTriangle,
  X,
  RefreshCw,
  FolderCheck,
  Eye,
} from 'lucide-react';

type ReviewTargetDir = 'downloads' | 'desktop' | 'screenshots' | 'pictures' | 'custom';
type ReviewFilter = 'all' | 'images' | 'media' | 'documents' | 'installers' | 'large';

interface UndoAction {
  type: 'trash' | 'rename';
  item: ReviewFileItem;
  originalPath: string;
  renamedPath?: string;
  index: number;
}

export default function QuickReview() {
  const { t } = useTranslation();
  const { deleteToTrash, toggleDeleteToTrash, recordCleanResult } = useAppStore();

  // Target directory & filter
  const [targetDir, setTargetDir] = useState<ReviewTargetDir>('downloads');
  const [customPath, setCustomPath] = useState('');
  const [filter, setFilter] = useState<ReviewFilter>('all');

  // Scan state
  const [items, setItems] = useState<ReviewFileItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Preview thumbnail cache
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoadingThumb, setIsLoadingThumb] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);

  // Rename modal
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Session stats & Undo stack
  const [sessionFreedBytes, setSessionFreedBytes] = useState(0);
  const [sessionTrashedCount, setSessionTrashedCount] = useState(0);
  const [sessionKeptCount, setSessionKeptCount] = useState(0);
  const [sessionRenamedCount, setSessionRenamedCount] = useState(0);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [actionFeedback, setActionFeedback] = useState<{
    text: string;
    type: 'trash' | 'keep' | 'rename' | 'undo';
  } | null>(null);

  // Resolve directory string
  const currentDirStr = useMemo(() => {
    if (targetDir === 'custom') return customPath || 'downloads';
    return targetDir;
  }, [targetDir, customPath]);

  // Load directory items
  const loadDirectory = useCallback(
    async (dir: string = currentDirStr, currentFilter: string = filter) => {
      setIsLoading(true);
      try {
        const res = await scanReviewFiles(dir, currentFilter === 'all' ? undefined : currentFilter);
        setItems(res.items);
        setCurrentIndex(0);
        setThumbnailUrl(null);
      } catch (err) {
        console.error('Failed to scan review files:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [currentDirStr, filter]
  );

  useEffect(() => {
    loadDirectory(currentDirStr, filter);
  }, [targetDir, customPath, filter]);

  // Current active item
  const currentItem = useMemo(() => {
    if (items.length === 0 || currentIndex >= items.length) return null;
    return items[currentIndex];
  }, [items, currentIndex]);

  // Fetch thumbnail whenever currentItem changes
  useEffect(() => {
    let isMounted = true;
    setThumbnailUrl(null);

    if (!currentItem) return;

    if (currentItem.kind === 'image') {
      setIsLoadingThumb(true);
      readFileThumbnail(currentItem.path)
        .then((url) => {
          if (isMounted) {
            setThumbnailUrl(url);
            setIsLoadingThumb(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setThumbnailUrl(null);
            setIsLoadingThumb(false);
          }
        });
    } else {
      setIsLoadingThumb(false);
    }

    return () => {
      isMounted = false;
    };
  }, [currentItem]);

  // Trigger feedback notification
  const triggerFeedback = (text: string, type: 'trash' | 'keep' | 'rename' | 'undo') => {
    setActionFeedback({ text, type });
    setTimeout(() => {
      setActionFeedback(null);
    }, 1200);
  };

  // Action: Trash / Delete current item
  const handleTrash = async () => {
    if (!currentItem) return;

    const itemToTrash = currentItem;
    const itemIndex = currentIndex;

    try {
      await cleanSelectedItems([itemToTrash.path], false, deleteToTrash);
      recordCleanResult(itemToTrash.size, 1, false, ['Quick Review']);

      setSessionFreedBytes((prev) => prev + itemToTrash.size);
      setSessionTrashedCount((prev) => prev + 1);

      // Add to undo stack
      setUndoStack((prev) => [
        ...prev,
        {
          type: 'trash',
          item: itemToTrash,
          originalPath: itemToTrash.path,
          index: itemIndex,
        },
      ]);

      // Remove from active list
      setItems((prev) => prev.filter((_, idx) => idx !== itemIndex));
      if (currentIndex >= items.length - 1 && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      }

      triggerFeedback(
        deleteToTrash ? t('quickReview.movedToTrash') : t('quickReview.permanentlyDeleted'),
        'trash'
      );
    } catch (err) {
      console.error('Failed to trash file:', err);
    }
  };

  // Action: Keep item and advance
  const handleKeep = () => {
    if (!currentItem) return;

    setSessionKeptCount((prev) => prev + 1);
    triggerFeedback(t('quickReview.kept'), 'keep');

    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Reached the end
      setCurrentIndex(items.length);
    }
  };

  // Action: Open rename dialog
  const handleOpenRename = () => {
    if (!currentItem) return;
    setNewFileName(currentItem.name);
    setRenameError(null);
    setShowRenameModal(true);
    setTimeout(() => {
      if (renameInputRef.current) {
        renameInputRef.current.focus();
        // Select stem without extension
        const dotIndex = currentItem.name.lastIndexOf('.');
        if (dotIndex > 0) {
          renameInputRef.current.setSelectionRange(0, dotIndex);
        } else {
          renameInputRef.current.select();
        }
      }
    }, 50);
  };

  // Action: Submit Rename
  const handleExecuteRename = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentItem || !newFileName.trim()) return;

    if (newFileName.trim() === currentItem.name) {
      setShowRenameModal(false);
      return;
    }

    setIsRenaming(true);
    setRenameError(null);

    try {
      const newPath = await renameFile(currentItem.path, newFileName.trim());
      const originalPath = currentItem.path;
      const updatedItem: ReviewFileItem = {
        ...currentItem,
        name: newFileName.trim(),
        path: newPath,
        id: newPath,
      };

      setUndoStack((prev) => [
        ...prev,
        {
          type: 'rename',
          item: currentItem,
          originalPath,
          renamedPath: newPath,
          index: currentIndex,
        },
      ]);

      setItems((prev) =>
        prev.map((item, idx) => (idx === currentIndex ? updatedItem : item))
      );
      setSessionRenamedCount((prev) => prev + 1);
      setShowRenameModal(false);
      triggerFeedback(t('quickReview.renamed'), 'rename');
    } catch (err: any) {
      setRenameError(err.toString());
    } finally {
      setIsRenaming(false);
    }
  };

  // Action: Undo last operation
  const handleUndo = async () => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    if (lastAction.type === 'rename' && lastAction.renamedPath) {
      try {
        await renameFile(lastAction.renamedPath, lastAction.item.name);
        setItems((prev) =>
          prev.map((it) => (it.path === lastAction.renamedPath ? lastAction.item : it))
        );
        triggerFeedback(t('quickReview.undoSuccess'), 'undo');
      } catch (err) {
        console.error('Failed to undo rename:', err);
      }
    } else if (lastAction.type === 'trash') {
      // Re-insert item back into current list view
      setItems((prev) => {
        const next = [...prev];
        next.splice(lastAction.index, 0, lastAction.item);
        return next;
      });
      setCurrentIndex(lastAction.index);
      setSessionTrashedCount((prev) => Math.max(0, prev - 1));
      setSessionFreedBytes((prev) => Math.max(0, prev - lastAction.item.size));
      triggerFeedback(t('quickReview.undoSuccess'), 'undo');
    }
  };

  // Action: Reveal in Finder
  const handleReveal = async () => {
    if (!currentItem) return;
    try {
      await revealInFinder(currentItem.path);
    } catch (err) {
      console.error('Failed to reveal file:', err);
    }
  };

  // Action: Folder Picker
  const handlePickCustomFolder = async () => {
    const chosen = await pickFolder();
    if (chosen) {
      setCustomPath(chosen);
      setTargetDir('custom');
    }
  };

  // Global Keyboard Navigation Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut keys if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        showRenameModal
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // [ J ] or [ Delete ] / [ Backspace ]: Trash / Delete
      if (key === 'j' || e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleTrash();
      }
      // [ F ] or [ Enter ]: Keep & Advance
      else if (key === 'f' || e.key === 'Enter') {
        e.preventDefault();
        handleKeep();
      }
      // [ R ]: Rename
      else if (key === 'r') {
        e.preventDefault();
        handleOpenRename();
      }
      // [ Space ]: Fullscreen Preview
      else if (e.code === 'Space') {
        e.preventDefault();
        setShowFullscreen((prev) => !prev);
      }
      // [ Z ]: Undo
      else if (key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      // [ O ]: Reveal in Finder
      else if (key === 'o') {
        e.preventDefault();
        handleReveal();
      }
      // [ ArrowLeft ]: Previous file
      else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      }
      // [ ArrowRight ]: Next file
      else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.min(items.length, prev + 1));
      }
      // [ Escape ]: Close fullscreen
      else if (e.key === 'Escape') {
        if (showFullscreen) {
          setShowFullscreen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    currentItem,
    currentIndex,
    items,
    undoStack,
    deleteToTrash,
    showRenameModal,
    showFullscreen,
  ]);

  // Helper for file type icons
  const getFileKindIcon = (kind: string) => {
    switch (kind) {
      case 'image':
        return <ImageIcon size={24} className="text-pink-500" />;
      case 'video':
        return <Film size={24} className="text-purple-500" />;
      case 'audio':
        return <Music size={24} className="text-emerald-500" />;
      case 'document':
        return <FileText size={24} className="text-blue-500" />;
      case 'archive':
        return <Archive size={24} className="text-amber-500" />;
      case 'installer':
        return <Package size={24} className="text-rose-500" />;
      case 'code':
        return <Code2 size={24} className="text-indigo-500" />;
      default:
        return <FileText size={24} className="text-slate-400" />;
    }
  };

  const progressPercent = items.length > 0 ? Math.min(100, (currentIndex / items.length) * 100) : 100;
  const isFinished = items.length > 0 && currentIndex >= items.length;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Top Header */}
      <PageHeader
        icon={<Eye size={20} />}
        iconColor="text-purple-500"
        title={t('quickReview.title')}
        subtitle={t('quickReview.subtitle')}
        badge={
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
            {items.length} {t('quickReview.filesInQueue')}
          </span>
        }
        actions={
          <>
            <button
              type="button"
              onClick={toggleDeleteToTrash}
              title={
                deleteToTrash
                  ? 'Current: Move to macOS Trash (can be restored)'
                  : 'Current: Direct Delete (instantly frees storage)'
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold glass-panel text-slate-700 dark:text-neutral-200 cursor-pointer hover:border-purple-500/40 transition-colors"
            >
              <Trash2 size={13} className={deleteToTrash ? 'text-blue-500' : 'text-rose-500'} />
              <span>
                {t('common.mode')}: {deleteToTrash ? t('common.trashMode') : t('common.directDelete')}
              </span>
            </button>

            <Button
              onClick={() => loadDirectory(currentDirStr, filter)}
              loading={isLoading}
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={13} />}
            >
              {isLoading ? t('common.scanning') : t('common.refresh')}
            </Button>
          </>
        }
      />

      {/* Directory & Kind Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Source Folders */}
        <div className="flex items-center gap-1 p-1 rounded-xl glass-pill w-fit overflow-x-auto">
          <button
            onClick={() => setTargetDir('downloads')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              targetDir === 'downloads'
                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Download size={13} />
            <span>{t('tidyUp.tabDownloads')}</span>
          </button>

          <button
            onClick={() => setTargetDir('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              targetDir === 'desktop'
                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Monitor size={13} />
            <span>{t('tidyUp.tabDesktop')}</span>
          </button>

          <button
            onClick={() => setTargetDir('screenshots')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              targetDir === 'screenshots'
                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Camera size={13} />
            <span>{t('tidyUp.statScreenshots')}</span>
          </button>

          <button
            onClick={() => setTargetDir('pictures')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              targetDir === 'pictures'
                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon size={13} />
            <span>{t('quickReview.tabPictures')}</span>
          </button>

          <button
            onClick={handlePickCustomFolder}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              targetDir === 'custom'
                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FolderInput size={13} />
            <span>{customPath ? customPath.split('/').pop() : t('tidyUp.tabCustom')}</span>
          </button>
        </div>

        {/* Content Type Filter */}
        <div className="flex items-center gap-1 text-xs">
          {(['all', 'images', 'media', 'documents', 'large'] as ReviewFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer capitalize ${
                filter === f
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-black/4 dark:bg-white/6 text-slate-600 dark:text-neutral-400 hover:bg-black/8 dark:hover:bg-white/10'
              }`}
            >
              {f === 'all'
                ? t('common.all')
                : f === 'images'
                ? t('quickReview.filterImages')
                : f === 'media'
                ? t('quickReview.filterMedia')
                : f === 'documents'
                ? t('quickReview.filterDocuments')
                : t('quickReview.filterLarge')}
            </button>
          ))}
        </div>
      </div>

      {/* Progress & Live Session Counter */}
      <div className="p-3 rounded-2xl glass-panel flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="font-semibold text-slate-700 dark:text-neutral-300 shrink-0">
            {items.length > 0 ? (
              <>
                {t('quickReview.itemOf', 'File {current} of {total}', {
                  current: Math.min(currentIndex + 1, items.length),
                  total: items.length,
                })}
              </>
            ) : (
              t('quickReview.noFiles')
            )}
          </span>

          <div className="w-36 h-2 bg-slate-200/80 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-neutral-400">
          <span className="flex items-center gap-1">
            <Trash2 size={12} className="text-rose-500" />
            <strong className="text-rose-600 dark:text-rose-400">{sessionTrashedCount}</strong>{' '}
            {t('quickReview.statTrashed')}
          </span>
          <span className="flex items-center gap-1">
            <Edit3 size={12} className="text-amber-500" />
            <strong className="text-amber-600 dark:text-amber-400">{sessionRenamedCount}</strong>{' '}
            {t('quickReview.actionRename')}
          </span>
          <span className="flex items-center gap-1">
            <Check size={12} className="text-emerald-500" />
            <strong className="text-emerald-600 dark:text-emerald-400">{sessionKeptCount}</strong>{' '}
            {t('quickReview.statKept')}
          </span>
          <span className="flex items-center gap-1">
            <Sparkles size={12} className="text-blue-500" />
            <strong className="text-blue-600 dark:text-blue-400">
              {formatSize(sessionFreedBytes)}
            </strong>{' '}
            {t('quickReview.statFreed')}
          </span>
        </div>
      </div>

      {/* Main Review Card or Session Finished View */}
      {isLoading ? (
        <div className="py-12">
          <CardSkeleton />
        </div>
      ) : isFinished ? (
        /* Completion Card */
        <div className="py-16 px-6 text-center rounded-3xl glass-panel space-y-4 max-w-xl mx-auto animate-fade-in shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20 shadow-xs">
            <FolderCheck size={36} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {t('quickReview.sessionCompletedTitle')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
              {t('quickReview.sessionCompletedDesc', 'You have reviewed all files in this directory.', {
                count: items.length,
              })}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 max-w-md mx-auto">
            <div className="p-3 rounded-2xl bg-black/2 dark:bg-white/4">
              <span className="text-[10px] text-slate-400">{t('quickReview.statTrashed')}</span>
              <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                {sessionTrashedCount}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-black/2 dark:bg-white/4">
              <span className="text-[10px] text-slate-400">{t('quickReview.actionRename')}</span>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {sessionRenamedCount}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-black/2 dark:bg-white/4">
              <span className="text-[10px] text-slate-400">{t('quickReview.statKept')}</span>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {sessionKeptCount}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-black/2 dark:bg-white/4">
              <span className="text-[10px] text-slate-400">{t('quickReview.statFreed')}</span>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {formatSize(sessionFreedBytes)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setCurrentIndex(0);
                loadDirectory(currentDirStr, filter);
              }}
              icon={<RotateCcw size={13} />}
            >
              {t('quickReview.reviewAgain')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePickCustomFolder}
              icon={<FolderInput size={13} />}
            >
              {t('quickReview.pickAnotherFolder')}
            </Button>
          </div>
        </div>
      ) : items.length === 0 ? (
        /* Empty Directory */
        <div className="py-20 text-center rounded-3xl glass-panel max-w-md mx-auto">
          <Eye size={40} className="mx-auto text-slate-300 dark:text-neutral-600 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-neutral-200">
            {t('quickReview.noFilesFoundTitle')}
          </h3>
          <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1 max-w-xs mx-auto">
            {t('quickReview.noFilesFoundDesc')}
          </p>
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={handlePickCustomFolder} icon={<FolderInput size={13} />}>
              {t('quickReview.chooseFolder')}
            </Button>
          </div>
        </div>
      ) : currentItem ? (
        /* Focus Card */
        <div className="relative max-w-3xl mx-auto rounded-3xl glass-panel p-6 shadow-2xl border border-black/6 dark:border-white/8 transition-all">
          {/* Action Feedback Badge Overlay */}
          {actionFeedback && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/10 backdrop-blur-[2px] rounded-3xl pointer-events-none animate-fade-in">
              <div
                className={`px-5 py-2.5 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 ${
                  actionFeedback.type === 'trash'
                    ? 'bg-rose-500 text-white'
                    : actionFeedback.type === 'keep'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {actionFeedback.type === 'trash' ? (
                  <Trash2 size={16} />
                ) : actionFeedback.type === 'keep' ? (
                  <Check size={16} />
                ) : (
                  <Sparkles size={16} />
                )}
                <span>{actionFeedback.text}</span>
              </div>
            </div>
          )}

          {/* Media / Preview Screen */}
          <div className="relative w-full h-80 sm:h-96 rounded-2xl bg-black/3 dark:bg-black/40 border border-black/4 dark:border-white/6 flex items-center justify-center overflow-hidden group">
            {isLoadingThumb ? (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <RefreshCw size={24} className="animate-spin text-blue-500" />
                <span className="text-xs">{t('quickReview.loadingPreview')}</span>
              </div>
            ) : thumbnailUrl ? (
              <div className="relative w-full h-full flex items-center justify-center p-4">
                <img
                  src={thumbnailUrl}
                  alt={currentItem.name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-md cursor-pointer hover:scale-[1.01] transition-transform"
                  onClick={() => setShowFullscreen(true)}
                />
                <button
                  onClick={() => setShowFullscreen(true)}
                  title="Expand to Fullscreen (Space)"
                  className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs cursor-pointer"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            ) : (
              /* Non-image File Icon Box */
              <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="w-20 h-20 rounded-3xl bg-black/4 dark:bg-white/6 flex items-center justify-center border border-black/6 dark:border-white/8 shadow-xs">
                  {getFileKindIcon(currentItem.kind)}
                </div>
                <div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 uppercase">
                    .{currentItem.extension || 'FILE'}
                  </span>
                  <p className="text-xs text-slate-400 mt-1 capitalize">{currentItem.kind} File</p>
                </div>
              </div>
            )}
          </div>

          {/* File Metadata Header */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate" title={currentItem.name}>
                  {currentItem.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 shrink-0">
                  {formatSize(currentItem.size)}
                </span>
              </div>
              <p
                onClick={handleReveal}
                className="text-[11px] font-mono text-slate-400 dark:text-neutral-500 truncate mt-0.5 hover:text-blue-500 cursor-pointer flex items-center gap-1"
                title="Click to reveal in Finder"
              >
                <span>{currentItem.path}</span>
                <ExternalLink size={10} />
              </p>
            </div>

            {/* Navigation Arrows */}
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                title="Previous file (Left Arrow)"
                className="p-2 rounded-xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/10 text-slate-600 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(items.length, prev + 1))}
                title="Next file (Right Arrow)"
                className="p-2 rounded-xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/10 text-slate-600 dark:text-neutral-300 cursor-pointer transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Primary Action Button Row (With Keyboard Badges) */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {/* Trash Action */}
            <button
              onClick={handleTrash}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:border-rose-500/40 transition-all font-semibold text-xs cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <Trash2 size={16} />
              <span>{t('quickReview.actionTrash')}</span>
              <kbd className="ml-1.5 px-1.5 py-0.5 rounded-md bg-rose-500/20 text-[10px] font-mono font-bold text-rose-700 dark:text-rose-300">
                J
              </kbd>
            </button>

            {/* Rename Action */}
            <button
              onClick={handleOpenRename}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-black/4 hover:bg-black/8 dark:bg-white/6 dark:hover:bg-white/12 text-slate-700 dark:text-neutral-200 border border-black/6 dark:border-white/8 transition-all font-semibold text-xs cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <Edit3 size={15} />
              <span>{t('quickReview.actionRename')}</span>
              <kbd className="ml-1.5 px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10 text-[10px] font-mono font-bold text-slate-600 dark:text-neutral-300">
                R
              </kbd>
            </button>

            {/* Keep Action */}
            <button
              onClick={handleKeep}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all font-semibold text-xs cursor-pointer active:scale-[0.98]"
            >
              <Check size={16} strokeWidth={2.5} />
              <span>{t('quickReview.actionKeep')}</span>
              <kbd className="ml-1.5 px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono font-bold text-white">
                F
              </kbd>
            </button>
          </div>

          {/* Bottom Secondary Controls & Undo */}
          <div className="mt-4 pt-4 border-t border-black/4 dark:border-white/6 flex items-center justify-between text-xs text-slate-400 dark:text-neutral-500">
            <div className="flex items-center gap-3">
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>{t('quickReview.actionUndo')}</span>
                <kbd className="text-[10px] font-mono font-semibold">Z</kbd>
              </button>

              <button
                onClick={handleReveal}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <ExternalLink size={12} />
                <span>Finder</span>
                <kbd className="text-[10px] font-mono font-semibold">O</kbd>
              </button>
            </div>

            <span className="text-[11px] font-medium text-slate-400">
              {t('quickReview.shortcutsTip', 'Tip: Press J to delete, F to keep, Space to preview')}
            </span>
          </div>
        </div>
      ) : null}

      {/* Fullscreen Quick Look Modal */}
      {showFullscreen && currentItem && thumbnailUrl && (
        <div
          onClick={() => setShowFullscreen(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in cursor-zoom-out"
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={() => setShowFullscreen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <img
            src={thumbnailUrl}
            alt={currentItem.name}
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
          />

          <div className="mt-4 text-center text-white/80 text-xs">
            <p className="font-bold">{currentItem.name}</p>
            <p className="text-[11px] text-white/50 mt-0.5">
              {formatSize(currentItem.size)} • {currentItem.path}
            </p>
          </div>
        </div>
      )}

      {/* Fast Inline Rename Modal */}
      {showRenameModal && currentItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl glass-panel p-6 shadow-2xl border border-black/8 dark:border-white/10 space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Edit3 size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('quickReview.renameModalTitle')}
                </h3>
                <p className="text-xs text-slate-400">{t('quickReview.renameModalDesc')}</p>
              </div>
            </div>

            <form onSubmit={handleExecuteRename} className="space-y-3">
              <div>
                <input
                  ref={renameInputRef}
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-black/8 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                {renameError && (
                  <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    <span>{renameError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowRenameModal(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={isRenaming}
                  icon={<Check size={13} />}
                >
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
