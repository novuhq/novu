import { useCallback } from 'react';
import { isSafeNavigationHref } from '@/utils/apps';

export function useCrossAppNavigation() {
  return useCallback((href: string, openInNewTab = false) => {
    // Whitelist http(s) / relative hrefs so callers can't smuggle `javascript:` / `data:` URLs in.
    if (!isSafeNavigationHref(href)) {
      return;
    }

    if (openInNewTab) {
      window.open(href, '_blank', 'noopener,noreferrer');

      return;
    }

    window.location.assign(href);
  }, []);
}
