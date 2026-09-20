import { useState, useEffect } from 'react';
import { useTranslation } from '../lib/i18n';
import {
  Images,
  Sparkles,
  Trash2,
  CheckCircle2,
  RefreshCw,
  FolderOpen,
  FolderCheck,
  CheckCheck,
} from 'lucide-react';
import {
  scanSimilarPhotos,
  deleteSimilarPhotos,
  revealInFinder,
  SimilarMediaScanResult,
} from '../lib/commands';
import { convertFileSrc } from '@tauri-apps/api/core';
import { formatSize } from '../lib/utils';
import Button from '../components/ui/Button';
import Checkbox from '../components/ui/Checkbox';
import PageHeader from '../components/layout/PageHeader';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import { useAppStore } from '../store/appStore';

export default function SimilarPhotos() {
  const { t } = useTranslation();
  const { cachedSimilarPhotos, setCachedSimilarPhotos } = useAppStore();
  const [result, setResult] = useState<SimilarMediaScanResult | null>(cachedSimilarPhotos);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(() => {
    if (!cachedSimilarPhotos) return new Set();
    const toSelect = new Set<string>();
    cachedSimilarPhotos.groups.forEach((g) => {
      g.items.forEach((item) => {
        if (!item.is_recommended_keep) {
          toSelect.add(item.path);
        }
      });
    });
    return toSelect;
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const startScan = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const data = await scanSimilarPhotos();
      setResult(data);
      setCachedSimilarPhotos(data);

      // Auto-select duplicates (non-recommended keep items)
      const toSelect = new Set<string>();
      data.groups.forEach((g) => {
        g.items.forEach((item) => {
          if (!item.is_recommended_keep) {
            toSelect.add(item.path);
          }
        });
      });
      setSelectedPaths(toSelect);
    } catch (err) {
      console.error('Failed to scan similar photos:', err);
      setFeedback('Failed to scan photo library.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!cachedSimilarPhotos) {
      startScan();
    }
  }, []);

  const toggleSelect = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const selectGroupDuplicates = (groupPaths: string[], keepPath?: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      groupPaths.forEach((p) => {
        if (p !== keepPath) {
          next.add(p);
        } else {
          next.delete(p);
        }
      });
      return next;
    });
  };

  const handleClean = async () => {
    if (selectedPaths.size === 0 || isDeleting) return;
    setIsDeleting(true);
    setFeedback(null);
    try {
      const paths = Array.from(selectedPaths);
      const freed = await deleteSimilarPhotos(paths, true);
      setFeedback(
        t('similarPhotos.cleanedSuccess', 'Moved {count} similar photos to Trash ({size} freed)')
          .replace('{count}', paths.length.toString())
          .replace('{size}', formatSize(freed))
      );
      setTimeout(() => setFeedback(null), 4000);
      await startScan();
    } catch {
      setFeedback('Error moving selected photos to Trash.');
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedBytes =
    result?.groups.reduce((sum, g) => {
      return (
        sum +
        g.items
          .filter((i) => selectedPaths.has(i.path))
          .reduce((s, i) => s + i.size_bytes, 0)
      );
    }, 0) || 0;

  const totalReclaimableAll =
    result?.total_reclaimable_bytes || 0;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Standard Beberes PageHeader */}
      <PageHeader
        icon={<Images size={20} />}
        title={t('similarPhotos.title', 'Similar & Burst Photos')}
        subtitle={t(
          'similarPhotos.subtitle',
          'Visually cluster redundant camera shots and bursts, keeping only the best quality photo.'
        )}
        actions={
          <Button
            onClick={startScan}
            loading={isLoading}
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />}
          >
            {t('similarPhotos.scanPhotos', 'Scan Photos')}
          </Button>
        }
      />

      {feedback && (
        <div className="py-2.5 px-4 rounded-2xl bg-accent-subtle border border-accent/20 text-accent text-xs font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} />
          {feedback}
        </div>
      )}

      {/* Top Overview Cards */}
      {result && result.groups.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl glass-panel flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
              <Images size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                {t('similarPhotos.clustersFound', 'Photo Clusters')}
              </span>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {result.groups.length}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-3xl glass-panel flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                {t('similarPhotos.reclaimable', 'Reclaimable Space')}
              </span>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {formatSize(totalReclaimableAll)}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-3xl glass-panel flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                Selected for Cleanup
              </span>
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                {selectedPaths.size} ({formatSize(selectedBytes)})
              </p>
            </div>

            <Button
              variant="danger"
              size="sm"
              loading={isDeleting}
              disabled={selectedPaths.size === 0}
              icon={<Trash2 size={13} />}
              onClick={handleClean}
            >
              Clean
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : !result || result.groups.length === 0 ? (
        <div className="rounded-2xl glass-panel overflow-hidden py-16 text-center w-full space-y-3">
          <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <FolderCheck size={32} />
          </div>
          <h2 className="text-base font-bold text-slate-800 dark:text-neutral-100">
            {t('similarPhotos.noDuplicates', 'No Similar Photos Found')}
          </h2>
          <p className="text-xs text-slate-400">
            {t(
              'similarPhotos.noDuplicatesDesc',
              'Your photo library has no redundant burst shots or similar photos.'
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {result.groups.map((group, groupIdx) => {
            const bestItem = group.items.find((i) => i.is_recommended_keep) || group.items[0];
            const allPaths = group.items.map((i) => i.path);

            return (
              <div key={groupIdx} className="p-5 rounded-3xl glass-panel space-y-4">
                {/* Cluster Header */}
                <div className="flex items-center justify-between pb-3 border-b border-black/4 dark:border-white/6 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-accent-subtle text-accent">
                      Cluster #{groupIdx + 1}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-neutral-400">
                      {group.items.length} photos &bull; {formatSize(group.reclaimable_bytes)} reclaimable
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => selectGroupDuplicates(allPaths, bestItem?.path)}
                    className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                  >
                    <CheckCheck size={14} />
                    Select Similar (Keep Best)
                  </button>
                </div>

                {/* Photos Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {group.items.map((item) => {
                    const isSelected = selectedPaths.has(item.path);

                    return (
                      <div
                        key={item.path}
                        onClick={() => toggleSelect(item.path)}
                        className={`rounded-2xl glass-panel p-2.5 space-y-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-rose-500/50 bg-rose-500/5 shadow-xs'
                            : item.is_recommended_keep
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : 'hover:border-black/10 dark:hover:border-white/12'
                        }`}
                      >
                        <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5">
                          <img
                            src={convertFileSrc(item.path)}
                            alt={item.filename}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />

                          {/* Checkbox badge */}
                          <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleSelect(item.path)}
                            />
                          </div>

                          {/* Keep or Similar badge */}
                          <div className="absolute top-2 right-2 z-10">
                            {item.is_recommended_keep ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs">
                                Keep
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-md">
                                Similar
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="text-[11px] space-y-0.5 pt-0.5">
                          <p className="font-bold text-slate-800 dark:text-neutral-100 truncate" title={item.filename}>
                            {item.filename}
                          </p>
                          <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                            <span>{formatSize(item.size_bytes)}</span>
                            <span>{item.width}x{item.height}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-1.5 border-t border-black/4 dark:border-white/6 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              revealInFinder(item.path);
                            }}
                            className="text-[10px] text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 transition-colors"
                          >
                            <FolderOpen size={11} />
                            Finder
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
