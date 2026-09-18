import { useAppStore } from '../../store/appStore';
import { useTranslation } from '../../lib/i18n';
import Button from './Button';
import {
  ShieldCheck,
  Cpu,
  Lock,
  GitBranch,
  X,
  CheckCircle2,
} from 'lucide-react';

export default function AboutModal() {
  const { isAboutModalOpen, closeAboutModal } = useAppStore();
  const { t } = useTranslation();

  if (!isAboutModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in"
      onClick={closeAboutModal}
    >
      <div
        className="w-full max-w-md rounded-3xl glass-panel shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 text-center border-b border-black/4 dark:border-white/6 bg-linear-to-b from-blue-500/4 to-transparent">
          <button
            type="button"
            onClick={closeAboutModal}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/4 dark:hover:bg-white/6 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>

          {/* App Logo */}
          <img
            src="/icon-beberes.webp"
            alt="Beberes"
            className="w-16 h-16 rounded-2xl object-cover mx-auto shadow-lg shadow-blue-500/20 mb-3"
          />

          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('common.appName', 'Beberes')}
          </h2>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 font-mono">v1.0.0</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Apex
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-2 max-w-xs mx-auto leading-relaxed">
            {t('about.subtitle', 'High-Performance System Cleaner & Storage Optimizer for macOS and Developers.')}
          </p>
        </div>

        {/* Info Highlights */}
        <div className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/6 space-y-1">
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                <Cpu size={14} />
                <span>{t('about.engine', 'Core Engine')}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Tauri 2.0 & Rust Native
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/6 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Lock size={14} />
                <span>{t('about.privacy', 'Privacy First')}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                100% On-Device & Offline
              </p>
            </div>
          </div>

          {/* Architecture Details */}
          <div className="p-3 rounded-2xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/6 space-y-2">
            <div className="flex items-center gap-2 text-slate-700 dark:text-neutral-300 font-semibold">
              <ShieldCheck size={14} className="text-blue-500" />
              <span>{t('about.safetyHighlights', 'Safety & Precision Highlights')}</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-500 dark:text-neutral-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                <span>{t('about.highlight1', 'Native macOS Trash integration with put-back capability')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                <span>{t('about.highlight2', 'Protected system whitelist prevents accidental OS damage')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                <span>{t('about.highlight3', 'Smart dev workspace cleaner for node_modules, venv, and caches')}</span>
              </li>
            </ul>
          </div>

          {/* Copyright & License */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
            <span>License: GPL-3.0 (Open Source)</span>
            <span className="flex items-center gap-1 text-slate-500 dark:text-neutral-400">
              <GitBranch size={11} /> main-build
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-black/2 dark:bg-white/2 border-t border-black/4 dark:border-white/6 flex items-center justify-end">
          <Button variant="primary" size="sm" onClick={closeAboutModal}>
            {t('common.close', 'Close')}
          </Button>
        </div>
      </div>
    </div>
  );
}
