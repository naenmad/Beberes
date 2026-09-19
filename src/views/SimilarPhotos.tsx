import { useState, useEffect } from 'react';
import {
  Images,
  Sparkles,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Check,
  FolderOpen,
} from 'lucide-react';
import {
  scanSimilarPhotos,
  deleteSimilarPhotos,
  revealInFinder,
  SimilarMediaScanResult,
} from '../lib/commands';
import { convertFileSrc } from '@tauri-apps/api/core';
import { formatSize } from '../lib/utils';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function SimilarPhotos() {
  const [result, setResult] = useState<SimilarMediaScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const startScan = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const data = await scanSimilarPhotos();
      setResult(data);

      // Auto-select duplicates (non-recommended items)
      const toSelect = new Set<string>();
      data.groups.forEach((g) => {
        g.items.forEach((item) => {
          if (!item.is_recommended_keep) {
            toSelect.add(item.path);
          }
        });
      });
      setSelectedPaths(toSelect);
    } catch {
      setFeedback('Failed to scan photos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    startScan();
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

  const handleClean = async () => {
    if (selectedPaths.size === 0 || isDeleting) return;
    setIsDeleting(true);
    setFeedback(null);
    try {
      const paths = Array.from(selectedPaths);
      const freed = await deleteSimilarPhotos(paths, true);
      setFeedback(`Moved ${paths.length} similar photos to Trash, freed ${formatSize(freed)}`);
      setTimeout(() => setFeedback(null), 4000);
      await startScan();
    } catch {
      setFeedback('Error deleting selected photos.');
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedBytes = result?.groups.reduce((sum, g) => {
    return (
      sum +
      g.items
        .filter((i) => selectedPaths.has(i.path))
        .reduce((s, i) => s + i.size_bytes, 0)
    );
  }, 0) || 0;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Images className="w-6 h-6 text-emerald-500" />
            Similar & Burst Photo Hunter
          </h1>
          <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">
            Detect identical or slightly modified photos, burst shots, and accumulated screenshot series using perceptual hashing (pHash).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={startScan}
            loading={isLoading}
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />}
          >
            Rescan Photos
          </Button>
          <Button
            onClick={handleClean}
            disabled={selectedPaths.size === 0 || isDeleting}
            loading={isDeleting}
            variant="danger"
            size="sm"
            icon={<Trash2 size={13} />}
          >
            Clean Selected ({selectedPaths.size}) • {formatSize(selectedBytes)}
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="py-2.5 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          {feedback}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-500" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Analyzing visual signatures...
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Generating 64-bit difference hashes and checking perceptual distance in Pictures and Downloads.
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && result && result.groups.length === 0 && (
        <Card>
          <CardBody className="py-16 text-center text-slate-400">
            <Sparkles className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              No Similar or Burst Photos Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
              Your photo albums and screenshot libraries are tidy. No redundant similar media was detected.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Results Groups */}
      {!isLoading && result && result.groups.length > 0 && (
        <div className="space-y-6">
          {/* Summary bar */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Images size={20} />
              </div>
              <div>
                <span className="text-xs text-slate-400">Detected Media Duplication</span>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {result.groups.length} Similar Groups ({result.total_similar_count} Photos)
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Reclaimable Space</span>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                {formatSize(result.total_reclaimable_bytes)}
              </div>
            </div>
          </div>

          {/* Groups List */}
          {result.groups.map((group, gIdx) => (
            <div
              key={group.group_id}
              className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    Group #{gIdx + 1}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                    {group.similarity_percentage}% Visual Similarity
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {group.items.length} variants • Reclaim {formatSize(group.reclaimable_bytes)}
                </span>
              </div>

              {/* Side-by-Side Comparison Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {group.items.map((item) => {
                  const isSelected = selectedPaths.has(item.path);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleSelect(item.path)}
                      className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-rose-500/50 bg-rose-500/5 dark:bg-rose-500/10 shadow-xs'
                          : item.is_recommended_keep
                          ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10'
                          : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      {/* Image Thumbnail */}
                      <div className="relative w-full h-36 bg-black/5 dark:bg-black/30 rounded-lg overflow-hidden flex items-center justify-center mb-2">
                        <img
                          src={convertFileSrc(item.path)}
                          alt={item.filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />

                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {item.is_recommended_keep && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold shadow-md flex items-center gap-1">
                              <Check size={10} />
                              Best Quality
                            </span>
                          )}
                        </div>

                        <div className="absolute top-2 right-2">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                              isSelected
                                ? 'bg-rose-500 border-rose-500 text-white'
                                : 'bg-white/80 dark:bg-slate-900/80 border-slate-300 dark:border-white/20'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            revealInFinder(item.path);
                          }}
                          title="Reveal in Finder"
                          className="absolute bottom-2 right-2 p-1.5 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                        >
                          <FolderOpen size={12} />
                        </button>
                      </div>

                      {/* Info Details */}
                      <div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-white truncate" title={item.filename}>
                          {item.filename}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
                          <span>{item.width}x{item.height}</span>
                          <span>{formatSize(item.size_bytes)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
