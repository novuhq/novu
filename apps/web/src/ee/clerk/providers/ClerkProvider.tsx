import { PropsWithChildren, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CLERK_PUBLISHABLE_KEY, IS_EE_AUTH_ENABLED } from '../../../config/index';
import { ClerkProp, ClerkProvider as _ClerkProvider } from '@clerk/clerk-react';
import { useColorScheme } from '@novu/design-system';
import { dark } from '@clerk/themes';
import { buildClerk } from './clerk-singleton';

const ClerkModalElement = {
  modalContent: {
    width: '80rem',
    display: 'block',
  },
  modalBackdrop: {
    zIndex: 200,
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

const ALLOWED_REDIRECT_ORIGINS = ['http://localhost:*', location.origin];

export const ClerkProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const [clerkInstance, setClerkInstance] = useState<ClerkProp>();

  const navigate = useNavigate();
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    (async () => {
      if (IS_EE_AUTH_ENABLED) {
        setClerkInstance(await buildClerk({ publishableKey: CLERK_PUBLISHABLE_KEY }));
      }
    })();
  }, []);

  if (!IS_EE_AUTH_ENABLED) {
    return <>{children}</>;
  }

  if (IS_EE_AUTH_ENABLED && !clerkInstance) {
    return null;
  }

  return (
    <_ClerkProvider
      Clerk={clerkInstance}
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
