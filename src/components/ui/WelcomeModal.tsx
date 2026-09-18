import { useState, useEffect } from 'react';
import { useTranslation } from '../../lib/i18n';
import { openFullDiskAccessSettings } from '../../lib/commands';
import Button from './Button';
import {
  ExternalLink,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  FolderTree,
  Code2,
  Trash2,
  Command,
  RefreshCw,
  Layers,
} from 'lucide-react';

const ONBOARDING_KEY = 'beberes_has_onboarded';

export default function WelcomeModal() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [hasOpenedSettings, setHasOpenedSettings] = useState(false);

  useEffect(() => {
    try {
      const onboarded = localStorage.getItem(ONBOARDING_KEY);
      if (onboarded !== 'true') {
        setIsOpen(true);
      }
    } catch {
      setIsOpen(false);
    }
  }, []);

  const handleOpenSettings = async () => {
    try {
      await openFullDiskAccessSettings();
      setHasOpenedSettings(true);
    } catch (err) {
      console.error('Failed to open Full Disk Access settings:', err);
    }
  };

  const handleComplete = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (err) {
      console.error('Failed to save onboarding flag:', err);
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl glass-panel-modal border border-white/20 dark:border-white/10 shadow-2xl p-7 flex flex-col items-center text-center overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Step Progress Indicators */}
        <div className="w-full flex items-center justify-between mb-5">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-8 bg-blue-500'
                    : s < step
                    ? 'w-4 bg-blue-500/40'
                    : 'w-4 bg-black/10 dark:bg-white/10'
                }`}
              />
            ))}
          </div>

          <span className="text-[11px] font-mono font-semibold text-slate-400 dark:text-neutral-500">
            {step} / 3
          </span>
        </div>

        {/* STEP 1: WELCOME & CAPABILITIES */}
        {step === 1 && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            {/* Official Beberes Logo */}
            <div className="relative mb-3.5">
              <img
                src="/icon-beberes.webp"
                alt="Beberes Logo"
                className="w-20 h-20 rounded-2xl shadow-xl shadow-blue-500/20 drop-shadow-md select-none pointer-events-none"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white dark:border-neutral-900 shadow-xs">
                <Sparkles size={12} />
              </div>
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('welcome.step1Title', 'Welcome to Beberes')}
            </h2>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 mt-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-semibold">
              <span>{t('welcome.step1Subtitle', 'Next-Gen Mac Cleaning & Optimization • Apex Edition')}</span>
            </div>

            <p className="text-xs text-slate-600 dark:text-neutral-300 mt-2.5 max-w-sm leading-relaxed">
              {t('welcome.step1Desc', 'Beberes keeps your Mac swift, clean, and spacious with native Rust-powered scanning.')}
            </p>

            {/* 4 Feature Pillars Grid */}
            <div className="w-full grid grid-cols-2 gap-2 mt-5 text-left">
              <div className="p-3 rounded-2xl bg-black/2 dark:bg-white/4 border border-black/4 dark:border-white/6 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <Sparkles size={14} className="text-blue-500 shrink-0" />
                  <span>{t('welcome.pillarCleanTitle', 'Deep System Clean')}</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-neutral-400 leading-tight">
                  {t('welcome.pillarCleanDesc', 'Safely purge Xcode caches, browser data, and system logs.')}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-black/2 dark:bg-white/4 border border-black/4 dark:border-white/6 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <FolderTree size={14} className="text-indigo-500 shrink-0" />
                  <span>{t('welcome.pillarTidyTitle', 'Intelligent File Tidy')}</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-neutral-400 leading-tight">
                  {t('welcome.pillarTidyDesc', 'Declutter downloads, hunt massive duplicates, and organize files.')}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-black/2 dark:bg-white/4 border border-black/4 dark:border-white/6 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <Code2 size={14} className="text-emerald-500 shrink-0" />
                  <span>{t('welcome.pillarDevTitle', 'Developer Workspace')}</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-neutral-400 leading-tight">
                  {t('welcome.pillarDevDesc', 'Wipe gigabytes of stale node_modules, build targets, and git trees.')}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-black/2 dark:bg-white/4 border border-black/4 dark:border-white/6 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <Trash2 size={14} className="text-rose-500 shrink-0" />
                  <span>{t('welcome.pillarSafetyTitle', 'Zero-Risk Trash Safety')}</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-neutral-400 leading-tight">
                  {t('welcome.pillarSafetyDesc', 'All cleans route to macOS Trash by default. Never lose active data.')}
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="w-full mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleComplete}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 cursor-pointer"
              >
                {t('welcome.skip', 'Skip for now')}
              </button>

              <Button
                onClick={() => setStep(2)}
                variant="primary"
                size="md"
                className="px-6 shadow-md shadow-blue-500/20"
                icon={<ArrowRight size={14} />}
              >
                {t('welcome.next', 'Continue')}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: MACOS PERMISSION SETUP */}
        {step === 2 && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3.5 border border-amber-500/20">
              <Lock size={32} />
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('welcome.step2Title', 'macOS Permission Setup')}
            </h2>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1">
              {t('welcome.step2Subtitle', 'Grant Full Disk Access for Complete Scanning')}
            </p>

            <p className="text-xs text-slate-600 dark:text-neutral-300 mt-2.5 max-w-md leading-relaxed text-center">
              {t(
                'welcome.step2Desc',
                'macOS protects deep Library caches and user trash from third-party apps. Granting Full Disk Access enables Beberes to inspect and clean comprehensively without permission errors.'
              )}
            </p>

            {/* Step-by-Step Instructions Card */}
            <div className="w-full mt-4 p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 text-left flex flex-col gap-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                Quick 3-Step Guide:
              </div>

              <div className="space-y-1.5 text-xs text-slate-700 dark:text-neutral-200">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>{t('welcome.step2Action1', "Click 'Open System Settings' below")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>{t('welcome.step2Action2', 'Under Privacy & Security > Full Disk Access, find Beberes')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span>{t('welcome.step2Action3', 'Toggle switch to ON (enter Mac password if prompted)')}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={handleOpenSettings}
                  variant={hasOpenedSettings ? 'secondary' : 'primary'}
                  size="sm"
                  icon={<ExternalLink size={13} />}
                >
                  {hasOpenedSettings
                    ? t('welcome.reopenSettings', 'Re-open Settings')
                    : t('welcome.openSettings', 'Open System Settings')}
                </Button>
              </div>
            </div>

            {/* Navigation */}
            <div className="w-full mt-6 flex items-center justify-between gap-3">
              <Button
                onClick={() => setStep(1)}
                variant="secondary"
                size="md"
                icon={<ArrowLeft size={14} />}
              >
                {t('welcome.back', 'Back')}
              </Button>

              <Button
                onClick={() => setStep(3)}
                variant="primary"
                size="md"
                className="px-6 shadow-md shadow-blue-500/20"
                icon={<ArrowRight size={14} />}
              >
                {t('welcome.next', 'Continue')}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: READY TO GO & TIPS */}
        {step === 3 && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3.5 border border-emerald-500/20">
              <CheckCircle2 size={32} />
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('welcome.step3Title', "You're All Set!")}
            </h2>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              {t('welcome.step3Subtitle', 'Experience a Faster, Lighter Mac')}
            </p>

            <p className="text-xs text-slate-600 dark:text-neutral-300 mt-2.5 max-w-sm leading-relaxed text-center">
              {t('welcome.step3Desc', 'Beberes is fully primed and ready to optimize your machine.')}
            </p>

            {/* Quick Tips List */}
            <div className="w-full space-y-2 mt-5 text-left">
              <div className="p-3 rounded-2xl bg-black/2 dark:bg-white/4 border border-black/4 dark:border-white/6 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                  <Command size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {t('welcome.tip1Title', 'Quick Spotlight')}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                    {t('welcome.tip1Desc', 'Press Cmd+K anytime to jump straight to any tool or trigger a scan.')}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-black/2 dark:bg-white/4 border border-black/4 dark:border-white/6 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
                  <Layers size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {t('welcome.tip2Title', 'Trash vs Direct Delete')}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                    {t('welcome.tip2Desc', 'Switch deletion modes anytime directly from the TopBar toggle.')}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-black/2 dark:bg-white/4 border border-black/4 dark:border-white/6 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                  <RefreshCw size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {t('welcome.tip3Title', 'TopBar Universal Scan')}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                    {t('welcome.tip3Desc', 'Click the Refresh button on top right to rescan whatever view you are in.')}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="w-full mt-6 flex items-center justify-between gap-3">
              <Button
                onClick={() => setStep(2)}
                variant="secondary"
                size="md"
                icon={<ArrowLeft size={14} />}
              >
                {t('welcome.back', 'Back')}
              </Button>

              <Button
                onClick={handleComplete}
                variant="primary"
                size="lg"
                className="flex-1 justify-center py-2.5 text-sm font-bold shadow-lg shadow-blue-500/25"
                icon={<Sparkles size={15} />}
              >
                {t('welcome.launchApp', 'Launch Beberes')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
