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

/** Cmd/Ctrl+J toggles the popover and Escape closes it while open; in the sidebar Cmd/Ctrl+J expands it and focuses the composer. */
export function useCopilotHotkey({ surface, isOpen, isEnabled, open, toggle, close }: Params) {
  useEffect(() => {
    if (!isEnabled) return;

    const { onShortcut, onEscape } = getHotkeyActions({ surface, open, toggle, close });

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'j') {
        event.preventDefault();
        onShortcut();

        return;
      }

      if (onEscape && event.key === 'Escape' && isOpen && !event.defaultPrevented && !event.isComposing) {
        onEscape();
      }
    };

    // Escape typed in the popover closes it, not a sheet under it: Radix layers dismiss on the document's capture phase.
    const onEscapeInPopover = (event: KeyboardEvent) => {
      const popover = document.getElementById(COPILOT_POPOVER_ID);
      if (!onEscape || event.key !== 'Escape' || !isOpen || event.isComposing) return;
      if (!(event.target instanceof Node) || !popover?.contains(event.target)) return;

      event.stopPropagation();
      onEscape();
    };

    window.addEventListener('keydown', onEscapeInPopover, { capture: true });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onEscapeInPopover, { capture: true });
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [surface, isOpen, isEnabled, open, toggle, close]);
}
