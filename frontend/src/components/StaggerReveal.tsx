'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';

interface StaggerRevealProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
  /* Change this to re-run the reveal — e.g. a key derived from the visible
     month, or from the list length once async data actually arrives (the
     effect only fires on mount/dep-change, not on every re-render, so a
     list that starts empty and fills in later needs this to animate at
     all). Left undefined, it only ever plays once on mount. */
  replayKey?: string | number;
}

/* Animates its own direct children in with a fade + rise, staggered — for
   any list/grid a page wants to feel like it's arriving rather than just
   appearing. Renders a plain div, so it's safe to drop existing layout
   classes (divide-y, grid, flex, ...) straight onto it in place of a
   wrapper that's otherwise just there for styling. */
export default function StaggerReveal({
  children,
  className,
  stagger = 0.06,
  y = 14,
  replayKey,
}: StaggerRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = Array.from(container.children);
    if (items.length === 0) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.fromTo(
      items,
      { opacity: 0, y },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', stagger }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayKey]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
