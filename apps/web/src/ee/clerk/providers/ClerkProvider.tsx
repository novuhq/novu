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
  organizationProfile: {
    membersPage: {
      requestsTab: { autoSuggestions: { headerTitle: '' } },
      invitationsTab: { autoInvitations: { headerTitle: '' } },
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
    gap: 'var(--nv-spacing-75)',
  },
  userPreviewSecondaryIdentifier: {
    color: 'var(--nv-colors-typography-text-secondary)',
  },
  userPreviewAvatarContainer: {
    width: 'var(--nv-sizes-m)',
    height: 'var(--nv-sizes-m)',
  },
  userPreviewAvatarBox: {
    width: 'var(--nv-sizes-m)',
    height: 'var(--nv-sizes-m)',
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
  /*
   * PLAT-146 this should be uncommented when the linked task is done
   * button__manageAccount: {
   *   backgroundColor: 'var(--nv-colors-surface-panel-section)',
   *   borderStyle: 'none',
   *   boxShadow: 'unset !important',
   *   fontSize: 'var(--nv-font-sizes-75)',
   *   borderRadius: 'var(--nv-radii-75)',
   *   height: '24px',
   * },
   * button__signOut: {
   *   backgroundColor: 'var(--nv-colors-surface-panel-section)',
   *   borderStyle: 'none',
   *   boxShadow: 'unset !important',
   *   fontSize: 'var(--nv-font-sizes-75)',
   *   borderRadius: 'var(--nv-radii-75)',
   *   height: '24px',
   * },
   */
  organizationPreviewMainIdentifier: {
    lineHeight: 'var(--nv-line-heights-125)',
    color: 'var(--nv-colors-typography-text-main)',
  },
  organizationPreviewSecondaryIdentifier: {
    color: 'var(--nv-colors-typography-text-secondary)',
  },
  userButtonPopoverActionButtonIconBox__addAccount: {
    width: 'var(--nv-sizes-m)',
    height: 'var(--nv-sizes-m)',
    flex: 'none',
  },
  userButtonPopoverActionButtonIcon__addAccount: {
    width: 'var(--nv-sizes-m)',
    height: 'var(--nv-sizes-m)',
    '& circle': {
      r: 18,
      'stroke-opacity': 0,
    },
  },
  userButtonPopoverActionButton__signOutAll: {
    gap: 'var(--nv-spacing-75)',
    '&:hover': {
      color: 'var(--nv-colors-typography-text-main)',
    },
  },
  userButtonPopoverActionButton__addAccount: {
    gap: 'var(--nv-spacing-75)',
    '&:hover': {
      color: 'var(--nv-colors-typography-text-main)',
    },
  },
  userButtonPopoverActionButtonIconBox__signOutAll: {
    width: 'var(--nv-sizes-icon-24)',
    height: 'var(--nv-sizes-icon-24)',
    margin: '0 var(--nv-spacing-margins-icons-icon20-icon20)',
    flex: 'none',
  },
  userButtonPopoverActionButtonIcon__signOutAll: {
    width: 'var(--nv-sizes-xs)',
    height: 'var(--nv-sizes-xs)',
  },
  organizationSwitcherPopoverActionButtonIconBox: {
    width: 'var(--nv-sizes-m)',
    height: 'var(--nv-sizes-m)',
    flex: 'none',
  },
  organizationSwitcherPopoverActionButtonIcon: {
    width: 'var(--nv-sizes-m)',
    height: 'var(--nv-sizes-m)',
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
    gap: 'var(--nv-spacing-75)',
    padding: 'var(--nv-spacing-100) var(--nv-spacing-125)',
    '&:hover': {
      color: 'var(--nv-colors-typography-text-main) !important',
    },
  },
  organizationSwitcherTrigger: {
    '.cl-organizationPreview': {
      gap: 'var(--nv-spacing-75)',
      '.cl-organizationPreviewAvatarContainer > .cl-organizationPreviewAvatarBox': {
        width: 'var(--nv-sizes-icon-20)',
        height: 'var(--nv-sizes-icon-20)',
      },
    },
  },
  organizationSwitcherPreviewButton: {
    borderWidth: '0 !important',
    borderStyle: 'none',
  },
  organizationSwitcherPopoverCard: {
    borderWidth: '0',
    borderStyle: 'none',
  },

  organizationPreviewAvatarBox: {
    width: 'var(--nv-sizes-m)',
    height: 'var(--nv-sizes-m)',
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
    padding: '0',
  },
  pageScrollBox: {
    padding: '0',
  },
  profileSectionItemList__organizationDomains: {
    display: 'none',
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
    opacity: 'var(--nv-opacity-100)',
    color: 'var(--nv-colors-typography-text-secondary)',
    '&.cl-active': {
      color: 'var(--nv-colors-typography-text-main)',
      background: 'var(--nv-colors-surface-page)',
      '& svg': {
        color: 'var(--nv-colors-typography-text-main)',
        fill: 'var(--nv-colors-typography-text-main)',
        opacity: 'var(--nv-opacity-100)',
      },
    },
    '&:hover, &:focus, &:active': {
      color: 'var(--nv-colors-typography-text-main)',
      background: 'var(--nv-colors-surface-page)',
      opacity: 'var(--nv-opacity-100)',
      '& svg': {
        color: 'var(--nv-colors-typography-text-main)',
        fill: 'var(--nv-colors-typography-text-main)',
        opacity: 'var(--nv-opacity-100)',
      },
    },
  },
  navbarButtonIcon: {
    height: 'var(--nv-sizes-125)',
    width: 'var(--nv-sizes-125)',
    opacity: 'var(--nv-opacity-100)',
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
