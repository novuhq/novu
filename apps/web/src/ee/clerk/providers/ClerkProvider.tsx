import { PropsWithChildren, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CLERK_PUBLISHABLE_KEY, IS_EE_AUTH_ENABLED } from '../../../config/index';
import { BrowserClerk, ClerkProvider as _ClerkProvider } from '@clerk/clerk-react';
import { Clerk } from '@clerk/clerk-js';
import { useColorScheme } from '@novu/design-system';
import { dark } from '@clerk/themes';
import { normalizeEmail } from '@novu/shared';
import { api } from '../../../api/api.client';

const ClerkModalElement = {
  modalContent: {
    width: '80rem',
    display: 'block',
  },
  cardBox: {
    width: '100%',
  },
  rootBox: {
    width: 'auto',
  },
};

const localization = {
  userProfile: {
    navbar: {
      title: 'Settings',
      description: 'Manage your account settings',
    },
  },
};

const ALLOWED_REDIRECT_ORIGINS = ['http://localhost:*'];

const clerk = new Clerk(CLERK_PUBLISHABLE_KEY);

function getEmailFromQuery(query: string): string | null {
  const params = new URLSearchParams(query);
  const identifier = params.get('identifier');

  return identifier ? decodeURIComponent(identifier) : null;
}

function normalizeEmailData(email: string) {
  return api.post('/clerk/user/normalize', { email });
}

export const ClerkProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const [clerkInstance, setClerkInstance] = useState<Clerk>();

  const navigate = useNavigate();
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    (async () => {
      // setting Clerk onBeforeRequest to be used in the AuthProvider
      console.log('setting Clerk onBeforeRequest to be used in the AuthProvider');

      clerk.__unstable__onBeforeRequest(async (requestInit) => {
        console.log('requestInit', requestInit);
        const { path, method, body } = requestInit;
        const isSignIn = path === '/client/sign_ins' && method === 'POST';

        if (isSignIn) {
          const email = getEmailFromQuery(body as string);
          if (email && email !== normalizeEmail(email)) {
            await normalizeEmailData(email);
          }
        }

        return requestInit;
      });

      await clerk.load();
      setClerkInstance(clerk);
    })();
  }, []);

  if (!clerkInstance) return <div>Loading...</div>;

  if (!IS_EE_AUTH_ENABLED) {
    return <>{children}</>;
  }

  return (
    <_ClerkProvider
      Clerk={clerkInstance as unknown as BrowserClerk}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      publishableKey={CLERK_PUBLISHABLE_KEY}
      appearance={{
        baseTheme: colorScheme === 'dark' ? dark : undefined,
        elements: ClerkModalElement,
      }}
      localization={localization}
      allowedRedirectOrigins={ALLOWED_REDIRECT_ORIGINS}
    >
      {children}
    </_ClerkProvider>
  );
};
