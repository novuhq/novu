import { useContext, useEffect } from 'react';
import { EscapeKeyManagerContext } from './escape-key-context';
import { EscapeKeyManagerPriority } from './priority';

export function useEscapeKeyManager(
  id: string,
  handler: () => void,
  priority = EscapeKeyManagerPriority.NONE,
  active = true
) {
  const { registerEscapeHandler, unregisterEscapeHandler } = useContext(EscapeKeyManagerContext);

  useEffect(() => {
    if (active) {
      registerEscapeHandler(id, handler, priority);
      return () => unregisterEscapeHandler(id);
    }
  }, [id, handler, priority, active, registerEscapeHandler, unregisterEscapeHandler]);
}
