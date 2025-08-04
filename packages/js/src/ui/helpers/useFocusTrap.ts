import { createEffect, onCleanup } from 'solid-js';
import { useAppearance } from '../context';

interface FocusTrapOptions {
  element: () => HTMLElement | null;
  enabled: () => boolean;
}

function createFocusTrap({ element, enabled }: FocusTrapOptions) {
  const { container } = useAppearance();

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

      const containerElement = container();
      const root = containerElement instanceof ShadowRoot ? containerElement : document;
      if (event.shiftKey) {
        // If Shift + Tab is pressed, move focus to the previous focusable element
        if (root.activeElement === firstFocusableElement) {
          lastFocusableElement.focus();
          event.preventDefault();
        }
      } else {
        // If Tab is pressed, move focus to the next focusable element
        if (root.activeElement === lastFocusableElement) {
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
