'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Counts a figure up when it changes.
 *
 * The Financial Dashboard rules call for count-up on headline metrics: it draws the eye
 * to the number that changed after a filter, instead of the value silently swapping.
 * Respects prefers-reduced-motion by jumping straight to the final value.
 */
export function useCountUp(target: number, duration = 550): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number>();

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = fromRef.current;
    if (reduce || from === target) {
      fromRef.current = target;
      setValue(target);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      // easeOutExpo — fast settle, no lingering crawl at the end.
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setValue(from + (target - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, duration]);

  return value;
}
