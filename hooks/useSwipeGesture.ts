import { useRef, useEffect, useCallback } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // minimum distance to trigger swipe (default 50px)
  edgeThreshold?: number; // for edge swipes, how far from edge to start (default 30px)
  enableEdgeSwipe?: boolean; // only trigger on swipes starting from edge
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
}

export const useSwipeGesture = <T extends HTMLElement = HTMLElement>(config: SwipeConfig) => {
  const ref = useRef<T>(null);
  const touchState = useRef<TouchState | null>(null);
  
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    edgeThreshold = 30,
    enableEdgeSwipe = false,
  } = config;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    // For edge swipe, only register if touch starts near the edge
    if (enableEdgeSwipe) {
      const screenWidth = window.innerWidth;
      const isNearLeftEdge = touch.clientX < edgeThreshold;
      const isNearRightEdge = touch.clientX > screenWidth - edgeThreshold;
      
      if (!isNearLeftEdge && !isNearRightEdge) return;
    }

    touchState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
    };
  }, [enableEdgeSwipe, edgeThreshold]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchState.current) return;

    const touch = e.changedTouches[0];
    if (!touch) {
      touchState.current = null;
      return;
    }

    const { startX, startY, startTime } = touchState.current;
    const endX = touch.clientX;
    const endY = touch.clientY;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const deltaTime = Date.now() - startTime;

    // Ignore if swipe took too long (> 500ms)
    if (deltaTime > 500) {
      touchState.current = null;
      return;
    }

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine if horizontal or vertical swipe
    if (absDeltaX > absDeltaY && absDeltaX > threshold) {
      // Horizontal swipe
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    } else if (absDeltaY > absDeltaX && absDeltaY > threshold) {
      // Vertical swipe
      if (deltaY > 0) {
        onSwipeDown?.();
      } else {
        onSwipeUp?.();
      }
    }

    touchState.current = null;
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]);

  const handleTouchCancel = useCallback(() => {
    touchState.current = null;
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [handleTouchStart, handleTouchEnd, handleTouchCancel]);

  return ref;
};

/**
 * Hook for detecting edge swipe to go back (like iOS gesture)
 * Works reliably on mobile devices
 */
export const useEdgeSwipeBack = (onBack: () => void) => {
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    const edgeThreshold = 40; // Increased for easier touch detection on mobile
    const swipeThreshold = 60; // Reduced for more responsive swipe
    let isTracking = false;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      
      // Only register if starting from left edge
      if (touch.clientX < edgeThreshold) {
        startX = touch.clientX;
        startY = touch.clientY;
        startTime = Date.now();
        isTracking = true;
      } else {
        isTracking = false;
        startX = 0;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Visual feedback could be added here if needed
      if (!isTracking) return;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isTracking || startX === 0) return;

      const touch = e.changedTouches[0];
      if (!touch) {
        isTracking = false;
        return;
      }

      const deltaX = touch.clientX - startX;
      const deltaY = Math.abs(touch.clientY - startY);
      const deltaTime = Date.now() - startTime;

      // Valid back swipe: 
      // - moved right enough
      // - mostly horizontal (not diagonal)
      // - quick enough (increased timeout for better UX)
      if (deltaX > swipeThreshold && deltaY < deltaX * 0.6 && deltaTime < 500) {
        onBack();
      }

      isTracking = false;
      startX = 0;
    };

    const handleTouchCancel = () => {
      isTracking = false;
      startX = 0;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [onBack]);
};

/**
 * Hook for pull-to-refresh functionality
 */
export const usePullToRefresh = (onRefresh: () => Promise<void>, enabled = true) => {
  const ref = useRef<HTMLElement>(null);
  const isRefreshing = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const element = ref.current;
    if (!element) return;

    let startY = 0;
    let isPulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Only enable pull-to-refresh when scrolled to top
      if (element.scrollTop === 0) {
        startY = e.touches[0]?.clientY ?? 0;
        isPulling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing.current) return;

      const currentY = e.touches[0]?.clientY ?? 0;
      const pullDistance = currentY - startY;

      // Visual feedback could be added here
      if (pullDistance > 100) {
        // Could add visual indicator
      }
    };

    const handleTouchEnd = async (e: TouchEvent) => {
      if (!isPulling || isRefreshing.current) return;

      const endY = e.changedTouches[0]?.clientY ?? 0;
      const pullDistance = endY - startY;

      if (pullDistance > 100) {
        isRefreshing.current = true;
        try {
          await onRefresh();
        } finally {
          isRefreshing.current = false;
        }
      }

      isPulling = false;
      startY = 0;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, enabled]);

  return ref;
};
