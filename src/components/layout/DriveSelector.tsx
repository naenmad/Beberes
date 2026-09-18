import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { useTranslation } from '../../lib/i18n';
import { formatSize } from '../../lib/utils';
import {
  HardDrive,
  Usb,
  ChevronDown,
  Check,
  RefreshCw,
} from 'lucide-react';

interface DriveSelectorProps {
  isCollapsed: boolean;
}

export default function DriveSelector({ isCollapsed }: DriveSelectorProps) {
  const { t } = useTranslation();
  const {
    availableDisks,
    selectedDiskMount,
    setSelectedDiskMount,
    refreshDisks,
  } = useAppStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredTooltip, setHoveredTooltip] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-detect and refresh drives on mount and periodically
  useEffect(() => {
    refreshDisks();

    const interval = setInterval(() => {
      refreshDisks();
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshDisks]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const activeDisk = availableDisks.find((d) => d.mountPoint === selectedDiskMount) || availableDisks[0] || {
    id: 'internal_primary',
    name: 'Macintosh HD',
    mountPoint: '/',
    totalSpace: 0,
    usedSpace: 0,
    freeSpace: 0,
    isRemovable: false,
    fileSystem: 'APFS',
  };

  const usedPercent = activeDisk.totalSpace > 0
    ? Math.min(100, Math.round((activeDisk.usedSpace / activeDisk.totalSpace) * 100))
    : 0;

  const handleManualRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    await refreshDisks();
    setIsRefreshing(false);
  };

  return (
    <div ref={containerRef} className="relative mb-1">
      {/* Trigger Button */}
      {!isCollapsed ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full flex items-center justify-between gap-2 p-2 rounded-2xl
            text-left cursor-pointer transition-all duration-150
            border border-black/4 dark:border-white/6
            ${isOpen ? 'bg-blue-500/10 border-blue-500/30' : 'bg-black/2 dark:bg-white/3 hover:bg-black/5 dark:hover:bg-white/6'}
          `}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className={`
                w-8 h-8 rounded-xl flex items-center justify-center shrink-0
                ${activeDisk.isRemovable ? 'bg-amber-500/15 text-amber-500' : 'bg-blue-500/15 text-blue-500'}
              `}
            >
              {activeDisk.isRemovable ? <Usb size={16} /> : <HardDrive size={16} />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-neutral-200 truncate">
                  {activeDisk.name}
                </span>
                {activeDisk.isRemovable && (
                  <span className="text-[9px] px-1 py-0.2 rounded font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                    USB
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-12 h-1 bg-black/8 dark:bg-white/10 rounded-full overflow-hidden shrink-0">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usedPercent > 90 ? 'bg-rose-500' : usedPercent > 75 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${usedPercent}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 dark:text-neutral-500 truncate">
                  {formatSize(activeDisk.freeSpace)} {t('common.free', 'free')}
                </span>
              </div>
            </div>
          </div>

          <ChevronDown
            size={13}
            className={`text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-blue-500' : ''}`}
          />
        </button>
      ) : (
        /* Collapsed Mode Trigger */
        <>
          <button
            type="button"
            onClick={() => {
              setHoveredTooltip(null);
              setIsOpen(!isOpen);
            }}
            onMouseEnter={(e) => {
              if (!isCollapsed || isOpen) return;
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredTooltip({ x: rect.right + 10, y: rect.top + rect.height / 2 });
            }}
            onMouseLeave={() => setHoveredTooltip(null)}
            className={`
              w-full flex items-center justify-center p-2.5 rounded-xl cursor-pointer
              transition-all duration-150 relative
              ${isOpen ? 'bg-blue-500/15 text-blue-500' : 'text-slate-600 dark:text-neutral-400 hover:bg-black/4 dark:hover:bg-white/6'}
            `}
          >
            {activeDisk.isRemovable ? (
              <Usb size={16} className="text-amber-500 shrink-0" />
            ) : (
              <HardDrive size={16} className="shrink-0" />
            )}

            {activeDisk.isRemovable && (
              <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-neutral-900" />
            )}
          </button>

          {isCollapsed && !isOpen && hoveredTooltip && (
            <div
              style={{ left: `${hoveredTooltip.x}px`, top: `${hoveredTooltip.y}px` }}
              className="fixed -translate-y-1/2 z-50 pointer-events-none whitespace-nowrap rounded-xl px-2.5 py-1 text-xs font-semibold bg-slate-900/90 text-white dark:bg-neutral-800/95 dark:text-white shadow-xl border border-black/10 dark:border-white/10 backdrop-blur-xl animate-fade-in"
            >
              {activeDisk.name} ({formatSize(activeDisk.freeSpace)} {t('common.free', 'free')})
            </div>
          )}
        </>
      )}

      {/* Dropdown Floating Menu */}
      {isOpen && (
        <div
          className={`
            absolute z-50 p-2 rounded-2xl glass-panel shadow-2xl border border-black/8 dark:border-white/10
            animate-fade-in
            ${
              isCollapsed
                ? 'left-full ml-2 bottom-0 w-64'
                : 'bottom-full mb-2 left-0 right-0'
            }
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-black/4 dark:border-white/6">
            <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
              {t('drive.storageDevices', 'Storage Devices')}
            </span>
            <button
              type="button"
              onClick={handleManualRefresh}
              title={t('common.refresh', 'Refresh Drives')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/8 cursor-pointer"
            >
              <RefreshCw size={11} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Drive List */}
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {availableDisks.map((disk) => {
              const isSelected = disk.mountPoint === selectedDiskMount;
              const diskPercent = disk.totalSpace > 0
                ? Math.min(100, Math.round((disk.usedSpace / disk.totalSpace) * 100))
                : 0;

              return (
                <button
                  key={disk.id}
                  type="button"
                  onClick={() => {
                    setSelectedDiskMount(disk.mountPoint);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left cursor-pointer
                    transition-all duration-150
                    ${
                      isSelected
                        ? 'bg-blue-500 text-white shadow-xs'
                        : 'text-slate-700 dark:text-neutral-300 hover:bg-black/4 dark:hover:bg-white/6'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`
                        w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                        ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : disk.isRemovable
                            ? 'bg-amber-500/15 text-amber-500'
                            : 'bg-blue-500/15 text-blue-500'
                        }
                      `}
                    >
                      {disk.isRemovable ? <Usb size={14} /> : <HardDrive size={14} />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold truncate">
                          {disk.name}
                        </span>
                        {disk.isRemovable && (
                          <span
                            className={`text-[8px] px-1 py-0.2 rounded font-semibold shrink-0 ${
                              isSelected
                                ? 'bg-white/25 text-white'
                                : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            USB
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`text-[10px] truncate ${
                            isSelected ? 'text-white/80' : 'text-slate-400 dark:text-neutral-500'
                          }`}
                        >
                          {formatSize(disk.freeSpace)} {t('common.free', 'free')} / {formatSize(disk.totalSpace)} ({diskPercent}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <Check size={14} className="text-white shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Info */}
          <div className="mt-1.5 pt-1.5 px-2 border-t border-black/4 dark:border-white/6 text-[10px] text-slate-400 dark:text-neutral-500 flex items-center justify-between">
            <span>{availableDisks.length} {availableDisks.length > 1 ? t('drive.drivesDetected', 'drives detected') : t('drive.driveDetected', 'drive detected')}</span>
            <span className="font-mono text-[9px] truncate max-w-30">{activeDisk.mountPoint}</span>
          </div>
        </div>
      )}
    </div>
  );
}
