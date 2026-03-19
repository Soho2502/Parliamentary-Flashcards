import { useState, useCallback, useRef } from 'react';

export type SwipeResult = 'left' | 'right' | null;

interface SwipeState {
  dx: number;
  dy: number;
  swiping: boolean;
  result: SwipeResult;
}

const SWIPE_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 0.4;

export function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const [state, setState] = useState<SwipeState>({ dx: 0, dy: 0, swiping: false, result: null });
  const startRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const animatingRef = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (animatingRef.current) return;
    startRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    setState({ dx: 0, dy: 0, swiping: true, result: null });
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!startRef.current || !state.swiping) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    setState(s => ({ ...s, dx, dy }));
  }, [state.swiping]);

  const onPointerUp = useCallback(() => {
    if (!startRef.current) return;
    const { dx } = state;
    const dt = Date.now() - startRef.current.time;
    const vx = Math.abs(dx) / dt;

    if (Math.abs(dx) > SWIPE_THRESHOLD || vx > VELOCITY_THRESHOLD) {
      const result: SwipeResult = dx > 0 ? 'right' : 'left';
      animatingRef.current = true;
      setState(s => ({ ...s, swiping: false, result }));
      setTimeout(() => {
        animatingRef.current = false;
        setState({ dx: 0, dy: 0, swiping: false, result: null });
        if (result === 'right') onSwipeRight();
        else onSwipeLeft();
      }, 350);
    } else {
      setState({ dx: 0, dy: 0, swiping: false, result: null });
    }
    startRef.current = null;
  }, [state, onSwipeLeft, onSwipeRight]);

  const triggerSwipe = useCallback((direction: 'left' | 'right') => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    setState({ dx: direction === 'right' ? 400 : -400, dy: 0, swiping: false, result: direction });
    setTimeout(() => {
      animatingRef.current = false;
      setState({ dx: 0, dy: 0, swiping: false, result: null });
      if (direction === 'right') onSwipeRight();
      else onSwipeLeft();
    }, 350);
  }, [onSwipeLeft, onSwipeRight]);

  return { state, onPointerDown, onPointerMove, onPointerUp, triggerSwipe };
}
