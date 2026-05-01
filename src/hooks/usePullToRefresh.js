import { useState, useRef, useCallback } from "react";

const PULL_THRESHOLD = 72;

export function usePullToRefresh(onRefresh) {
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(null);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (containerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (touchStartY.current === null) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) {
      setIsPulling(true);
      setPullY(Math.min(delta * 0.45, PULL_THRESHOLD + 20));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullY >= PULL_THRESHOLD) {
      onRefresh();
    }
    setPullY(0);
    setIsPulling(false);
    touchStartY.current = null;
  }, [pullY, onRefresh]);

  return {
    containerRef,
    pullY,
    isPulling,
    isTriggered: pullY >= PULL_THRESHOLD,
    handlers: { onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd },
  };
}