import { useEffect, useState } from 'react';

/**
 * A hook that delays showing loading state for a specified duration.
 * This prevents jarring skeleton flashes for quick API responses while
 * still providing visual feedback for longer operations.
 *
 * @param isLoading - The actual loading state
 * @param delay - Time in milliseconds to wait before showing loading state (default: 800ms)
 * @returns boolean indicating whether to show the loading skeleton
 */
export function useDelayedLoading(isLoading: boolean, delay: number = 800) {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowSkeleton(true);
      }, delay);

      return () => clearTimeout(timer);
    } else {
      setShowSkeleton(false);
    }
  }, [isLoading, delay]);

  return showSkeleton;
}
