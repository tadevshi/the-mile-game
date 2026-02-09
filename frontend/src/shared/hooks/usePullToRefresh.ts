import { useState, useRef, useEffect } from 'react';

interface Options {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: Options) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const onMove = (e: TouchEvent) => {
      if (isRefreshing) return;
      const diff = e.touches[0].clientY - startY.current;
      if (diff > 0 && window.scrollY === 0) {
        setPullDistance(Math.min(diff * 0.5, 120));
        if (diff > 10) e.preventDefault();
      }
    };

    const onEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        await onRefresh();
        setIsRefreshing(false);
      }
      setPullDistance(0);
    };

    container.addEventListener('touchstart', onStart, { passive: true });
    container.addEventListener('touchmove', onMove, { passive: false });
    container.addEventListener('touchend', onEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onStart);
      container.removeEventListener('touchmove', onMove);
      container.removeEventListener('touchend', onEnd);
    };
  }, [onRefresh, threshold, isRefreshing, pullDistance]);

  return { containerRef, pullDistance, isRefreshing };
}
