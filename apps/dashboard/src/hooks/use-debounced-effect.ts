import debounce from 'lodash.debounce';
import { useEffect, useMemo, useState } from 'react';

type Callback = () => void;
type DependencyList = ReadonlyArray<any>;

/**
 * Custom hook that runs the callback immediately on the first render
 * and debounced on subsequent renders based on the dependency array.
 *
 * @param callback - The function to be executed.
 * @param deps - Dependency array for the effect.
 * @param delay - Delay in milliseconds for the debounced function.
 */
function useDebouncedEffect(callback: Callback, delay: number, deps: DependencyList): void {
  const [hasRunOnFirstRender, setHasRunOnFirstRender] = useState(false);

  const debouncedCallback = useMemo(() => debounce(callback, delay), [callback, delay]);

  useEffect(() => {
    if (!hasRunOnFirstRender) {
      callback();
      setHasRunOnFirstRender(true);
    } else {
      debouncedCallback();
    }

    return () => {
      debouncedCallback.cancel();
    };
  }, deps);
}

export default useDebouncedEffect;
