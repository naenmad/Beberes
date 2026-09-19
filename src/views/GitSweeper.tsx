import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { useTranslation } from '../lib/i18n';
import {
  scanGitRepos,
  optimizeGitRepo,
  pickFolder,
  revealInFinder,
  type GitRepoItem,
} from '../lib/commands';
import { formatSize } from '../lib/utils';
import Button from '../components/ui/Button';
import PageHeader from '../components/layout/PageHeader';
import ConfirmModal from '../components/ui/ConfirmModal';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import {
  GitBranch,
  FolderGit2,
  Folder,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Layers,
  Check,
  Search,
} from 'lucide-react';

export default function GitSweeper() {
  const { t } = useTranslation();
  const { recordCleanResult, globalRefreshTrigger } = useAppStore();

  const [isLoading, setIsLoading] = useState(true);
  const [repos, setRepos] = useState<GitRepoItem[]>([]);
  const [searchRoot, setSearchRoot] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteMerged, setDeleteMerged] = useState(true);
  const [optimizingRepoPath, setOptimizingRepoPath] = useState<string | null>(null);
  const [isOptimizingAll, setIsOptimizingAll] = useState(false);
  const [showOptimizeAllModal, setShowOptimizeAllModal] = useState(false);

  const loadData = useCallback(async (root?: string) => {
    setIsLoading(true);
    try {
      const results = await scanGitRepos(root || undefined);
      setRepos(results);
    } catch (err) {
      console.error('Failed to scan git repos:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(searchRoot || undefined);
  }, [loadData, searchRoot, globalRefreshTrigger]);

  // Pick custom folder root
  const handleSelectRoot = async () => {
    try {
      const folder = await pickFolder();
      if (folder) {
        setSearchRoot(folder);
        loadData(folder);
      }
    } catch (err) {
      console.error('Failed to pick search root:', err);
    }
  };

  // Optimize single repository
  const handleOptimizeSingle = async (repo: GitRepoItem) => {
    setOptimizingRepoPath(repo.path);
    try {
      const freed = await optimizeGitRepo(repo.path, deleteMerged);
      recordCleanResult(
        freed,
        1,
        false,
        [t('gitSweeper.title', 'Git Sweeper')]
      );
      // Re-scan to get refreshed git folder size
      loadData(searchRoot || undefined);
    } catch (err) {
      console.error('Failed to optimize repository:', err);
    } finally {
      setOptimizingRepoPath(null);
    }
  };

  // Optimize all repositories
  const handleOptimizeAll = async () => {
    setShowOptimizeAllModal(false);
    setIsOptimizingAll(true);
    let totalFreed = 0;
    let count = 0;

    try {
      for (const repo of repos) {
        try {
          const freed = await optimizeGitRepo(repo.path, deleteMerged);
          totalFreed += freed;
          count++;
        } catch (e) {
          console.warn(`Could not optimize ${repo.path}:`, e);
        }
      }

      if (totalFreed > 0 || count > 0) {
        recordCleanResult(
          totalFreed,
          count,
          false,
          [t('gitSweeper.title', 'Git Sweeper')]
        );
      }
      loadData(searchRoot || undefined);
    } catch (err) {
      console.error('Failed optimizing all git repos:', err);
    } finally {
      setIsOptimizingAll(false);
    }
  };

  // Filtered repos
  const filteredRepos = useMemo(() => {
    if (!searchQuery.trim()) return repos;
    const q = searchQuery.toLowerCase();
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.path.toLowerCase().includes(q) ||
        r.activeBranch.toLowerCase().includes(q)
    );
  }, [repos, searchQuery]);

  // Stats
  const totalGitSize = repos.reduce((sum, r) => sum + r.gitFolderSize, 0);
  const reposWithMerged = repos.filter((r) => r.mergedBranches.length > 0).length;
  const reposWithUncommitted = repos.filter((r) => r.uncommittedChanges).length;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <PageHeader
        icon={<GitBranch size={20} />}
        iconColor="text-purple-500"
        title={t('gitSweeper.title', 'Git Repository Sweeper')}
        subtitle={t('gitSweeper.subtitle', 'Reclaim disk space across local git repos with aggressive garbage collection and branch pruning.')}
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSelectRoot}
              variant="secondary"
              size="sm"
              icon={<Folder size={13} />}
            >
              {searchRoot ? searchRoot.split('/').pop() : t('gitSweeper.changeFolder', 'Select Folder')}
            </Button>

            <Button
              variant="primary"
              size="sm"
              disabled={repos.length === 0 || isOptimizingAll}
              loading={isOptimizingAll}
              onClick={() => setShowOptimizeAllModal(true)}
              icon={<Sparkles size={13} />}
            >
              {t('gitSweeper.optimizeAll', 'Optimize All Repos')}
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
            <FolderGit2 size={18} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">{repos.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('gitSweeper.reposFound', 'Repositories')}</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Layers size={18} />
          </div>
          <div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatSize(totalGitSize)}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('gitSweeper.totalGitSize', 'Total .git Size')}</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <GitBranch size={18} />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{reposWithMerged}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('gitSweeper.withMergedBranches', 'With Merged Branches')}</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <AlertCircle size={18} />
          </div>
          <div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{reposWithUncommitted}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('gitSweeper.uncommitted', 'Uncommitted Changes')}</div>
          </div>
        </div>
      </div>

      {/* Options & Search Bar */}
      <div className="glass-panel p-3.5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('gitSweeper.searchPlaceholder', 'Filter repositories by name or path...')}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-100/60 dark:bg-slate-800/60 border border-black/4 dark:border-white/4 focus:outline-hidden focus:ring-2 focus:ring-purple-500/30 text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>

        {/* Options Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300 self-start md:self-center select-none">
          <input
            type="checkbox"
            checked={deleteMerged}
            onChange={(e) => setDeleteMerged(e.target.checked)}
            className="w-4 h-4 rounded-sm border-slate-300 text-purple-600 focus:ring-purple-500/30"
          />
          <span>{t('gitSweeper.pruneMergedOption', 'Also prune local merged branches')}</span>
        </label>
      </div>

      {/* Repositories List */}
      {isLoading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredRepos.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <FolderGit2 size={22} />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {t('gitSweeper.noReposFound', 'No Git Repositories Found')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {t('gitSweeper.noReposDesc', 'No repositories found in the chosen root directory. Click "Select Folder" to scan a different workspace.')}
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl overflow-hidden border border-black/4 dark:border-white/4">
          <div className="divide-y divide-black/4 dark:divide-white/4">
            {filteredRepos.map((repo) => (
              <div
                key={repo.id}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-black/1.5 dark:hover:bg-white/1.5 transition-colors"
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <FolderGit2 size={18} />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {repo.name}
                      </span>

                      {/* Active Branch */}
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-black/6 dark:border-white/6 inline-flex items-center gap-1">
                        <GitBranch size={10} />
                        {repo.activeBranch}
                      </span>

                      {/* Merged Branches Badge */}
                      {repo.mergedBranches.length > 0 && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {repo.mergedBranches.length} merged
                        </span>
                      )}

                      {/* Uncommitted Changes Badge */}
                      {repo.uncommittedChanges ? (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
                          <AlertCircle size={10} />
                          {t('gitSweeper.dirty', 'Uncommitted')}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 inline-flex items-center gap-1">
                          <Check size={10} />
                          {t('gitSweeper.clean', 'Clean')}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                      {repo.path}
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                      <span>{t('gitSweeper.gitSize', '.git size: {size}', { size: formatSize(repo.gitFolderSize) })}</span>
                      {repo.lastCommitDate && (
                        <span>{t('gitSweeper.lastCommitDate', 'Last commit: {date}', { date: repo.lastCommitDate })}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => revealInFinder(repo.path)}
                    title={t('common.revealInFinder', 'Reveal in Finder')}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ExternalLink size={15} />
                  </button>

                  <Button
                    variant="secondary"
                    size="sm"
                    loading={optimizingRepoPath === repo.path}
                    disabled={optimizingRepoPath !== null || isOptimizingAll}
                    onClick={() => handleOptimizeSingle(repo)}
                    icon={<Sparkles size={13} />}
                  >
                    {t('gitSweeper.optimize', 'Optimize')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimize All Modal */}
      <ConfirmModal
        isOpen={showOptimizeAllModal}
        title={t('gitSweeper.optimizeAllTitle', 'Optimize All Repositories?')}
        itemsCount={repos.length}
        totalBytes={totalGitSize}
        paths={repos.map((r) => r.path)}
        useTrash={false}
        confirmText={t('gitSweeper.startOptimization', 'Start Optimization')}
        isLoading={isOptimizingAll}
        onConfirm={handleOptimizeAll}
        onClose={() => setShowOptimizeAllModal(false)}
      />
    </div>
  );
}
