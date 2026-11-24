'use client';

import { useEffect } from 'react';

/** What the header covers at the top of the window: its 50px and its line. */
const COVERED = 51;

/**
 * Brings a control that took the focus out from under the header. The header lies over the top of the window,
 * and a browser counts what is under it as in view, so it leaves a focused link there, out of sight. The
 * header's own controls stay where they are.
 */
export function SiteHeaderFocus() {
  useEffect(() => {
    const reveal = (event: FocusEvent) => {
      if (!(event.target instanceof Element) || event.target.closest('header')) return;
      const { top } = event.target.getBoundingClientRect();
      if (top < COVERED) scrollBy({ top: top - COVERED, behavior: 'instant' });
    };
    document.addEventListener('focusin', reveal);

    return () => document.removeEventListener('focusin', reveal);
  }, []);

  return null;
}
