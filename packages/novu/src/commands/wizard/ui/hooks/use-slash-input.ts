import { useApp, useInput } from 'ink';
import React from 'react';
import { findSlashCommand, matchSlashCommands } from '../slash-commands';
import type { WizardStore } from '../store';

export interface UseSlashInputOptions {
  store: WizardStore;
  /** When false, the hook detaches its key handler. */
  isActive?: boolean;
  /** Called for any non-slash key the user presses (used to clear the buffer). */
  onAnyKey?: () => void;
  /**
   * Called when the user presses Enter and the slash buffer is empty. Lets
   * the host screen treat a "bare" Enter as an action (e.g. dismissing the
   * outro pane) without registering a competing `useInput` that would race
   * against this hook's state updates.
   */
  onSubmitEmpty?: () => void;
}

export interface UseSlashInputReturn {
  buffer: string;
  isComposing: boolean;
}

/**
 * Tiny inline buffer that listens for slash-command typing at the screen
 * level. Submits on Enter, dismisses on Esc. The buffer is rendered by the
 * CommandFooter via its `buffer` / `isActive` props.
 *
 * Replaces the slash handling that used to live in the deleted `composer.tsx`.
 */
export function useSlashInput(opts: UseSlashInputOptions): UseSlashInputReturn {
  const { store, isActive = true, onAnyKey, onSubmitEmpty } = opts;
  const [buffer, setBuffer] = React.useState('');
  const { exit } = useApp();

  useInput(
    (input, key) => {
      if (key.ctrl && input === 'c') {
        exit();
        process.exitCode = 130;

        return;
      }
      if (key.escape) {
        if (buffer) {
          setBuffer('');

          return;
        }
        store.closeOverlay();

        return;
      }
      if (key.return) {
        if (!buffer) {
          onSubmitEmpty?.();

          return;
        }
        const command = findSlashCommand(buffer.trim());
        if (command) {
          store.openOverlay(command.overlay);
        } else {
          const matches = matchSlashCommands(buffer.trim());
          if (matches.length === 1) store.openOverlay(matches[0].overlay);
        }
        setBuffer('');

        return;
      }
      if (key.backspace || key.delete) {
        setBuffer((prev) => prev.slice(0, -1));

        return;
      }
      if (input === '/' && !buffer) {
        setBuffer('/');

        return;
      }
      if (buffer.startsWith('/') && /^[a-zA-Z]$/.test(input)) {
        setBuffer((prev) => `${prev}${input}`);

        return;
      }
      if (onAnyKey) onAnyKey();
    },
    { isActive }
  );

  return { buffer, isComposing: buffer.length > 0 };
}
