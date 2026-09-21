import { useState, useEffect } from 'react';
import { useTranslation } from '../lib/i18n';
import {
  Puzzle,
  Globe,
  Layers,
  FolderOpen,
  Trash2,
  RefreshCw,
  CheckCircle2,
  FolderCheck,
  Search,
  ShieldAlert,
  ExternalLink,
  Package,
  HardDrive,
} from 'lucide-react';
import {
  scanBrowserAndSystemPlugins,
  removePluginOrExtension,
  revealInFinder,
  openFullDiskAccessSettings,
  ExtensionItem,
  PluginScanReport,
} from '../lib/commands';
import { formatSize } from '../lib/utils';
import Button from '../components/ui/Button';
import PageHeader from '../components/layout/PageHeader';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import { useAppStore } from '../store/appStore';

export default function PluginManager() {
  const { t } = useTranslation();
  const { cachedPluginReport, setCachedPluginReport } = useAppStore();
  const [report, setReport] = useState<PluginScanReport | null>(cachedPluginReport);
  const [isLoading, setIsLoading] = useState(!cachedPluginReport);
  const [filterType, setFilterType] = useState<'all' | 'browser' | 'system'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [removingPath, setRemovingPath] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchPlugins = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const data = await scanBrowserAndSystemPlugins();
      setReport(data);
      setCachedPluginReport(data);
    } catch {
      setFeedback('Failed to scan browser extensions and system plugins.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!cachedPluginReport) {
      fetchPlugins();
    }
  }, []);

  const handleOpenFDA = async () => {
    try {
      await openFullDiskAccessSettings();
    } catch (e) {
      console.error('Failed to open Full Disk Access settings:', e);
    }
  };

  const handleRemove = async (item: ExtensionItem) => {
    if (removingPath) return;
    setRemovingPath(item.path);
    setFeedback(null);
    try {
      await removePluginOrExtension(item.path);
      setFeedback(`Removed ${item.name} (${formatSize(item.size_bytes)})`);
      setTimeout(() => setFeedback(null), 3500);
      await fetchPlugins();
    } catch {
      setFeedback(`Could not remove ${item.name}`);
      setTimeout(() => setFeedback(null), 3500);
    } finally {
      setRemovingPath(null);
    }
  };

  const filteredItems = (report?.items || []).filter((item) => {
    if (filterType === 'browser' && item.is_system_plugin) return false;
    if (filterType === 'system' && !item.is_system_plugin) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.browser_or_type.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const browserExtCount = (report?.items || []).filter((i) => !i.is_system_plugin).length;
  const systemPluginCount = (report?.items || []).filter((i) => i.is_system_plugin).length;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Standard Beberes PageHeader */}
      <PageHeader
        icon={<Puzzle size={20} />}
        title={t('pluginsManager.title', 'Browser Extensions & macOS Plugins')}
        subtitle={t(
          'pluginsManager.subtitle',
          'Audit and remove forgotten web extensions, QuickLook generators, and system plugins.'
        )}
        actions={
          <Button
            onClick={fetchPlugins}
            loading={isLoading}
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />}
          >
            {t('pluginsManager.rescan', 'Rescan Plugins')}
          </Button>
        }
      />

      {/* Full Disk Access Banner */}
      {report?.permission_denied && (
        <div className="p-5 rounded-3xl glass-panel border border-amber-500/20 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('pluginsManager.fdaTitle', 'Full Disk Access Required to Scan Browser Extensions')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5 max-w-xl">
                {t(
                  'pluginsManager.fdaDesc',
                  'macOS protects browser user profiles (Chrome, Edge, Brave, etc.) from direct access. Grant Full Disk Access to Beberes in macOS System Settings so it can inspect and list your extensions.'
                )}
              </p>
            </div>
          </div>
          <Button
            onClick={handleOpenFDA}
            variant="primary"
            size="sm"
            icon={<ExternalLink size={13} />}
            className="shrink-0"
          >
            {t('pluginsManager.fdaButton', 'Open Privacy Settings')}
          </Button>
        </div>
      )}

      {feedback && (
        <div className="py-2.5 px-4 rounded-2xl bg-accent-subtle border border-accent/20 text-accent text-xs font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} />
          {feedback}
        </div>
      )}

      {/* Top Overview Cards */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl glass-panel flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
              <Package size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                {t('pluginsManager.allPlugins', 'Total Items')}
              </span>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {report.total_count}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-3xl glass-panel flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary-subtle text-secondary-accent flex items-center justify-center shrink-0">
              <HardDrive size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                Occupied Size
              </span>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {formatSize(report.total_size_bytes)}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-3xl glass-panel flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Globe size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                Categories
              </span>
              <p className="text-xs font-semibold text-slate-700 dark:text-neutral-200 mt-0.5">
                {browserExtCount} Browser &bull; {systemPluginCount} System
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Control Bar: Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-3xl glass-panel">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterType === 'all'
                ? 'bg-accent text-white shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {t('pluginsManager.allPlugins', 'All')} ({report?.total_count || 0})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('browser')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterType === 'browser'
                ? 'bg-accent text-white shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {t('pluginsManager.browserExtensions', 'Browser Extensions')} ({browserExtCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('system')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterType === 'system'
                ? 'bg-accent text-white shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {t('pluginsManager.systemPlugins', 'macOS System Plugins')} ({systemPluginCount})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('pluginsManager.searchPlaceholder', 'Search extensions or plugins...')}
            className="w-full pl-8.5 pr-3 py-1.5 rounded-xl bg-black/4 dark:bg-white/5 border border-black/6 dark:border-white/8 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl glass-panel overflow-hidden py-16 text-center w-full">
          <FolderCheck size={36} className="text-slate-300 dark:text-neutral-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-neutral-300">
            {t('pluginsManager.noPlugins', 'No Extensions or Plugins Found')}
          </p>
          <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1">
            {searchQuery
              ? t('pluginsManager.noSearchMatch', 'No items match your search query.')
              : t('pluginsManager.noPluginsDesc', 'No installed plugins found in inspected directories.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-3xl glass-panel flex flex-col justify-between space-y-3 hover:border-black/10 dark:hover:border-white/12 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.icon_data_url ? (
                      <div className="w-9 h-9 rounded-xl bg-white dark:bg-neutral-800 p-1 border border-black/8 dark:border-white/10 flex items-center justify-center shrink-0 shadow-xs">
                        <img
                          src={item.icon_data_url}
                          alt={item.name}
                          className="w-full h-full object-contain rounded-md"
                          onError={(e) => {
                            // Gracefully fallback if image decoding fails
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
                        {item.is_system_plugin ? <Layers size={17} /> : <Globe size={17} />}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={item.name}>
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 truncate">
                        <span className="font-semibold text-accent shrink-0">
                          {item.browser_or_type}
                        </span>
                        <span>&bull;</span>
                        <span className="truncate">v{item.version}</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-neutral-300 px-2 py-0.5 rounded-lg bg-black/4 dark:bg-white/8 shrink-0">
                    {formatSize(item.size_bytes)}
                  </span>
                </div>

                {item.description && (
                  <p className="text-xs text-slate-500 dark:text-neutral-400 line-clamp-2 my-1" title={item.description}>
                    {item.description}
                  </p>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-2.5 border-t border-black/4 dark:border-white/6 text-xs">
                <button
                  type="button"
                  onClick={() => revealInFinder(item.path)}
                  className="text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 transition-colors text-[11px]"
                >
                  <FolderOpen size={12} />
                  {t('pluginsManager.revealInFinder', 'Reveal in Finder')}
                </button>

                <Button
                  variant="ghost"
                  size="sm"
                  loading={removingPath === item.path}
                  onClick={() => handleRemove(item)}
                  className="text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-rose-500/20"
                >
                  <Trash2 size={12} />
                  {removingPath === item.path
                    ? t('pluginsManager.uninstalling', 'Removing...')
                    : t('pluginsManager.uninstall', 'Uninstall')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
