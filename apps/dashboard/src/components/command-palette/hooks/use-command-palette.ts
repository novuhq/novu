import { useCallback, useEffect, useState } from 'react';
import { useEscapeKeyManager } from '@/context/escape-key-manager/hooks';
import { EscapeKeyManagerPriority } from '@/context/escape-key-manager/priority';

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  const openCommandPalette = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleCommandPalette = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Register escape key handler with high priority
  useEscapeKeyManager('command-palette', closeCommandPalette, EscapeKeyManagerPriority.POPOVER, isOpen);

  // Global keyboard listener for ⌘K/Ctrl+K
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        event.stopPropagation();
        toggleCommandPalette();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [toggleCommandPalette]);

  return {
    isOpen,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
  };
}
