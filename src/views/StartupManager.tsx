import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from '../lib/i18n';
import {
  scanStartupItems,
  toggleStartupItem,
  deleteStartupItem,
  revealInFinder,
  type StartupItem,
} from '../lib/commands';
import { useAppStore } from '../store/appStore';
import PageHeader from '../components/layout/PageHeader';
import ConfirmModal from '../components/ui/ConfirmModal';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import {
  Zap,
  Search,
  ExternalLink,
  Trash2,
  CheckCircle2,
  XCircle,
  Shield,
  User,
  Sliders,
  AlertTriangle,
} from 'lucide-react';

type FilterScope = 'all' | 'user' | 'system' | 'enabled' | 'disabled';

export default function StartupManager() {
  const { t } = useTranslation();
  const { globalRefreshTrigger } = useAppStore();

  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<StartupItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScope, setFilterScope] = useState<FilterScope>('all');
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal for delete item confirmation
  const [targetToDelete, setTargetToDelete] = useState<StartupItem | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await scanStartupItems();
      setItems(res);
    } catch (err) {
      console.error('Failed to scan startup items:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, globalRefreshTrigger]);

  // Toggle item state with optimistic UI update
  const handleToggle = async (item: StartupItem) => {
    const targetState = !item.isEnabled;
    const previousItems = [...items];

    // Optimistic update: flip switch immediately
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              isEnabled: targetState,
              path: targetState
                ? i.path.replace(/\.disabled$/, '')
                : (i.path.endsWith('.disabled') ? i.path : `${i.path}.disabled`),
            }
          : i
      )
    );

    setIsProcessing(true);
    try {
      const success = await toggleStartupItem(item.path, targetState);
      if (!success) {
        // Revert if backend indicated failure
        setItems(previousItems);
      }
    } catch (err) {
      console.error('Failed to toggle startup item:', err);
      // Revert on error
      setItems(previousItems);
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete item
  const handleConfirmDelete = async () => {
    if (!targetToDelete) return;
    setIsProcessing(true);
    try {
      const success = await deleteStartupItem(targetToDelete.path);
      if (success) {
        setItems((prev) => prev.filter((i) => i.id !== targetToDelete.id));
        setTargetToDelete(null);
      }
    } catch (err) {
      console.error('Failed to delete startup item:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Scope filter
      if (filterScope === 'user' && !item.isUser) return false;
      if (filterScope === 'system' && item.isUser) return false;
      if (filterScope === 'enabled' && !item.isEnabled) return false;
      if (filterScope === 'disabled' && item.isEnabled) return false;

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchLabel = item.label.toLowerCase().includes(q);
        const matchPath = item.path.toLowerCase().includes(q);
        const matchProg = item.program ? item.program.toLowerCase().includes(q) : false;
        if (!matchName && !matchLabel && !matchPath && !matchProg) return false;
      }

      return true;
    });
  }, [items, filterScope, searchQuery]);

  // Stats
  const totalCount = items.length;
  const enabledCount = items.filter((i) => i.isEnabled).length;
  const disabledCount = items.filter((i) => !i.isEnabled).length;
  const userCount = items.filter((i) => i.isUser).length;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <PageHeader
        icon={<Zap size={20} />}
        iconColor="text-accent"
        title={t('startupManager.title', 'Startup & Background Services')}
        subtitle={t('startupManager.subtitle', 'Inspect and control macOS LaunchAgents and LaunchDaemons to speed up boot times and reduce background overhead.')}
      />

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
            <Zap size={18} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">{totalCount}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('startupManager.totalItems', 'Total Services')}</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{enabledCount}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('startupManager.enabled', 'Active / Enabled')}</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-slate-500 flex items-center justify-center shrink-0">
            <XCircle size={18} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-600 dark:text-slate-400">{disabledCount}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('startupManager.disabled', 'Disabled')}</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
            <User size={18} />
          </div>
          <div>
            <div className="text-xl font-bold text-accent">{userCount}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('startupManager.userAgents', 'User Agents')}</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel p-3.5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('startupManager.searchPlaceholder', 'Filter by name, identifier, or program...')}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-100/60 dark:bg-slate-800/60 border border-black/4 dark:border-white/4 focus:outline-hidden focus:ring-2 focus:ring-accent text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {(['all', 'user', 'system', 'enabled', 'disabled'] as FilterScope[]).map((scope) => (
            <button
              key={scope}
              onClick={() => setFilterScope(scope)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
                filterScope === scope
                  ? 'bg-accent text-white shadow-xs'
                  : 'bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              {scope === 'all' && t('common.all', 'All')}
              {scope === 'user' && t('startupManager.userScope', 'User')}
              {scope === 'system' && t('startupManager.systemScope', 'System')}
              {scope === 'enabled' && t('startupManager.enabledScope', 'Enabled')}
              {scope === 'disabled' && t('startupManager.disabledScope', 'Disabled')}
            </button>
          ))}
        </div>
      </div>

      {/* Content List */}
      {isLoading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <Sliders size={22} />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {t('startupManager.noItems', 'No Startup Services Found')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? t('startupManager.noSearchResults', 'No services match your search filter criteria.')
              : t('startupManager.cleanSystem', 'Your system startup configuration is clean and optimized.')}
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl overflow-hidden border border-black/4 dark:border-white/4">
          <div className="divide-y divide-black/4 dark:divide-white/4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-black/1.5 dark:hover:bg-white/1.5 transition-colors"
              >
                {/* Info Column */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      item.isEnabled
                        ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400'
                        : 'bg-slate-500/10 text-slate-400'
                    }`}
                  >
                    <Zap size={18} />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {item.name}
                      </span>

                      {/* Scope Badge */}
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          item.isUser
                            ? 'bg-accent-subtle text-accent border border-accent/20'
                            : 'bg-black/5 dark:bg-white/6 text-slate-600 dark:text-neutral-400 border border-black/8 dark:border-white/8'
                        }`}
                      >
                        {item.isUser ? <User size={10} /> : <Shield size={10} />}
                        {item.kindLabel}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          item.isEnabled
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                        }`}
                      >
                        {item.isEnabled
                          ? t('startupManager.active', 'Active')
                          : t('startupManager.inactive', 'Disabled')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                      {item.label}
                    </div>

                    {item.program && (
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate">
                        {item.program}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Column */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {/* Reveal in Finder */}
                  <button
                    onClick={() => revealInFinder(item.path)}
                    title={t('common.revealInFinder', 'Reveal in Finder')}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ExternalLink size={15} />
                  </button>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => handleToggle(item)}
                    disabled={isProcessing}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden ${
                      item.isEnabled ? 'bg-accent' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                    title={item.isEnabled ? t('startupManager.disable', 'Disable') : t('startupManager.enable', 'Enable')}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        item.isEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>

                  {/* Delete Plist */}
                  <button
                    onClick={() => setTargetToDelete(item)}
                    disabled={isProcessing}
                    title={t('startupManager.delete', 'Remove Plist')}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety Notice Card */}
      <div className="glass-panel p-4 rounded-2xl flex items-start gap-3.5 border border-amber-500/20 bg-amber-500/2">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
          <AlertTriangle size={16} />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
            {t('startupManager.securityTip', 'macOS Launch Daemons Notice')}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {t(
              'startupManager.securityTipDesc',
              'Disabling or deleting background services halts automatic launch on login. For system services, administrator credentials may be required by macOS.'
            )}
          </p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {targetToDelete && (
        <ConfirmModal
          isOpen={true}
          title={t('startupManager.deleteTitle', 'Delete Startup Service Plist?')}
          itemsCount={1}
          totalBytes={targetToDelete.fileSize}
          paths={[targetToDelete.path]}
          useTrash={false}
          confirmText={t('common.delete', 'Delete')}
          isLoading={isProcessing}
          onConfirm={handleConfirmDelete}
          onClose={() => setTargetToDelete(null)}
        />
      )}
    </div>
  );
}
