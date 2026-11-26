import { useEffect } from 'react';
import type { CopilotSurface } from './copilot-web-chat-context';
import { COPILOT_POPOVER_ID } from './copilot-web-chat-utils';

type Params = {
  surface: CopilotSurface;
  isOpen: boolean;
  isEnabled: boolean;
  open: () => void;
  toggle: () => void;
  close: () => void;
};

type HotkeyActions = { onShortcut: () => void; onEscape?: () => void };

function getHotkeyActions({ surface, open, toggle, close }: Omit<Params, 'isOpen' | 'isEnabled'>): HotkeyActions {
  switch (surface) {
    case 'popover':
      return { onShortcut: toggle, onEscape: close };
    case 'sidebar':
      // Escape already closes other things in the step editor, so it never collapses the sidebar.
      return { onShortcut: open };
    default: {
      const unhandled: never = surface;

      return unhandled;
    }
  }
}

/**
 * Overlays a reply opens inside the panel, Streamdown's "Open external link?" check and its full-screen diagram. They
 * close on Escape themselves but never mark the event handled, so the Copilot must leave that Escape to them.
 */
const NESTED_OVERLAY_SELECTOR = '[data-streamdown="link-safety-modal"], .fixed.inset-0';
const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"]';

/**
 * What an Escape means for the Copilot, decided before any layer handles it. `close`: it was pressed in the Copilot,
 * the top layer there. `ignore`: it belongs to another layer, an overlay inside the panel or a dialog the focus is in,
 * or the panel is docked, which is part of the page rather than a layer over it. `close-unless-handled`: the floating
 * panel closes unless a layer under it (a menu, a sheet) takes the Escape first.
 */
export type CopilotEscapeAction = 'close' | 'ignore' | 'close-unless-handled';

export function resolveCopilotEscape({
  isInPanel,
  hasNestedOverlay,
  isInOtherDialog,
  isDocked,
}: {
  isInPanel: boolean;
  hasNestedOverlay: boolean;
  isInOtherDialog: boolean;
  isDocked: boolean;
}): CopilotEscapeAction {
  if (hasNestedOverlay) return 'ignore';
  if (isInPanel) return 'close';
  if (isInOtherDialog || isDocked) return 'ignore';

  return 'close-unless-handled';
}

function readEscapeAction(event: KeyboardEvent): CopilotEscapeAction {
  const panel = document.getElementById(COPILOT_POPOVER_ID);
  const target = event.target instanceof Element ? event.target : null;
  const isInPanel = !!panel && !!target && panel.contains(target);

  return resolveCopilotEscape({
    isInPanel,
    hasNestedOverlay: !!panel?.querySelector(NESTED_OVERLAY_SELECTOR),
    isInOtherDialog: !isInPanel && !!target?.closest(DIALOG_SELECTOR),
    isDocked: panel?.dataset.copilotPlacement === 'docked',
  });
}

/**
 * Cmd/Ctrl+J toggles the popover and Escape closes it, but only when it is the top layer (`resolveCopilotEscape`). In
 * the sidebar Cmd/Ctrl+J expands it and focuses the composer.
 */
export function useCopilotHotkey({ surface, isOpen, isEnabled, open, toggle, close }: Params) {
  useEffect(() => {
    if (!isEnabled) return;

    const { onShortcut, onEscape } = getHotkeyActions({ surface, open, toggle, close });
    // Decided in the capture phase: by the bubble phase a layer that took the Escape may already have left the page.
    const ignoredEscapes = new WeakSet<KeyboardEvent>();

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'j') {
        event.preventDefault();
        onShortcut();

        return;
      }

      if (
        onEscape &&
        event.key === 'Escape' &&
        isOpen &&
        !event.defaultPrevented &&
        !event.isComposing &&
        !ignoredEscapes.has(event)
      ) {
        onEscape();
      }
    };

    // Radix layers dismiss on the document's capture phase, so the window's capture phase sees an Escape before them.
    const onEscapeCapture = (event: KeyboardEvent) => {
      if (!onEscape || event.key !== 'Escape' || !isOpen || event.isComposing) return;

      const action = readEscapeAction(event);
      if (action === 'ignore') ignoredEscapes.add(event);
      if (action !== 'close') return;

      // Pressed in the panel: it closes, not a sheet under it.
      event.stopPropagation();
      onEscape();
    };

    window.addEventListener('keydown', onEscapeCapture, { capture: true });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onEscapeCapture, { capture: true });
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [surface, isOpen, isEnabled, open, toggle, close]);
}
