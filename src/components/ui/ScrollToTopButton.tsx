import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';

interface ScrollToTopButtonProps {
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  className?: string;
}

export default function ScrollToTopButton({
  scrollContainerRef,
  className = '',
}: ScrollToTopButtonProps) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (el.scrollTop > 180) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial scroll position
    handleScroll();

    return () => {
      el.removeEventListener('scroll', handleScroll);
    };
  }, [scrollContainerRef]);

  const scrollToTop = () => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      title={t('common.scrollToTop')}
      aria-label={t('common.scrollToTop')}
      className={`
        pointer-events-auto h-11 w-11 rounded-full glass-panel shadow-2xl border border-black/10 dark:border-white/15
        flex items-center justify-center backdrop-blur-2xl text-slate-700 dark:text-neutral-200
        hover:text-accent hover:border-accent/30 hover:bg-white/90 dark:hover:bg-neutral-800/90
        active:scale-95 transition-all duration-150 cursor-pointer animate-fade-in select-none group
        ${className}
      `}
    >
      <ArrowUp size={16} className="shrink-0 group-hover:-translate-y-0.5 transition-transform" />
    </button>
  );
}
