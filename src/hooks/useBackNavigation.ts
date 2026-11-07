import { useEffect, useRef } from 'react';

const NAV_MARK = '__siagaNav';

export interface NavSnapshot {
  tab: string;
  buildingId: string;
}

interface HistoryState extends NavSnapshot {
  [NAV_MARK]: true;
  depth: number;
}

const isNavState = (state: unknown): state is HistoryState =>
  Boolean(state && typeof state === 'object' && (state as Record<string, unknown>)[NAV_MARK]);

/**
 * Mobile back-button guard.
 *
 * Field engineers use the browser on a phone; pressing the hardware back button
 * used to leave the web app (and, before persistence, throw away half a visit).
 * We keep one extra history entry behind the current view, so:
 *
 *   back  -> previous view (or the same view at depth 0, never the previous site)
 *   back  -> re-armed immediately, so it can never fall out of the app by accident
 *
 * The user can still leave deliberately by closing the tab.
 */
export function useBackNavigation(current: NavSnapshot, onPop: (snapshot: NavSnapshot) => void) {
  const currentRef = useRef(current);
  const onPopRef = useRef(onPop);
  const restoringRef = useRef(false);
  const lastPushedRef = useRef<string>(`${current.tab}|${current.buildingId}`);
  const armedRef = useRef(false);

  useEffect(() => {
    onPopRef.current = onPop;
  }, [onPop]);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    if (armedRef.current) return;
    armedRef.current = true;

    // Two entries: index 0 is the safety net, index 1 is the live view.
    window.history.replaceState(
      { [NAV_MARK]: true, depth: 0, ...currentRef.current } as HistoryState,
      '',
    );
    window.history.pushState(
      { [NAV_MARK]: true, depth: 1, ...currentRef.current } as HistoryState,
      '',
    );

    const handlePop = (event: PopStateEvent) => {
      const state = event.state;
      if (!isNavState(state)) {
        // Entry milik sheet / entry asing: jangan pindah view, tetapi pastikan
        // entry saat ini tetap bertanda nav supaya back berikutnya aman.
        window.history.replaceState(
          { [NAV_MARK]: true, depth: 1, ...currentRef.current } as HistoryState,
          '',
        );
        return;
      }

      restoringRef.current = true;
      onPopRef.current({ tab: state.tab, buildingId: state.buildingId });
      lastPushedRef.current = `${state.tab}|${state.buildingId}`;

      if (state.depth <= 0) {
        // Never let the next back press leave the application.
        window.history.pushState(
          { [NAV_MARK]: true, depth: 1, tab: state.tab, buildingId: state.buildingId } as HistoryState,
          '',
        );
      }

      window.setTimeout(() => {
        restoringRef.current = false;
      }, 0);
    };

    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Push a new history entry whenever the engineer moves to another view.
  useEffect(() => {
    const snapshot = `${current.tab}|${current.buildingId}`;
    if (snapshot === lastPushedRef.current) return;
    lastPushedRef.current = snapshot;
    if (restoringRef.current) return;

    const previous = window.history.state as HistoryState | null;
    const depth = isNavState(previous) ? previous.depth + 1 : 2;
    window.history.pushState({ [NAV_MARK]: true, depth, ...current } as HistoryState, '');
  }, [current.tab, current.buildingId]);
}
