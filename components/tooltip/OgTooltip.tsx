import { useRef, useLayoutEffect, useState } from 'react';

import type { OgData } from '@/lib/types';

import { TooltipCard } from './TooltipCard';
import { TooltipErrorState } from './TooltipErrorState';
import { TooltipSkeleton } from './TooltipSkeleton';

const TOOLTIP_WIDTH = 320;
const MARGIN = 8;

interface OgTooltipProps {
  x: number;
  linkTop: number;
  linkBottom: number;
  phase: 'loading' | 'ready' | 'error';
  data?: OgData;
  url: string;
}

export function OgTooltip({
  x,
  linkTop,
  linkBottom,
  phase,
  data,
  url,
}: OgTooltipProps) {
  const [pos, setPos] = useState<{
    left: number;
    top: number;
    visible: boolean;
  }>({
    left: x,
    top: linkTop,
    visible: false,
  });
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const { height } = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Clamp horizontal so tooltip stays inside viewport
    const left = Math.max(MARGIN, Math.min(x, vw - TOOLTIP_WIDTH - MARGIN));

    // Default: above the link
    let top = linkTop - height - MARGIN;

    // Flip below if not enough space above
    if (top < MARGIN) {
      top = linkBottom + MARGIN;
    }

    // Final vertical clamp (last resort)
    top = Math.max(MARGIN, Math.min(top, vh - height - MARGIN));

    setPos({ left, top, visible: true });
  }, [x, linkTop, linkBottom, phase]); // Re-clamp when phase changes (skeleton → card have different heights)

  return (
    <div
      ref={ref}
      className="og-tooltip-card fixed z-2147483647 w-[320px] overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-md"
      style={{
        left: pos.left,
        top: pos.top,
        opacity: pos.visible ? 1 : 0,
        transition: 'opacity 0.1s ease',
      }}
    >
      {phase === 'loading' && <TooltipSkeleton />}
      {phase === 'error' && <TooltipErrorState />}
      {phase === 'ready' && data && (
        <TooltipCard
          ogData={data}
          url={url}
        />
      )}
    </div>
  );
}
