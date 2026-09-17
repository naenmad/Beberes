interface SkeletonLoaderProps {
  lines?: number;
  className?: string;
}

export default function SkeletonLoader({ lines = 3, className = '' }: SkeletonLoaderProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="skeleton h-4 w-4 rounded" />
          <div className="flex-1 space-y-2">
            <div
              className="skeleton h-3 rounded"
              style={{ width: `${70 + Math.random() * 30}%` }}
            />
          </div>
          <div className="skeleton h-3 w-16 rounded" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-slate-100 dark:border-neutral-700 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="skeleton h-10 w-10 rounded-xl" />
        <div className="flex-1">
          <div className="skeleton h-4 w-32 rounded mb-1" />
          <div className="skeleton h-3 w-20 rounded" />
        </div>
      </div>
      <SkeletonLoader lines={3} />
    </div>
  );
}
