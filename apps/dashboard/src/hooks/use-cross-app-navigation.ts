import { useCallback } from 'react';
import { isSafeNavigationHref } from '@/utils/apps';

// Plain cross-origin navigation. The Connect satellite Clerk SDK handles session sync via its
// built-in handshake on the destination page — wrapping with `clerk.redirectWithAuth` here caused
// a `__clerk_synced=false` redirect loop with Platform.
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
