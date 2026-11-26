import { useMemo, useSyncExternalStore } from 'react';
import { useCopilotPageView } from './copilot-page-view-store';
import {
  COPILOT_PANEL_WIDTH,
  type CopilotPanelLayout,
  type CopilotPanelPlacement,
  type CopilotViewport,
  canCopilotDock,
  getCopilotDockedTop,
  getCopilotTopLimit,
  parseCopilotPanelLayout,
  resolveCopilotPanelPlacement,
} from './copilot-panel-layout';

const STORAGE_KEY = 'novu-copilot-panel-layout';
/** Set on the root while the panel is docked, so fixed layers (right-side sheets, toasts) also make room for it. */
const DOCK_WIDTH_VARIABLE = '--copilot-dock-width';

function readStoredLayout(): CopilotPanelLayout {
  try {
    return parseCopilotPanelLayout(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return parseCopilotPanelLayout(null);
  }
}

type DockSlot = { element: HTMLElement; top: number };

let layout: CopilotPanelLayout | undefined;
let dockSlot: DockSlot | undefined;
let isDockShown = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function getLayout(): CopilotPanelLayout {
  layout ??= readStoredLayout();

  return layout;
}

export function setCopilotPanelLayout(next: CopilotPanelLayout) {
  layout = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the choice then lasts until a reload.
  }
  notify();
}

export function useCopilotPanelLayout(): CopilotPanelLayout {
  return useSyncExternalStore(subscribe, getLayout);
}

/**
 * Called by the page layout's dock slot: where under the top bar a docked panel starts. The latest slot wins, so a
 * page that unmounts after the next one mounted does not take the dock away from it.
 */
export function registerCopilotDockSlot(element: HTMLElement): { measure: () => void; unregister: () => void } {
  const measure = () => {
    if (dockSlot?.element !== element) return;

    const top = Math.round(element.getBoundingClientRect().top);
    if (dockSlot.top === top) return;

    dockSlot = { element, top };
    notify();
  };

  dockSlot = { element, top: Math.round(element.getBoundingClientRect().top) };
  notify();

  return {
    measure,
    unregister: () => {
      if (dockSlot?.element !== element) return;

      dockSlot = undefined;
      notify();
    },
  };
}

function getDockTop(): number | undefined {
  return dockSlot?.top;
}

/** Called by the panel while it is docked and open; the returned callback takes the room back. */
export function showCopilotDock(): () => void {
  isDockShown = true;
  document.documentElement.style.setProperty(DOCK_WIDTH_VARIABLE, `${COPILOT_PANEL_WIDTH}px`);
  notify();

  return () => {
    isDockShown = false;
    document.documentElement.style.removeProperty(DOCK_WIDTH_VARIABLE);
    notify();
  };
}

/** Whether the page layout should make room for the docked panel. */
export function useCopilotDockShown(): boolean {
  return useSyncExternalStore(subscribe, () => isDockShown);
}

let viewport: CopilotViewport | undefined;

function getViewport(): CopilotViewport {
  const { innerWidth: width, innerHeight: height } = window;
  if (viewport?.width !== width || viewport?.height !== height) viewport = { width, height };

  return viewport;
}

function subscribeToViewport(listener: () => void) {
  window.addEventListener('resize', listener);

  return () => window.removeEventListener('resize', listener);
}

export function useCopilotViewport(): CopilotViewport {
  return useSyncExternalStore(subscribeToViewport, getViewport);
}

/** The top of the page layout's dock slot, under its top bar; `undefined` on a page without one. */
export function useCopilotDockTop(): number | undefined {
  return useSyncExternalStore(subscribe, getDockTop);
}

/** Where the panel shows on this page, at this window size, for the user's choice. */
export function useCopilotPanelPlacement(): {
  layout: CopilotPanelLayout;
  placement: CopilotPanelPlacement;
  /** Where a docked panel starts on this page; `undefined` on a page without a dock slot. */
  dockedTop: number | undefined;
  /** The highest a floating panel goes, under the top bar. */
  topLimit: number;
  canDock: boolean;
  viewport: CopilotViewport;
} {
  const currentLayout = useCopilotPanelLayout();
  const dockTop = useCopilotDockTop();
  const currentViewport = useCopilotViewport();
  const isOverSheet = !!useCopilotPageView()?.overSheet;

  return useMemo(
    () => ({
      layout: currentLayout,
      placement: resolveCopilotPanelPlacement({
        layout: currentLayout,
        dockTop,
        viewport: currentViewport,
        isOverSheet,
      }),
      dockedTop: dockTop === undefined ? undefined : getCopilotDockedTop({ dockTop, isOverSheet }),
      topLimit: getCopilotTopLimit(dockTop),
      canDock: canCopilotDock({ dockTop, viewport: currentViewport }),
      viewport: currentViewport,
    }),
    [currentLayout, dockTop, currentViewport, isOverSheet]
  );
}
