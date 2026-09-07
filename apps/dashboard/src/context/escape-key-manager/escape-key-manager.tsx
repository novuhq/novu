import { useCallback, useEffect, useMemo, useState } from 'react';
import { EscapeKeyManagerContext } from './escape-key-context';
import { EscapeKeyManagerPriority } from './priority';

export function EscapeKeyManagerProvider({ children }: { children: React.ReactNode }) {
  const [handlers, setHandlers] = useState<
    Array<{ id: string; handler: () => void; priority: EscapeKeyManagerPriority }>
  >([]);

  const registerEscapeHandler = useCallback(
    (id: string, handler: () => void, priority = EscapeKeyManagerPriority.NONE) => {
      setHandlers((prev) => {
        const filtered = prev.filter((h) => h.id !== id);
        return [...filtered, { id, handler, priority }].sort((a, b) => b.priority - a.priority);
      });
    },
    []
  );

  const unregisterEscapeHandler = useCallback((id: string) => {
    setHandlers((prev) => prev.filter((h) => h.id !== id));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && handlers.length > 0) {
        event.preventDefault();
        event.stopPropagation();
        handlers[0].handler();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [handlers]);

  const value = useMemo(
    () => ({ registerEscapeHandler, unregisterEscapeHandler }),
    [registerEscapeHandler, unregisterEscapeHandler]
  );

  return <EscapeKeyManagerContext.Provider value={value}>{children}</EscapeKeyManagerContext.Provider>;
}
