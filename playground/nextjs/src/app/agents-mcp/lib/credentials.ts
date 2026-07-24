'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'novu-mcp-playground-environment-id';

/**
 * Lightweight identifier for "which Novu environment the playground is currently
 * operating against". The Clerk SDK handles JWTs; the only piece of state the
 * playground needs to persist between reloads is the chosen environment.
 *
 * Kept under the `Credentials` name to minimize churn for downstream files that
 * already import this type.
 */
export type Credentials = {
  environmentId: string;
};

function readFromStorage(): string | null {
  if (typeof window === 'undefined') return null;

  return window.localStorage.getItem(STORAGE_KEY);
}

export function useEnvironmentId() {
  const [environmentId, setEnvironmentIdState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEnvironmentIdState(readFromStorage());
    setHydrated(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setEnvironmentIdState(readFromStorage());
      }
    };

    window.addEventListener('storage', onStorage);

    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setEnvironmentId = useCallback((next: string) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setEnvironmentIdState(next);
  }, []);

  const clear = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setEnvironmentIdState(null);
  }, []);

  return { environmentId, hydrated, setEnvironmentId, clear };
}
