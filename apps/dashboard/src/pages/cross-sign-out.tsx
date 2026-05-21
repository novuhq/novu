import { useAuth, useClerk } from '@clerk/clerk-react';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IS_NOVU_CONNECT } from '@/config';
import { clearConnectAutoCreateSessionGuard, clearConnectProvisioning } from '@/utils/connect';
import { ROUTES } from '@/utils/routes';

function clearConnectSessionState(): void {
  clearConnectProvisioning();
  clearConnectAutoCreateSessionGuard();
}

export function CrossSignOutPage() {
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useAuth();
  const [searchParams] = useSearchParams();

  const redirectUrl = useMemo(() => {
    const requested = searchParams.get('redirect_url');

    if (requested) {
      return requested;
    }

    return ROUTES.SIGN_IN;
  }, [searchParams]);

  useEffect(() => {
    if (!isLoaded || !clerk.loaded) {
      return;
    }

    if (IS_NOVU_CONNECT) {
      clearConnectSessionState();
    }

    const finishSignOut = async () => {
      if (isSignedIn) {
        await clerk.signOut({ redirectUrl });

        return;
      }

      window.location.replace(redirectUrl);
    };

    void finishSignOut();
  }, [clerk, isLoaded, isSignedIn, redirectUrl]);

  return null;
}
