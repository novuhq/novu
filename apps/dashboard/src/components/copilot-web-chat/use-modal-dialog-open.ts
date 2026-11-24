import { useSyncExternalStore } from 'react';

// A modal Radix dialog locks the body's scroll while it's open; the non-modal sheets never do.
const SCROLL_LOCK_ATTRIBUTE = 'data-scroll-locked';

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.body, { attributes: true, attributeFilter: [SCROLL_LOCK_ATTRIBUTE] });

  return () => observer.disconnect();
}

function isModalDialogOpen() {
  return document.body.hasAttribute(SCROLL_LOCK_ATTRIBUTE);
}

/** Whether a modal dialog is open, such as a sheet's "You might lose your progress", which the Copilot drops under. */
export function useModalDialogOpen(): boolean {
  return useSyncExternalStore(subscribe, isModalDialogOpen, () => false);
}
