import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  overscan?: number;
  maxHeight?: number | string;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  className = '',
  overscan = 5,
  maxHeight = '65vh',
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(500);

  // Measure container height
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    setViewportHeight(el.clientHeight || 500);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setViewportHeight(entry.contentRect.height);
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Throttled scroll handler for 120 FPS ProMotion
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const currentScrollTop = containerRef.current.scrollTop;
    requestAnimationFrame(() => {
      setScrollTop(currentScrollTop);
    });
  }, []);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ maxHeight, overflowY: 'auto' }}
      className={`relative will-change-scroll contain-content ${className}`}
    >
      <div
        style={{ height: `${totalHeight}px`, width: '100%', position: 'relative' }}
      >
        <div
          style={{
            transform: `translateY(${startIndex * itemHeight}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, i) => renderItem(item, startIndex + i))}
        </div>
      </div>
    </div>
  );
}

export default VirtualList;
