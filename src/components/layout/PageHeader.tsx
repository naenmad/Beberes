interface PageHeaderProps {
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export default function PageHeader({
  icon,
  iconBgColor,
  iconColor = 'text-accent',
  title,
  subtitle,
  badge,
  actions,
}: PageHeaderProps) {
  const bgClass = iconBgColor || 'bg-accent-subtle';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-0.5">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs border border-black/4 dark:border-white/6 ${bgClass} ${iconColor}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
              {title}
            </h1>
            {badge}
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5 truncate max-w-2xl">
            {subtitle}
          </p>
        </div>
      </div>

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
