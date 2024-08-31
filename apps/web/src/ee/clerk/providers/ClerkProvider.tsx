import { PropsWithChildren, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClerkProp, ClerkProvider as _ClerkProvider } from '@clerk/clerk-react';
import { useColorScheme } from '@novu/design-system';
import { dark } from '@clerk/themes';
import { Variables } from '@clerk/types';
import { buildClerk } from './clerk-singleton';
import { CLERK_PUBLISHABLE_KEY, IS_EE_AUTH_ENABLED } from '../../../config/index';

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
    backgroundColor: 'var(--nv-colors-surface-page)',
  },
  userButtonPopoverMain: {
    backgroundColor: 'var(--nv-colors-surface-page)',
  },
  rootBox: {
    width: 'auto',
  },
  navbar: {
    background: 'var(--nv-colors-surface-panel)',
    '& h1': {
      fontFamily: 'var(--nv-fonts-system)',
      fontWeight: 'var(--nv-font-weights-strong)',
      fontSize: 'var(--nv-font-sizes-150)',
      letterSpacing: '0',
      textDecoration: 'none',
      lineHeight: 'var(--nv-line-heights-200)',
    },
  },
  headerTitle: {
    fontFamily: 'var(--nv-fonts-system)',
    fontWeight: 'var(--nv-font-weights-strong)',
    fontSize: 'var(--nv-font-sizes-125)',
    letterSpacing: '0',
    textDecoration: 'none',
    lineHeight: 'var(--nv-line-heights-175)',
  },
  navbarButton: {
    fontFamily: 'var(--nv-fonts-system)',
    fontWeight: 'var(--nv-font-weights-strong)',
    fontSize: 'var(--nv-font-sizes-88)',
    paddingTop: 'var(--nv-spacing-50)',
    paddingBottom: 'var(--nv-spacing-50)',
    opacity: '1',
    color: 'var(--nv-colors-typography-text-secondary)',
    '&.cl-active': {
      color: 'var(--nv-colors-typography-text-main)',
      background: 'var(--nv-colors-surface-page)',
      '& svg': {
        color: 'var(--nv-colors-typography-text-main)',
        fill: 'var(--nv-colors-typography-text-main)',
        opacity: '1',
      },
    },
    '&:hover, &:focus, &:active': {
      color: 'var(--nv-colors-typography-text-main)',
      background: 'var(--nv-colors-surface-page)',
      opacity: '1',
      '& svg': {
        color: 'var(--nv-colors-typography-text-main)',
        fill: 'var(--nv-colors-typography-text-main)',
        opacity: '1',
      },
    },
  },
  navbarButtonIcon: {
    height: 'var(--nv-sizes-125)',
    width: 'var(--nv-sizes-125)',
    opacity: '1',
  },
  impersonationFab: {
    backgroundColor: 'var(--nv-colors-surface-page)',
  },
};

const CLERK_OVERRIDE_VARIABLES: Variables = {
  fontFamily: 'var(--nv-fonts-system)',
  fontSize: 'var(--nv-font-sizes-88)',
};

const ALLOWED_REDIRECT_ORIGINS = ['http://localhost:*', window.location.origin];

export const ClerkProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const { colorScheme } = useColorScheme();

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
