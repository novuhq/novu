import { useCallback } from 'react';
import { isSafeNavigationHref } from '@/utils/apps';

// Plain cross-origin navigation. Primary and Connect share session cookies via the registrable
// domain, so the destination page reads the existing Clerk session natively from a normal
// browser navigation.
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
