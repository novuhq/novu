import { useEffect } from 'react';

type Params = { isOpen: boolean; isEnabled: boolean; toggle: () => void; close: () => void };

/** Cmd/Ctrl+J toggles the Copilot popover; Escape closes it while open. */
export function useCopilotHotkey({ isOpen, isEnabled, toggle, close }: Params) {
  useEffect(() => {
    if (!isEnabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'j') {
        event.preventDefault();
        toggle();

        return;
      }

      if (event.key === 'Escape' && isOpen && !event.defaultPrevented) {
        close();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isEnabled, toggle, close]);
}
