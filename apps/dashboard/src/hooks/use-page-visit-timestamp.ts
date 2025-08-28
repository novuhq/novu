import { useEffect, useState } from 'react';

/**
 * Hook that creates a timestamp when the component mounts on the client-side.
 *
 * This hook returns a timestamp representing when the component mounted in the browser.
 * The timestamp is created inside a useEffect hook, which means:
 * - It is NOT produced during server-side rendering (SSR)
 * - It may be null during SSR or initial render
 * - It updates only once on mount and remains stable for the component's lifetime
 *
 * This represents when the user visited/loaded the current page in their browser.
 * Callers should be aware of client-only timing constraints and handle the null
 * state appropriately during SSR or initial render.
 */
export function usePageVisitTimestamp(): string | null {
  // Initialize to null, will be set on client mount
  const [visitTimestamp, setVisitTimestamp] = useState<string | null>(null);

  // Set timestamp on client mount
  useEffect(() => {
    setVisitTimestamp(new Date().toISOString());
  }, []);

  return visitTimestamp;
}
