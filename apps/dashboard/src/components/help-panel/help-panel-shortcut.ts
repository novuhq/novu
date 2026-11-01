import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

export const HELP_PANEL_SHORTCUT_LABEL = '?';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const isFormField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

  return isFormField || target.isContentEditable;
}

export function isHelpPanelShortcut(event: KeyboardEvent): boolean {
  if (event.key !== '?' || event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
    return false;
  }

  return !isTypingTarget(event.target);
}

/** Buttons rendered inside the cmdk root must keep Enter/arrows from reaching its list navigation. */
export function stopCommandKeyHandling(event: ReactKeyboardEvent<HTMLElement>) {
  event.stopPropagation();
}
