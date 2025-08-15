import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useEscapeKeyManager } from '@/context/escape-key-manager/hooks';
import { EscapeKeyManagerPriority } from '@/context/escape-key-manager/priority';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';

type CommandPaletteContextType = {
  isOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextType | null>(null);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const track = useTelemetry();

  const openCommandPalette = useCallback(() => {
    setIsOpen(true);
    track(TelemetryEvent.COMMAND_PALETTE_OPENED);
  }, [track]);

  const closeCommandPalette = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleCommandPalette = useCallback(() => {
    setIsOpen((prev) => {
      const newState = !prev;
      if (newState) {
        track(TelemetryEvent.COMMAND_PALETTE_OPENED);
      }
      return newState;
    });
  }, [track]);

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

  const value = {
    isOpen,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
  };

  return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>;
}

export function useCommandPaletteContext() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPaletteContext must be used within a CommandPaletteProvider');
  }

  return context;
}
