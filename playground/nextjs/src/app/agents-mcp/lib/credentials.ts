'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'novu-mcp-playground-credentials';

export type Credentials = {
  jwt: string;
  environmentId: string;
  savedAt: number;
};

function readFromStorage(): Credentials | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<Credentials>;
    if (typeof parsed.jwt === 'string' && typeof parsed.environmentId === 'string') {
      return {
        jwt: parsed.jwt,
        environmentId: parsed.environmentId,
        savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
      };
    }
  } catch {
    // ignore parse errors
  }

  return null;
}

export function getCredentials(): Credentials | null {
  return readFromStorage();
}

export function useCredentials() {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCredentials(readFromStorage());
    setHydrated(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setCredentials(readFromStorage());
      }
    };

    window.addEventListener('storage', onStorage);

    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const save = useCallback((jwt: string, environmentId: string) => {
    const next: Credentials = { jwt, environmentId, savedAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setCredentials(next);
  }, []);

  const clear = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setCredentials(null);
  }, []);

  return { credentials, hydrated, save, clear };
}
