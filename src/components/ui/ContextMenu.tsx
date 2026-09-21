import { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  id?: string;
  label?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onClick?: () => void;
  danger?: boolean;
  separator?: boolean;
  separatorAfter?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  items: ContextMenuItem[];
}

export default function ContextMenu({ x, y, isOpen, onClose, items }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Keep menu within screen boundaries
  const menuWidth = 220;
  const menuHeight = items.length * 34;
  const safeX = Math.min(x, window.innerWidth - menuWidth - 16);
  const safeY = Math.min(y, window.innerHeight - menuHeight - 16);

  return (
    <div
      ref={menuRef}
      style={{ left: `${safeX}px`, top: `${safeY}px` }}
      className="fixed z-50 min-w-[210px] p-1.5 rounded-2xl bg-white/80 dark:bg-neutral-900/85 backdrop-blur-2xl border border-black/10 dark:border-white/10 shadow-2xl shadow-black/20 animate-scale-in text-xs select-none"
    >
      {items.map((item, idx) => {
        if (item.separator) {
          return <div key={idx} className="h-px my-1 bg-black/6 dark:bg-white/8" />;
        }

        return (
          <div key={item.id || idx}>
            <button
              type="button"
              onClick={() => {
                item.onClick?.();
                onClose();
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-medium transition-colors cursor-pointer text-left ${
                item.danger
                  ? 'text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20'
                  : 'text-slate-800 dark:text-neutral-200 hover:bg-accent hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {item.icon && <span className="opacity-80 shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </div>
              {item.shortcut && (
                <span className="text-[10px] opacity-50 font-mono tracking-wider ml-4">
                  {item.shortcut}
                </span>
              )}
            </button>
            {item.separatorAfter && <div className="h-px my-1 bg-black/6 dark:bg-white/8" />}
          </div>
        );
      })}
    </div>
  );
}
