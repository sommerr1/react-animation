import { useRef, useCallback } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  preventDefaultTouchmoveEvent?: boolean;
}

export const useSwipeGestures = ({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  preventDefaultTouchmoveEvent = false
}: SwipeGestureOptions) => {
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchEndY = useRef<number>(0);

  const handleSwipe = useCallback(() => {
    const deltaX = touchEndX.current - touchStartX.current;
    const deltaY = touchEndY.current - touchStartY.current;
    
    // Проверяем, что это горизонтальное смахивание (не вертикальное)
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          // Смахивание вправо
          onSwipeRight?.();
        } else {
          // Смахивание влево
          onSwipeLeft?.();
        }
      }
    }
  }, [threshold, onSwipeLeft, onSwipeRight]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (preventDefaultTouchmoveEvent) {
      e.preventDefault();
    }
  }, [preventDefaultTouchmoveEvent]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    touchEndY.current = e.changedTouches[0].clientY;
    handleSwipe();
  }, [handleSwipe]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};