import { useEffect, useRef } from 'react';

export function useClickOutsideHandler(
  containerRef: React.RefObject<HTMLDivElement>,
  currentEditPath: string[] | null,
  onClickOutside: () => void
) {
  const clickListenerRef = useRef<((event: MouseEvent) => void) | null>(null);

  useEffect(() => {
    if (clickListenerRef.current) {
      document.removeEventListener('mousedown', clickListenerRef.current);
      clickListenerRef.current = null;
    }

    if (currentEditPath) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;

        if (containerRef.current && !containerRef.current.contains(target)) {
          onClickOutside();
          return;
        }

        const clickedElement = target as HTMLElement;
        const isClickOnInput = clickedElement.matches('input, textarea, .jer-key-text, .jer-value');
        const isClickOnEditableValue = clickedElement.closest('.jer-value-node, .jer-function-value-node');
        const isClickOnButton = clickedElement.closest('button, .jer-plus-menu, .jer-minus-menu');

        if (isClickOnInput || isClickOnEditableValue || isClickOnButton) {
          const currentlyEditingElement = containerRef.current?.querySelector('input:focus, textarea:focus');

          if (
            currentlyEditingElement &&
            !currentlyEditingElement.contains(target) &&
            currentlyEditingElement !== target
          ) {
            onClickOutside();
          }
        }
      };

      clickListenerRef.current = handleClickOutside;
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      if (clickListenerRef.current) {
        document.removeEventListener('mousedown', clickListenerRef.current);
        clickListenerRef.current = null;
      }
    };
  }, [currentEditPath, containerRef, onClickOutside]);

  useEffect(() => {
    return () => {
      if (clickListenerRef.current) {
        document.removeEventListener('mousedown', clickListenerRef.current);
      }
    };
  }, []);
}
