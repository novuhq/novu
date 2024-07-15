import { PropsWithChildren } from 'react';
import { useNavigate } from 'react-router-dom';
import { CLERK_PUBLISHABLE_KEY, IS_EE_AUTH_ENABLED } from '../../../config/index';
import { ClerkProvider as _ClerkProvider } from '@clerk/clerk-react';
import { useColorScheme } from '@novu/design-system';
import { dark } from '@clerk/themes';

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

const ALLOWED_REDIRECT_ORIGINS = ['http://localhost:2022', new URL(location.href).origin];

export const ClerkProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const navigate = useNavigate();
  const { colorScheme } = useColorScheme();

  if (!IS_EE_AUTH_ENABLED) {
    return <>{children}</>;
  }

  return (
    <_ClerkProvider
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
