import { useCallback } from 'react';
import { useAuth, useClerk } from '@clerk/react';
import { IS_HOSTNAME_SPLIT_ENABLED } from '@/config';
import { isSafeNavigationHref } from '@/utils/apps';
import { navigateWithClerkSessionIfCrossOrigin } from '@/utils/connect/clerk-cross-origin-auth';
import { isConnectHostnameUrl } from '@/utils/product-auth-urls';

export function useCrossAppNavigation() {
  const { isSignedIn, isLoaded } = useAuth();
  const clerk = useClerk();

  return useCallback(
    (href: string, openInNewTab = false) => {
      if (!isSafeNavigationHref(href)) {
        return;
      }

      if (openInNewTab) {
        window.open(href, '_blank', 'noopener,noreferrer');

        return;
      }

      const shouldSyncClerkSession =
        IS_HOSTNAME_SPLIT_ENABLED && isConnectHostnameUrl(href) && isLoaded && isSignedIn && clerk.loaded;

      if (shouldSyncClerkSession) {
        void navigateWithClerkSessionIfCrossOrigin(clerk, href);

        return;
      }

      window.location.assign(href);
    },
    [clerk, isLoaded, isSignedIn]
  );
}
