'use client';

import { useEffect, useState } from 'react';

/**
 * Shows `target`, but only after what was shown before has had `ms` to fade out. While `leaving` is
 * true the old view is still the one to render, on its way out.
 */
export function useSwap<View extends string>(target: View, ms: number) {
  const [shown, setShown] = useState(target);
  const leaving = shown !== target;

  useEffect(() => {
    if (!leaving) {
      return;
    }

    const timer = setTimeout(() => setShown(target), ms);

    return () => clearTimeout(timer);
  }, [leaving, target, ms]);

  return { shown, leaving };
}
