import { useEffect } from 'react';
import type { CopilotSurface } from './copilot-web-chat-context';

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

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [surface, isOpen, isEnabled, open, toggle, close]);
}
