import { createEffect, onCleanup } from 'solid-js';

interface FocusTrapOptions {
  element: () => HTMLElement | null;
  enabled: () => boolean;
}

function createFocusTrap({ element, enabled }: FocusTrapOptions) {
  createEffect(() => {
    const trapElement = element();

    if (!trapElement || !enabled()) return;

    const focusableElementsString =
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex], [contenteditable]';

    const getFocusableElements = () => {
      return Array.from(trapElement.querySelectorAll<HTMLElement>(focusableElementsString)).filter(
        (el) => el.tabIndex >= 0 && !el.hasAttribute('disabled')
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // If Shift + Tab is pressed, move focus to the previous focusable element
        if (document.activeElement === firstFocusableElement) {
          lastFocusableElement.focus();
          event.preventDefault();
        }
      } else {
        // If Tab is pressed, move focus to the next focusable element
        // eslint-disable-next-line no-lonely-if
        if (document.activeElement === lastFocusableElement) {
          firstFocusableElement.focus();
          event.preventDefault();
        }
      }
    };

    trapElement.addEventListener('keydown', handleKeyDown);

    // Initial focus
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    onCleanup(() => {
      trapElement.removeEventListener('keydown', handleKeyDown);
    });
  });
}

export default createFocusTrap;
