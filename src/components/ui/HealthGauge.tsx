import { ShieldCheck, ShieldAlert, Sparkles } from 'lucide-react';

interface HealthGaugeProps {
  freeSpace: number;
  totalSpace: number;
  cleanableJunk: number;
}

export default function HealthGauge({ freeSpace, totalSpace, cleanableJunk }: HealthGaugeProps) {
  // Compute health score (0-100)
  // Higher free space and lower junk -> higher score
  const freePercent = totalSpace > 0 ? (freeSpace / totalSpace) * 100 : 50;
  const junkPercent = totalSpace > 0 ? (cleanableJunk / totalSpace) * 100 : 0;

  let score = Math.round(freePercent * 0.7 + Math.max(0, 30 - junkPercent * 5));
  score = Math.min(100, Math.max(10, score));

  const isOptimal = score >= 80;
  const isFair = score >= 50 && score < 80;

  const color = isOptimal
    ? 'text-emerald-500'
    : isFair
    ? 'text-amber-500'
    : 'text-rose-500';

  const ringColor = isOptimal
    ? '#10b981'
    : isFair
    ? '#f59e0b'
    : '#ef4444';

  const statusLabel = isOptimal
    ? 'Optimal Health'
    : isFair
    ? 'Good Condition'
    : 'Action Recommended';

  const statusDesc = isOptimal
    ? 'Your SSD has plenty of headroom and low clutter.'
    : isFair
    ? 'Consider running Smart Clean to free up additional SSD space.'
    : 'Storage is running low. Clean junk to maintain peak APFS performance.';

  // SVG ring calculation (radius 36, circumference ~226)
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="p-5 rounded-2xl glass-panel flex items-center gap-6">
      {/* Circular Progress Gauge */}
      <div className="relative flex items-center justify-center shrink-0 w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
          <circle
            cx="44"
            cy="44"
            r={radius}
            className="stroke-slate-100 dark:stroke-neutral-800"
            strokeWidth="7"
            fill="none"
          />
          <circle
            cx="44"
            cy="44"
            r={radius}
            stroke={ringColor}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">
            {score}%
          </span>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5">Health</span>
        </div>
      </div>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          {isOptimal ? (
            <ShieldCheck size={16} className={color} />
          ) : isFair ? (
            <Sparkles size={16} className={color} />
          ) : (
            <ShieldAlert size={16} className={color} />
          )}
          <h4 className={`text-sm font-bold ${color}`}>{statusLabel}</h4>
        </div>
        <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed">
          {statusDesc}
        </p>
      </div>
    </div>
  );
}
