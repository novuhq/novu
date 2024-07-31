import { PropsWithChildren, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CLERK_PUBLISHABLE_KEY, IS_EE_AUTH_ENABLED } from '../../../config/index';
import { ClerkProp, ClerkProvider as _ClerkProvider } from '@clerk/clerk-react';
import { useColorScheme } from '@novu/design-system';
import { dark } from '@clerk/themes';
import { buildClerk } from './clerk-singleton';
import { Variables } from '@clerk/types';

const CLERK_LOCALIZATION = {
  userProfile: {
    navbar: {
      title: 'Settings',
      description: '',
      account: 'User profile',
      security: 'Access security',
    },
  },

  userButton: {
    action__signOut: 'Log Out',
  },
};

const ALLOWED_REDIRECT_ORIGINS = ['http://localhost:*', location.origin];

export const ClerkProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const { colorScheme } = useColorScheme();

  const panelBackgroundColor = colorScheme === 'dark' ? '#1E1E26' : '#FFFFFF';

  const CLERK_MODAL_ELEMENT = {
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
    scrollBox: {
      backgroundColor: panelBackgroundColor,
    },
    userButtonPopoverMain: {
      backgroundColor: panelBackgroundColor,
    },
    rootBox: {
      width: 'auto',
    },
    navbar: {
      background: 'var(--nv-colors-surface-panel) !important',
      '& h1': {
        fontFamily: 'var(--nv-fonts-system) !important',
        fontWeight: 'var(--nv-font-weights-strong) !important',
        fontSize: 'var(--nv-font-sizes-150) !important',
        letterSpacing: '0',
        textDecoration: 'none',
        lineHeight: 'var(--nv-line-heights-200) !important',
      },
    },
    headerTitle: {
      fontFamily: 'var(--nv-fonts-system) !important',
      fontWeight: 'var(--nv-font-weights-strong) !important',
      fontSize: 'var(--nv-font-sizes-125) !important',
      letterSpacing: '0',
      textDecoration: 'none',
      lineHeight: 'var(--nv-line-heights-175) !important',
    },
    navbarButton: {
      fontFamily: 'var(--nv-fonts-system) !important',
      fontWeight: 'var(--nv-font-weights-strong) !important',
      fontSize: 'var(--nv-font-sizes-88) !important',
      paddingTop: 'var(--nv-spacing-50) !important',
      paddingBottom: 'var(--nv-spacing-50) !important',
      opacity: '1',
      color: 'var(--nv-colors-typography-text-secondary) !important',
      '&.cl-active': {
        color: 'var(--nv-colors-typography-text-main) !important',
        background: 'var(--nv-colors-surface-page) !important',
        '& svg': {
          color: 'var(--nv-colors-typography-text-main) !important',
          fill: 'var(--nv-colors-typography-text-main) !important',
          opacity: '1',
        },
      },
      '&:hover, &:focus, &:active': {
        color: 'var(--nv-colors-typography-text-main) !important',
        background: 'var(--nv-colors-surface-page) !important',
        opacity: '1',
        '& svg': {
          color: 'var(--nv-colors-typography-text-main) !important',
          fill: 'var(--nv-colors-typography-text-main) !important',
          opacity: '1',
        },
      },
    },
    navbarButtonIcon: {
      height: 'var(--nv-sizes-125)',
      width: 'var(--nv-sizes-125)',
      opacity: '1 !important',
    },
  };

  const CLERK_OVERRIDE_VARIABLES: Variables = {
    fontFamily: 'var(--nv-fonts-system)',
    fontSize: 'var(--nv-font-sizes-88)',
  };

  const [clerkInstance, setClerkInstance] = useState<ClerkProp>();

  const navigate = useNavigate();

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
        createOrganization: {
          elements: {
            modalContent: {
              width: 'auto',
            },
            rootBox: {
              width: '420px',
            },
          },
        },
        elements: CLERK_MODAL_ELEMENT,
        variables: CLERK_OVERRIDE_VARIABLES,
      }}
      localization={CLERK_LOCALIZATION}
      allowedRedirectOrigins={ALLOWED_REDIRECT_ORIGINS}
    >
      {children}
    </_ClerkProvider>
  );
};
