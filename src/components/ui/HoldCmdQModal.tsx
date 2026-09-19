import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { useTranslation } from '../../lib/i18n';
import { exitApp } from '../../lib/commands';

const HOLD_DURATION_MS = 1200;
const RADIUS = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function HoldCmdQModal() {
  const { t } = useTranslation();
  const { holdCmdQToQuit } = useAppStore();

  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);

  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isHoldingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!holdCmdQToQuit) return;

    const cancelHold = () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      startTimeRef.current = null;
      isHoldingRef.current = false;
      setIsHolding(false);
      setProgress(0);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Meta+Q (macOS Cmd+Q)
      if ((e.metaKey || e.ctrlKey) && (e.key === 'q' || e.key === 'Q')) {
        e.preventDefault();
        e.stopPropagation();

        if (isHoldingRef.current) return;

        isHoldingRef.current = true;
        setIsHolding(true);
        startTimeRef.current = performance.now();

        const tick = (now: number) => {
          if (!isHoldingRef.current || !startTimeRef.current) return;

          const elapsed = now - startTimeRef.current;
          const currentProgress = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
          setProgress(currentProgress);

          if (currentProgress >= 100) {
            // Held for full duration: trigger app quit
            cancelHold();
            exitApp().catch((err) => {
              console.error('Failed to exit app:', err);
            });
          } else {
            animFrameRef.current = requestAnimationFrame(tick);
          }
        };

        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control' || e.key === 'q' || e.key === 'Q') {
        if (isHoldingRef.current) {
          cancelHold();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('blur', cancelHold);

    return () => {
      cancelHold();
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('blur', cancelHold);
    };
  }, [holdCmdQToQuit]);

  if (!isHolding) return null;

  const strokeDashoffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none select-none animate-fade-in">
      {/* Dark frosted glass HUD card */}
      <div className="relative w-64 p-6 rounded-3xl bg-neutral-900/90 dark:bg-black/90 text-white backdrop-blur-2xl border border-white/20 shadow-2xl flex flex-col items-center text-center">
        {/* Progress Radial Ring with App Icon */}
        <div className="relative w-24 h-24 flex items-center justify-center mb-3.5">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
            {/* Background track circle */}
            <circle
              cx="40"
              cy="40"
              r={RADIUS}
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              className="text-white/15"
            />
            {/* Animated progress circle */}
            <circle
              cx="40"
              cy="40"
              r={RADIUS}
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="text-accent transition-all duration-75 ease-linear"
            />
          </svg>

          {/* Centered Beberes Logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="/icon-beberes.webp"
              alt="Logo"
              className="w-12 h-12 rounded-xl drop-shadow-md"
            />
          </div>
        </div>

        <div className="text-sm font-bold text-white tracking-tight">
          {t('holdQuit.title', 'Hold Cmd+Q to Quit')}
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          {t('holdQuit.releaseToCancel', 'Release to cancel')}
        </div>

        {/* Mini progress percentage */}
        <div className="mt-2 text-[10px] font-mono text-accent font-semibold">
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
}
