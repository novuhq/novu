import { IS_HOSTNAME_SPLIT_ENABLED } from '@/config';
import { isAbsoluteUrl } from '@/utils/apps';
import { buildDestinationSignInUrl } from '@/utils/product-auth-urls';
import { ROUTES } from '@/utils/routes';
import { useAuth, useClerk } from '@clerk/clerk-react';
import { useCallback } from 'react';

export function useCrossAppNavigation() {
  const clerk = useClerk();
  const { isSignedIn, isLoaded } = useAuth();

  return useCallback(
    (href: string, openInNewTab = false) => {
      const isCrossOrigin = IS_HOSTNAME_SPLIT_ENABLED && isAbsoluteUrl(href);

      if (!isCrossOrigin) {
        if (openInNewTab) {
          window.open(href, '_blank', 'noopener,noreferrer');

          return;
        }

        window.location.assign(href);

        return;
      }

      if (!isLoaded || !clerk.loaded) {
        window.location.assign(href);

        return;
      }

      if (isSignedIn) {
        if (openInNewTab) {
          window.open(clerk.buildUrlWithAuth(href), '_blank');

          return;
        }

        void clerk.redirectWithAuth(href);

        return;
      }

      window.location.assign(buildDestinationSignInUrl(href, ROUTES.SIGN_IN));
    },
    [clerk, isLoaded, isSignedIn]
  );
}
