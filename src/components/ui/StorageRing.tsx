import { formatSize, percentage } from '../../lib/utils';

interface StorageRingProps {
  used: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}

export default function StorageRing({
  used,
  total,
  size = 80,
  strokeWidth = 6,
}: StorageRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = percentage(used, total);
  const offset = circumference - (percent / 100) * circumference;

  const getColor = () => {
    if (percent > 90) return '#f43f5e'; // rose
    if (percent > 70) return '#f59e0b'; // amber
    return '#10b981'; // emerald
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100 dark:text-neutral-700"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.8s ease-out',
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-sm font-bold text-slate-800 dark:text-white leading-none">
          {percent}%
        </span>
        <span className="text-[9px] text-slate-400 dark:text-neutral-500 mt-0.5">
          {formatSize(used)}
        </span>
      </div>
    </div>
  );
}
