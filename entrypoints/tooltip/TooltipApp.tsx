import { useState, useCallback, useRef } from 'react';

import type { OgData } from '@/lib/types';

import { OgTooltip } from '@/components/tooltip/OgTooltip';
import { sendMessage } from '@/lib/messaging';

export interface Controller {
  show: (url: string, x: number, linkTop: number, linkBottom: number) => void;
  hide: () => void;
}

type TooltipState =
  | { phase: 'hidden' }
  | {
      phase: 'loading';
      url: string;
      x: number;
      linkTop: number;
      linkBottom: number;
    }
  | {
      phase: 'ready';
      url: string;
      x: number;
      linkTop: number;
      linkBottom: number;
      data: OgData;
    }
  | {
      phase: 'error';
      url: string;
      x: number;
      linkTop: number;
      linkBottom: number;
    };

interface TooltipAppProps {
  controllerRef: Controller;
}

export function TooltipApp({ controllerRef }: TooltipAppProps) {
  const [state, setState] = useState<TooltipState>({ phase: 'hidden' });
  // staleRef tracks the current fetch so we can discard results from superseded fetches
  const staleRef = useRef(0);

  const show = useCallback(
    async (url: string, x: number, linkTop: number, linkBottom: number) => {
      const fetchId = ++staleRef.current;
      setState({ phase: 'loading', url, x, linkTop, linkBottom });

      try {
        const data = await sendMessage('getOgData', { url });
        // Discard if a newer show() call arrived while we were fetching
        if (staleRef.current !== fetchId) return;
        if (data && (data.title || data.description || data.image)) {
          setState({ phase: 'ready', url, x, linkTop, linkBottom, data });
        } else {
          setState({ phase: 'error', url, x, linkTop, linkBottom });
        }
      } catch {
        if (staleRef.current === fetchId) {
          setState({ phase: 'error', url, x, linkTop, linkBottom });
        }
      }
    },
    [],
  );

  const hide = useCallback(() => {
    staleRef.current++; // invalidate any in-flight fetch
    setState({ phase: 'hidden' });
  }, []);

  // Mutate controller ref in-place so event listeners always call current functions
  // eslint-disable-next-line react-hooks/immutability, @typescript-eslint/no-misused-promises -- intentional imperative bridge between React and DOM event listeners
  controllerRef.show = show;
  // eslint-disable-next-line react-hooks/immutability -- intentional imperative bridge
  controllerRef.hide = hide;

  if (state.phase === 'hidden') return null;

  return (
    <OgTooltip
      x={state.x}
      linkTop={state.linkTop}
      linkBottom={state.linkBottom}
      phase={state.phase}
      data={'data' in state ? state.data : undefined}
      url={state.url}
    />
  );
}
