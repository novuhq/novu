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
    action__signOut: 'Log out',
    action__signOutAll: 'Log out from all accounts',
    action__manageAccount: 'Settings',
  },
};

const CLERK_MODAL_ELEMENT = {
  organizationSwitcherPopoverMain: { backgroundColor: 'var(--nv-colors-surface-panel-subsection)' },
  userPreviewMainIdentifier: {
    fontWeight: 'var(--nv-font-weights-strong)',
    lineHeight: 'var(--nv-line-heights-125)',
    color: 'var(--nv-colors-typography-text-main)',
  },
  userPreview: {
    gap: '12px',
  },
  userPreviewSecondaryIdentifier: {
    color: 'var(--nv-colors-typography-text-secondary)',
  },
  userPreviewAvatarContainer: {
    width: '40px',
    height: '40px',
  },
  userPreviewAvatarBox: {
    width: '40px',
    height: '40px',
  },
  userButtonPopoverFooter: {
    borderStyle: 'none',
    borderWidth: '0 !important',
    background: 'inherit',
    backgroundColor: 'var(--nv-colors-surface-panel-subsection) !important',
  },
  userButtonPopoverCard: {
    backgroundColor: 'var(--nv-colors-surface-panel-subsection)',
    borderStyle: 'none',
    borderWidth: '0 !important',
  },
  userButtonPopoverActionButton: {
    fontWeight: 'var(--nv-font-weights-strong)',
    lineHeight: 'var(--nv-line-heights-125)',
    color: 'var(--nv-colors-typography-text-main)',
    borderStyle: 'none',
    borderWidth: '0 !important',
  },
  button__manageAccount: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderStyle: 'none',
    boxShadow: 'unset !important',
    fontSize: 'var(--nv-font-sizes-75)',
    borderRadius: '6px',
    width: '120px !important',
    height: '24px',
    padding: '0px',
  },
  button__signOut: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderStyle: 'none',
    boxShadow: 'unset !important',
    fontSize: 'var(--nv-font-sizes-75)',
    borderRadius: '6px',
    width: '120px !important',
    height: '24px',
    padding: '0px',
  },
  organizationPreviewMainIdentifier: {
    lineHeight: 'var(--nv-line-heights-125)',
    color: 'var(--nv-colors-typography-text-main)',
  },
  organizationPreviewSecondaryIdentifier: {
    color: 'var(--nv-colors-typography-text-secondary)',
  },
  userButtonPopoverActionButtonIconBox__addAccount: {
    width: '40px',
    height: '40px',
    flex: 'none',
  },
  userButtonPopoverActionButtonIcon__addAccount: {
    width: '40px',
    height: '40px',
    '& circle': {
      r: 18,
      'stroke-opacity': 0,
    },
  },
  userButtonPopoverActionButton__signOutAll: {
    gap: '12px',
    '&:hover': {
      color: 'var(--nv-colors-typography-text-main)',
    },
  },
  userButtonPopoverActionButton__addAccount: {
    gap: '12px',
    '&:hover': {
      color: 'var(--nv-colors-typography-text-main)',
    },
  },
  userButtonPopoverActionButtonIconBox__signOutAll: {
    width: '40px',
    height: '40px',
    flex: 'none',
    gap: 'none',
  },
  userButtonPopoverActionButtonIcon__signOutAll: {
    width: '24px',
    height: '24px',
    //margin: '16px',
  },
  organizationSwitcherPopoverActionButtonIconBox: {
    width: '40px',
    height: '40px',
    flex: 'none',
  },
  organizationSwitcherPopoverActionButtonIcon: {
    width: '40px',
    height: '40px',
    '& circle': {
      r: 18,
      'stroke-opacity': 0,
    },
  },
  organizationSwitcherPopoverActionButton: {
    borderWidth: '0 !important',
    borderStyle: 'none',
    lineHeight: 'var(--nv-line-heights-125)',
    color: 'var(--nv-colors-typography-text-main)',
    fontFamily: 'var(--nv-fonts-system)',
    fontSize: 'var(--nv-font-sizes-88)',
    fontWeight: 'var(--nv-font-weights-strong)',
    gap: '12px',
    padding: '16px 20px 16px 20px',
    '&:hover': {
      color: 'var(--nv-colors-typography-text-main) !important',
    },
  },
  organizationSwitcherTrigger: {
    '.cl-organizationPreview': {
      gap: '12px',
      '.cl-organizationPreviewAvatarContainer > .cl-organizationPreviewAvatarBox': {
        width: '20px',
        height: '20px',
      },
    },
  },
  organizationSwitcherPreviewButton: {
    borderWidth: '0px !important',
    borderStyle: 'none',
  },
  organizationSwitcherPopoverCard: {
    borderWidth: '0',
    borderStyle: 'none',
  },

  organizationPreviewAvatarBox: {
    width: '40px',
    height: '40px',
  },

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
    backgroundColor: 'var(--nv-colors-surface-panel-subsection)',
  },
  userButtonPopoverMain: {
    backgroundColor: 'var(--nv-colors-surface-panel-subsection)',
    boxShadow: 'unset !important',
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

const ALLOWED_REDIRECT_ORIGINS = ['http://localhost:*', location.origin];

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
