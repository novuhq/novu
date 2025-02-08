import { buttonVariants } from '@/components/primitives/button';
import { CLERK_PUBLISHABLE_KEY } from '@/config';
import { ClerkProvider as _ClerkProvider } from '@clerk/clerk-react';
import { PropsWithChildren } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/routes';

type ClerkProviderProps = PropsWithChildren;
export const ClerkProvider = (props: ClerkProviderProps) => {
  const navigate = useNavigate();
  const { children } = props;

  return (
    <_ClerkProvider
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      publishableKey={CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl={ROUTES.SIGN_IN}
      appearance={{
        userButton: {
          elements: {
            userButtonAvatarBox: {
              width: '24px',
              height: '24px',
            },
          },
        },
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
        organizationList: {
          elements: {
            cardBox: {
              borderRadius: '0',
            },
            card: {
              borderRadius: '0',
            },
          },
        },
        elements: {
          formButtonPrimary: buttonVariants({ variant: 'primary', mode: 'gradient' }).root({}),
        },
        variables: {
          fontSize: '14px !important',
        },
      }}
      localization={{
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
        formFieldLabel__organizationSlug: 'URL friendly identifier',
        unstable__errors: {
          form_identifier_exists: 'Already taken, please choose another',
        },
      }}
      allowedRedirectOrigins={['http://localhost:*', window.location.origin]}
    >
      {children}
    </_ClerkProvider>
  );
};
