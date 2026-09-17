import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { pickFolder, getSystemDetails, clearIconCache } from '../lib/commands';
import type { SystemDetails } from '../lib/commands';
import { formatSize } from '../lib/utils';
import { useTranslation } from '../lib/i18n';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import PageHeader from '../components/layout/PageHeader';
import {
  Shield,
  FolderPlus,
  X,
  Plus,
  AlertTriangle,
  FolderOpen,
  History,
  Trash2,
  Sun,
  Moon,
  Type,
  Laptop,
  HardDrive,
  Cpu,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Check,
  Globe,
  Sparkles,
} from 'lucide-react';

type SettingsTab = 'general' | 'appearance' | 'folders' | 'system' | 'data';

export default function Settings() {
  const {
    // Theme & Appearance
    isDarkMode,
    toggleDarkMode,
    uiScale,
    setUiScale,

    // Deletion & Safety
    deleteToTrash,
    toggleDeleteToTrash,
    alwaysConfirmClean,
    setAlwaysConfirmClean,
    showSafetyNotice,
    setShowSafetyNotice,

    // Folders & Whitelist
    whitelistPaths,
    customScanPaths,
    addWhitelistPath,
    removeWhitelistPath,
    addCustomScanPath,
    removeCustomScanPath,

    // Data & History
    lifetimeBytesFreed,
    cleanHistory,
    clearCleanHistory,
    resetAllSettings,
  } = useAppStore();

  const { t, language, setLanguage, supportedLanguages } = useTranslation();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [newWhitelistPath, setNewWhitelistPath] = useState('');
  const [newCustomPath, setNewCustomPath] = useState('');
  const [systemDetails, setSystemDetails] = useState<SystemDetails | null>(null);
  const [isLoadingSystem, setIsLoadingSystem] = useState(false);
  const [isClearingIconCache, setIsClearingIconCache] = useState(false);
  const [iconCacheClearedMsg, setIconCacheClearedMsg] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Load system details on mount
  useEffect(() => {
    fetchSystemDetails();
  }, []);

  const fetchSystemDetails = async () => {
    setIsLoadingSystem(true);
    try {
      const details = await getSystemDetails();
      setSystemDetails(details);
    } catch (err) {
      console.error('Failed to fetch system details:', err);
    } finally {
      setIsLoadingSystem(false);
    }
  };

  const handleClearIconCache = async () => {
    setIsClearingIconCache(true);
    try {
      const count = await clearIconCache();
      setIconCacheClearedMsg(t('settings.systemInfo.clearIconSuccess', { count }));
      await fetchSystemDetails();
      setTimeout(() => setIconCacheClearedMsg(null), 4000);
    } catch (err) {
      console.error('Failed to clear icon cache:', err);
    } finally {
      setIsClearingIconCache(false);
    }
  };

  const handleAddWhitelist = () => {
    const trimmed = newWhitelistPath.trim();
    if (trimmed && !whitelistPaths.includes(trimmed)) {
      addWhitelistPath(trimmed);
      setNewWhitelistPath('');
    }
  };

  const handleBrowseWhitelist = async () => {
    const chosen = await pickFolder();
    if (chosen) {
      setNewWhitelistPath(chosen);
    }
  };

  const handleAddCustom = () => {
    const trimmed = newCustomPath.trim();
    if (trimmed && !customScanPaths.includes(trimmed)) {
      addCustomScanPath(trimmed);
      setNewCustomPath('');
    }
  };

  const handleBrowseCustom = async () => {
    const chosen = await pickFolder();
    if (chosen) {
      setNewCustomPath(chosen);
    }
  };

  const handleResetDefaults = () => {
    resetAllSettings();
    setShowResetConfirm(false);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl pb-16">
      {/* Top Header */}
      <PageHeader
        icon={<Sliders size={20} />}
        iconColor="text-slate-600 dark:text-neutral-300"
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
      />

      {/* Segmented Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl glass-panel border border-black/[0.06] dark:border-white/[0.08] overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'general'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
          }`}
        >
          <Sliders size={14} />
          <span>{t('settings.tabs.general')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'appearance'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
          }`}
        >
          <Type size={14} />
          <span>{t('settings.tabs.appearance')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('folders')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'folders'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
          }`}
        >
          <Shield size={14} />
          <span>{t('settings.tabs.folders')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'system'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
          }`}
        >
          <Laptop size={14} />
          <span>{t('settings.tabs.system')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('data')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'data'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
          }`}
        >
          <History size={14} />
          <span>{t('settings.tabs.data')}</span>
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* 1. GENERAL & SAFETY */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Display Language Selection Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-500">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                    {t('settings.language.title')}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-neutral-500">
                    {t('settings.language.desc')}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {supportedLanguages.map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <div
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/5 shadow-sm'
                          : 'border-slate-200 dark:border-neutral-700/60 hover:bg-slate-50 dark:hover:bg-neutral-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center font-mono font-bold text-xs uppercase text-slate-700 dark:text-neutral-300">
                          {lang.code}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {lang.nativeName}
                          </h4>
                          <span className="text-[11px] text-slate-400 dark:text-neutral-400">
                            {lang.name}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Contributor note */}
              <div className="mt-3.5 p-3 rounded-xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-100 dark:border-neutral-700/40 text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-2">
                <Sparkles size={14} className="text-amber-500 shrink-0" />
                <span>{t('settings.language.contributeTip')}</span>
              </div>
            </CardBody>
          </Card>

          {/* Deletion Mode */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-500">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                    {t('settings.deletionMode.title')}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-neutral-500">
                    {t('settings.deletionMode.desc')}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Trash Option */}
                <div
                  onClick={() => !deleteToTrash && toggleDeleteToTrash()}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    deleteToTrash
                      ? 'border-blue-500 bg-blue-500/5 shadow-sm'
                      : 'border-slate-200 dark:border-neutral-700/60 hover:bg-slate-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Trash2 size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {t('settings.deletionMode.trashTitle')}
                        </h4>
                        <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                          {t('settings.deletionMode.trashBadge')}
                        </span>
                      </div>
                    </div>
                    {deleteToTrash && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-3 leading-relaxed">
                    {t('settings.deletionMode.trashDesc')}
                  </p>
                </div>

                {/* Direct Delete Option */}
                <div
                  onClick={() => deleteToTrash && toggleDeleteToTrash()}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    !deleteToTrash
                      ? 'border-rose-500 bg-rose-500/5 shadow-sm'
                      : 'border-slate-200 dark:border-neutral-700/60 hover:bg-slate-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <AlertTriangle size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {t('settings.deletionMode.directTitle')}
                        </h4>
                        <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 tracking-wider">
                          {t('settings.deletionMode.directBadge')}
                        </span>
                      </div>
                    </div>
                    {!deleteToTrash && (
                      <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-3 leading-relaxed">
                    {t('settings.deletionMode.directDesc')}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Operational Safety Controls */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-500">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                    {t('settings.safety.title')}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-neutral-500">
                    {t('settings.safety.desc')}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="divide-y divide-slate-100 dark:divide-neutral-700/60">
                {/* Confirm Dialog Toggle */}
                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-neutral-200">
                      {t('settings.safety.confirmDialog')}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-neutral-400">
                      {t('settings.safety.confirmDialogDesc')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAlwaysConfirmClean(!alwaysConfirmClean)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      alwaysConfirmClean ? 'bg-blue-500' : 'bg-slate-300 dark:bg-neutral-600'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                        alwaysConfirmClean ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Safety Notice Banner Toggle */}
                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-neutral-200">
                      {t('settings.safety.safetyNotice')}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-neutral-400">
                      {t('settings.safety.safetyNoticeDesc')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSafetyNotice(!showSafetyNotice)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      showSafetyNotice ? 'bg-blue-500' : 'bg-slate-300 dark:bg-neutral-600'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                        showSafetyNotice ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* 2. APPEARANCE & TYPOGRAPHY SCALE */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          {/* Theme Mode */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-500">
                  {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                    {t('settings.appearance.themeTitle')}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-neutral-500">
                    {t('settings.appearance.themeDesc')}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => !isDarkMode && toggleDarkMode()}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isDarkMode
                      ? 'border-blue-500 bg-blue-500/5 shadow-sm'
                      : 'border-slate-200 dark:border-neutral-700/60 hover:bg-slate-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-neutral-800 text-amber-400 border border-neutral-700">
                      <Moon size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {t('settings.appearance.darkTitle')}
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-neutral-400">
                        {t('settings.appearance.darkDesc')}
                      </p>
                    </div>
                  </div>
                  {isDarkMode && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>

                <div
                  onClick={() => isDarkMode && toggleDarkMode()}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    !isDarkMode
                      ? 'border-blue-500 bg-blue-500/5 shadow-sm'
                      : 'border-slate-200 dark:border-neutral-700/60 hover:bg-slate-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-500 border border-amber-200">
                      <Sun size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {t('settings.appearance.lightTitle')}
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-neutral-400">
                        {t('settings.appearance.lightDesc')}
                      </p>
                    </div>
                  </div>
                  {!isDarkMode && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Typography & Text Size Scaling */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-500">
                  <Type size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                    {t('settings.textScale.title')}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-neutral-500">
                    {t('settings.textScale.desc')}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Compact */}
                <div
                  onClick={() => setUiScale('compact')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    uiScale === 'compact'
                      ? 'border-blue-500 bg-blue-500/5 shadow-sm'
                      : 'border-slate-200 dark:border-neutral-700/60 hover:bg-slate-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-700 text-slate-700 dark:text-neutral-200">
                      14px • 87.5%
                    </span>
                    {uiScale === 'compact' && (
                      <div className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t('settings.textScale.compact')}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                    {t('settings.textScale.compactDesc')}
                  </p>
                </div>

                {/* Normal */}
                <div
                  onClick={() => setUiScale('normal')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    uiScale === 'normal'
                      ? 'border-blue-500 bg-blue-500/5 shadow-sm'
                      : 'border-slate-200 dark:border-neutral-700/60 hover:bg-slate-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      16px • 100%
                    </span>
                    {uiScale === 'normal' && (
                      <div className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t('settings.textScale.default')}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                    {t('settings.textScale.defaultDesc')}
                  </p>
                </div>

                {/* Large */}
                <div
                  onClick={() => setUiScale('large')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    uiScale === 'large'
                      ? 'border-blue-500 bg-blue-500/5 shadow-sm'
                      : 'border-slate-200 dark:border-neutral-700/60 hover:bg-slate-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-700 text-slate-700 dark:text-neutral-200">
                      18px • 112.5%
                    </span>
                    {uiScale === 'large' && (
                      <div className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t('settings.textScale.spacious')}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                    {t('settings.textScale.spaciousDesc')}
                  </p>
                </div>
              </div>

              {/* Real-time Typography Preview Box */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-100 dark:border-neutral-700/40">
                <span className="text-[11px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
                  {t('settings.textScale.previewTitle')}
                </span>
                <p className="text-base font-semibold text-slate-800 dark:text-white mt-1">
                  {t('settings.textScale.previewText')}
                </p>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  {t('settings.textScale.previewNote', { scale: uiScale.toUpperCase() })}
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* 3. FOLDERS & WHITELIST */}
      {activeTab === 'folders' && (
        <div className="space-y-6">
          {/* Whitelist Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-500">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                    {t('settings.whitelist.title')}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-neutral-500">
                    {t('settings.whitelist.desc')}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {/* Quick Presets */}
              <div className="mb-3">
                <span className="text-[11px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
                  {t('settings.whitelist.quickAdd')}
                </span>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {['~/Desktop', '~/Documents', '~/Pictures', '.git'].map((preset) => {
                    const isAdded = whitelistPaths.includes(preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => !isAdded && addWhitelistPath(preset)}
                        disabled={isAdded}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                          isAdded
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-100 dark:bg-neutral-700 text-slate-600 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-600'
                        }`}
                      >
                        {isAdded ? `Protected: ${preset}` : `+ Protect ${preset}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Path listing */}
              <div className="space-y-2">
                {whitelistPaths.map((path) => {
                  const isCoreSystem = ['/System', '/Library/CoreServices', '/usr', '/bin', '/sbin'].includes(path);
                  return (
                    <div
                      key={path}
                      className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 dark:bg-neutral-700/30 group border border-slate-100 dark:border-neutral-700/30"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle size={14} className={isCoreSystem ? 'text-amber-500' : 'text-blue-500'} />
                        <span className="text-xs text-slate-700 dark:text-neutral-200 truncate font-mono">
                          {path}
                        </span>
                        {isCoreSystem && (
                          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-neutral-500 px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.05]">
                            {t('settings.whitelist.systemLocked')}
                          </span>
                        )}
                      </div>
                      {!isCoreSystem && (
                        <button
                          onClick={() => removeWhitelistPath(path)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-600 text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
                          title="Remove"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add custom path input */}
              <div className="flex gap-2 mt-3.5">
                <input
                  type="text"
                  value={newWhitelistPath}
                  onChange={(e) => setNewWhitelistPath(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddWhitelist()}
                  placeholder={t('settings.whitelist.addPlaceholder')}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono"
                />
                <Button
                  variant="secondary"
                  onClick={handleBrowseWhitelist}
                  size="sm"
                  icon={<FolderOpen size={14} />}
                >
                  {t('common.browse')}
                </Button>
                <Button onClick={handleAddWhitelist} size="sm" icon={<Plus size={14} />}>
                  {t('settings.whitelist.addPath')}
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Custom Scan Directories */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-500">
                  <FolderPlus size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                    {t('settings.customPaths.title')}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-neutral-500">
                    {t('settings.customPaths.desc')}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {customScanPaths.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {customScanPaths.map((path) => (
                    <div
                      key={path}
                      className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 dark:bg-neutral-700/30 group border border-slate-100 dark:border-neutral-700/30"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderOpen size={14} className="text-blue-500 shrink-0" />
                        <span className="text-xs text-slate-700 dark:text-neutral-200 truncate font-mono">
                          {path}
                        </span>
                      </div>
                      <button
                        onClick={() => removeCustomScanPath(path)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-600 text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-neutral-500 mb-3">
                  {t('settings.customPaths.empty')}
                </p>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCustomPath}
                  onChange={(e) => setNewCustomPath(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                  placeholder={t('settings.customPaths.addPlaceholder')}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono"
                />
                <Button
                  variant="secondary"
                  onClick={handleBrowseCustom}
                  size="sm"
                  icon={<FolderOpen size={14} />}
                >
                  {t('common.browse')}
                </Button>
                <Button onClick={handleAddCustom} size="sm" icon={<Plus size={14} />}>
                  {t('settings.customPaths.addDirectory')}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* 4. SYSTEM DIAGNOSTICS */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* Hardware & OS Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500">
                    <Laptop size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                      {t('settings.systemInfo.title')}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-neutral-500">
                      {t('settings.systemInfo.desc')}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={fetchSystemDetails}
                  loading={isLoadingSystem}
                  icon={<RefreshCw size={13} />}
                >
                  {t('common.refresh')}
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {systemDetails ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-100 dark:border-neutral-700/40">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-neutral-400 text-xs">
                      <Laptop size={14} />
                      <span>{t('settings.systemInfo.os')}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                      {systemDetails.osName} {systemDetails.osVersion}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-100 dark:border-neutral-700/40">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-neutral-400 text-xs">
                      <Cpu size={14} />
                      <span>{t('settings.systemInfo.arch')}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 uppercase font-mono">
                      {systemDetails.arch}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-100 dark:border-neutral-700/40">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-neutral-400 text-xs">
                      <HardDrive size={14} />
                      <span>{t('settings.systemInfo.fileSystem')}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 font-mono">
                      {systemDetails.fileSystem}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-100 dark:border-neutral-700/40">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-neutral-400 text-xs">
                      <Laptop size={14} />
                      <span>{t('settings.systemInfo.hostname')}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 font-mono truncate">
                      {systemDetails.hostname}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-100 dark:border-neutral-700/40">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-neutral-400 text-xs">
                      <Cpu size={14} />
                      <span>{t('settings.systemInfo.kernel')}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 font-mono text-xs truncate">
                      {systemDetails.kernelVersion || 'Darwin Kernel'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-100 dark:border-neutral-700/40">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-neutral-400 text-xs">
                      <ShieldCheck size={14} className="text-emerald-500" />
                      <span>{t('settings.systemInfo.engine')}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 font-mono text-xs">
                      {t('settings.systemInfo.engineVal')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 dark:text-neutral-500">
                  {t('settings.systemInfo.loading')}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Application Icon Cache Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-500">
                  <HardDrive size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                    {t('settings.systemInfo.iconCacheTitle')}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-neutral-500">
                    {t('settings.systemInfo.iconCacheDesc')}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-100 dark:border-neutral-700/40">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {t('settings.systemInfo.iconCacheStats', {
                      count: systemDetails?.iconCacheCount || 0,
                      size: formatSize(systemDetails?.iconCacheBytes || 0),
                    })}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-neutral-400 mt-0.5">
                    {t('settings.systemInfo.iconCacheTip')}
                  </p>
                  {iconCacheClearedMsg && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1.5">
                      <CheckCircle2 size={13} />
                      {iconCacheClearedMsg}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleClearIconCache}
                  loading={isClearingIconCache}
                  disabled={(systemDetails?.iconCacheCount || 0) === 0}
                  icon={<Trash2 size={13} />}
                >
                  {t('settings.systemInfo.clearIconCache')}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* 5. STORAGE & RESET */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          {/* Lifetime Storage Reclaimed */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                    {t('settings.dataReset.title')}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-neutral-500">
                    {t('settings.dataReset.desc')}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/40 dark:border-emerald-800/30">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {t('settings.dataReset.totalReclaimed')}
                  </span>
                  <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-300 mt-1">
                    {formatSize(lifetimeBytesFreed)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/40 dark:border-blue-800/30">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                    {t('settings.dataReset.sessions')}
                  </span>
                  <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-300 mt-1">
                    {t('settings.dataReset.sessionsCount', { count: cleanHistory.length })}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-neutral-700/60">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-neutral-200">
                    {t('settings.dataReset.cleanupLogs')}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-neutral-400">
                    {t('settings.dataReset.cleanupLogsDesc')}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={clearCleanHistory}
                  disabled={cleanHistory.length === 0}
                  icon={<Trash2 size={13} />}
                >
                  {t('settings.dataReset.clearHistory')}
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Reset All Preferences (Factory Reset) */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                    {t('settings.dataReset.resetTitle')}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-neutral-500">
                    {t('settings.dataReset.resetDesc')}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-neutral-200">
                    {t('settings.dataReset.resetAction')}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-neutral-400">
                    {t('settings.dataReset.resetActionDesc')}
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowResetConfirm(true)}
                  icon={<RotateCcw size={13} />}
                >
                  {t('settings.dataReset.resetButton')}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Confirmation Dialog for Factory Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setShowResetConfirm(false)}
          />
          <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-neutral-800 p-6 shadow-2xl border border-slate-200 dark:border-neutral-700 overflow-hidden animate-scale-in z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('settings.dataReset.modalTitle')}
                </h4>
                <p className="text-xs text-slate-400 dark:text-neutral-400">
                  {t('settings.dataReset.modalDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6">
              <Button size="sm" variant="secondary" onClick={() => setShowResetConfirm(false)}>
                {t('common.cancel')}
              </Button>
              <Button size="sm" variant="danger" onClick={handleResetDefaults} icon={<RotateCcw size={14} />}>
                {t('settings.dataReset.confirmReset')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
