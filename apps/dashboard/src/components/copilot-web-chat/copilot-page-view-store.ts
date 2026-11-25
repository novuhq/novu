import type { CopilotPageEnum, CopilotViewing } from '@novu/shared';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useActiveCopilotPage } from './use-copilot-pages';

/** What a page outside the workflow editor shows, for the page Copilot mounted beside it (not above it) in the shell. */
export type CopilotPageView = {
  viewing?: CopilotViewing;
  /** The question about the open resource; leads the suggestions. Not sent to the agent. */
  question?: string;
  /** A sheet covers the page, so the launcher and popover sit above it, clear of its footer. Not sent to the agent. */
  overSheet?: boolean;
};

let view: CopilotPageView | undefined;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function registerCopilotPageView(next: CopilotPageView): () => void {
  view = next;
  notify();

  return () => {
    if (view !== next) return;

    view = undefined;
    notify();
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

export function useCopilotPageView(): CopilotPageView | undefined {
  return useSyncExternalStore(subscribe, () => view);
}

/**
 * Called by a page's tab or panel to tell the page Copilot what is open. A no-op unless that page's Copilot shows on the
 * current route, so the same components inside the workflow editor register nothing.
 */
export function useRegisterCopilotPageView(page: CopilotPageEnum, next: CopilotPageView) {
  const isActive = useActiveCopilotPage() === page;
  // Callers build the view every render; registering only when its content changes spares the Copilot re-renders.
  const key = isActive ? JSON.stringify(next) : undefined;
  const nextRef = useRef(next);
  nextRef.current = next;

  useEffect(() => {
    if (key === undefined) return;

    return registerCopilotPageView(nextRef.current);
  }, [key]);
}
