import { useState } from 'react';

/**
 * Simple hook that creates a timestamp when the component mounts
 * This represents when the user visited/loaded the current page
 */
export function usePageVisitTimestamp() {
  // Create timestamp once when hook is first called (component mount)
  const [visitTimestamp] = useState(() => new Date().toISOString());

  return {
    visitTimestamp,
  };
}
