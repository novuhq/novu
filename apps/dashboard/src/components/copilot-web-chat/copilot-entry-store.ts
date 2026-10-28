import { useSyncExternalStore } from 'react';
import type { CopilotWebChatContextValue } from './copilot-web-chat-context';

type OpenCopilot = CopilotWebChatContextValue['open'];

let entry: OpenCopilot | undefined;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/**
 * Lets surfaces rendered above the workflow editor (the ⌘K palette) open the Copilot, which is only
 * mounted inside it. The provider registers while the popover is usable and unregisters otherwise.
 */
export function registerCopilotEntry(open: OpenCopilot): () => void {
  entry = open;
  notify();

  return () => {
    if (entry !== open) return;

    entry = undefined;
    notify();
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

/** The function that opens the Copilot popover, or undefined when it is unavailable on this page. */
export function useCopilotEntry(): OpenCopilot | undefined {
  return useSyncExternalStore(subscribe, () => entry);
}
