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
  Sparkles,
  Search,
  ShieldAlert,
  ExternalLink,
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

export default function PluginManager() {
  const { t } = useTranslation();
  const [report, setReport] = useState<PluginScanReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
    } catch {
      setFeedback('Failed to scan browser extensions and system plugins.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
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

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Puzzle className="w-6 h-6 text-emerald-500" />
            {t('pluginsManager.title', 'Browser Extensions & macOS Plugin Manager')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">
            {t(
              'pluginsManager.subtitle',
              'Audit and uninstall forgotten web extensions, QuickLook preview generators, Spotlight importers, and Audio plugins.'
            )}
          </p>
        </div>

        <Button
          onClick={fetchPlugins}
          loading={isLoading}
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />}
        >
          {t('pluginsManager.rescan', 'Rescan Plugins')}
        </Button>
      </div>

      {/* Full Disk Access Banner */}
      {report?.permission_denied && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold">
                {t('pluginsManager.fdaTitle', 'Full Disk Access Required to Scan Browser Extensions')}
              </h4>
              <p className="text-xs text-amber-700/90 dark:text-amber-300/90 mt-0.5">
                {t(
                  'pluginsManager.fdaDesc',
                  'macOS protects browser user profiles (Chrome, Edge, Brave, etc.) from direct access. Grant Full Disk Access to Beberes in macOS System Settings so it can inspect and list your extensions.'
                )}
              </p>
            </div>
          </div>
          <Button
            onClick={handleOpenFDA}
            variant="secondary"
            size="sm"
            icon={<ExternalLink size={13} />}
            className="shrink-0 text-xs border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
          >
            {t('pluginsManager.fdaButton', 'Open Privacy Settings')}
          </Button>
        </div>
      )}

      {feedback && (
        <div className="py-2.5 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          {feedback}
        </div>
      )}

      {/* Control Bar: Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === 'all'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {t('pluginsManager.allPlugins', 'All Plugins')} ({report?.total_count || 0})
          </button>
          <button
            onClick={() => setFilterType('browser')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === 'browser'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {t('pluginsManager.browserExtensions', 'Browser Extensions')}
          </button>
          <button
            onClick={() => setFilterType('system')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === 'system'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {t('pluginsManager.systemPlugins', 'macOS System Plugins')}
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('pluginsManager.searchPlaceholder', 'Search extensions or plugins...')}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-500" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('pluginsManager.scanning', 'Scanning browser manifest stores and system bundles...')}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredItems.length === 0 && (
        <div className="py-16 text-center text-slate-400 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 p-6">
          {report?.permission_denied ? (
            <div className="max-w-md mx-auto space-y-3">
              <ShieldAlert className="w-12 h-12 mx-auto text-amber-500" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                {t('pluginsManager.fdaEmptyTitle', 'Browser Profiles Protected by macOS')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                {t(
                  'pluginsManager.fdaEmptyDesc',
                  'Beberes cannot inspect Google Chrome or Microsoft Edge extensions without Full Disk Access. Click below to grant access in System Settings.'
                )}
              </p>
              <div className="pt-2">
                <Button
                  onClick={handleOpenFDA}
                  variant="primary"
                  size="sm"
                  icon={<ExternalLink size={13} />}
                >
                  {t('pluginsManager.fdaButton', 'Open Privacy Settings')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-2">
              <Sparkles className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                {t('pluginsManager.noPlugins', 'No Extensions or Plugins Found')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                {searchQuery
                  ? t('pluginsManager.noSearchMatch', 'No items match your search query.')
                  : t('pluginsManager.noPluginsDesc', 'No installed plugins found in inspected directories.')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* List */}
      {!isLoading && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/20 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                      {item.is_system_plugin ? <Layers size={18} /> : <Globe size={18} />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={item.name}>
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 truncate">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                          {item.browser_or_type}
                        </span>
                        <span>&bull;</span>
                        <span className="truncate">v{item.version}</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-neutral-300 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 shrink-0">
                    {formatSize(item.size_bytes)}
                  </span>
                </div>

                {item.description && (
                  <p className="text-xs text-slate-500 dark:text-neutral-400 line-clamp-2 my-2" title={item.description}>
                    {item.description}
                  </p>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => revealInFinder(item.path)}
                  className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 transition-colors"
                >
                  <FolderOpen size={13} />
                  {t('pluginsManager.revealInFinder', 'Reveal in Finder')}
                </button>

                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  disabled={removingPath === item.path}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={12} />
                  {removingPath === item.path
                    ? t('pluginsManager.uninstalling', 'Removing...')
                    : t('pluginsManager.uninstall', 'Uninstall')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
