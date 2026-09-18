import { useState } from 'react';
import { formatSize, percentage } from '../../lib/utils';
import { HardDrive, Sparkles, Code2, FolderOpen, ShieldCheck } from 'lucide-react';

interface StorageBreakdownProps {
  totalSpace: number;
  usedSpace: number;
  freeSpace: number;
  systemJunkSize: number;
  devJunkSize: number;
}

export default function StorageBreakdownBar({
  totalSpace,
  usedSpace,
  freeSpace,
  systemJunkSize,
  devJunkSize,
}: StorageBreakdownProps) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  // Calculate segment breakdown
  const cleanableTotal = systemJunkSize + devJunkSize;
  const otherUsed = Math.max(0, usedSpace - cleanableTotal);

  const segments = [
    {
      id: 'system',
      label: 'System & Applications',
      size: otherUsed,
      color: 'bg-blue-500',
      textColor: 'text-blue-500',
      icon: <FolderOpen size={13} />,
    },
    {
      id: 'dev',
      label: 'Developer Caches',
      size: devJunkSize,
      color: 'bg-violet-500',
      textColor: 'text-violet-500',
      icon: <Code2 size={13} />,
    },
    {
      id: 'junk',
      label: 'Cleanable Junk',
      size: systemJunkSize,
      color: 'bg-rose-500',
      textColor: 'text-rose-500',
      icon: <Sparkles size={13} />,
    },
    {
      id: 'free',
      label: 'Available Free Space',
      size: freeSpace,
      color: 'bg-emerald-400 dark:bg-emerald-500/80',
      textColor: 'text-emerald-500',
      icon: <ShieldCheck size={13} />,
    },
  ];

  return (
    <div className="p-5 rounded-2xl glass-panel space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HardDrive size={18} className="text-blue-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
            Macintosh HD Storage Breakdown
          </h3>
        </div>
        <div className="text-xs text-slate-500 dark:text-neutral-400">
          <span className="font-semibold text-slate-800 dark:text-neutral-200">
            {formatSize(freeSpace)}
          </span>{' '}
          available of {formatSize(totalSpace)} ({percentage(usedSpace, totalSpace)}% used)
        </div>
      </div>

      {/* Segmented Bar */}
      <div className="relative w-full h-4 rounded-full overflow-hidden bg-slate-100 dark:bg-neutral-800 flex p-0.5 gap-0.5 shadow-inner">
        {segments.map((seg) => {
          const widthPercent = totalSpace > 0 ? (seg.size / totalSpace) * 100 : 0;
          if (widthPercent < 0.5) return null;

          const isHovered = hoveredSegment === seg.id;

          return (
            <div
              key={seg.id}
              onMouseEnter={() => setHoveredSegment(seg.id)}
              onMouseLeave={() => setHoveredSegment(null)}
              className={`h-full rounded-xs transition-all duration-300 cursor-pointer ${seg.color} ${
                isHovered ? 'brightness-110 scale-y-110 shadow-sm z-10' : 'opacity-90'
              }`}
              style={{ width: `${widthPercent}%` }}
              title={`${seg.label}: ${formatSize(seg.size)} (${widthPercent.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Legend Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {segments.map((seg) => {
          const percent = totalSpace > 0 ? (seg.size / totalSpace) * 100 : 0;
          const isHovered = hoveredSegment === seg.id;

          return (
            <div
              key={seg.id}
              onMouseEnter={() => setHoveredSegment(seg.id)}
              onMouseLeave={() => setHoveredSegment(null)}
              className={`flex items-center gap-2.5 p-2 rounded-xl transition-colors cursor-pointer ${
                isHovered ? 'bg-black/4 dark:bg-white/6' : ''
              }`}
            >
              <div className={`p-1.5 rounded-lg bg-black/3 dark:bg-white/6 ${seg.textColor}`}>
                {seg.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-slate-400 dark:text-neutral-400 truncate">
                  {seg.label}
                </p>
                <p className="text-xs font-bold text-slate-800 dark:text-white">
                  {formatSize(seg.size)}{' '}
                  <span className="text-[10px] font-normal text-slate-400">
                    ({percent.toFixed(0)}%)
                  </span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
