import { ClerkProvider as _ClerkProvider } from '@clerk/clerk-react';
import { PropsWithChildren } from 'react';
import { useNavigate } from 'react-router-dom';
import { buttonVariants } from '@/components/primitives/button';
import {
  CLERK_PUBLISHABLE_KEY,
  EE_AUTH_PROVIDER,
  IS_ENTERPRISE,
  IS_HOSTNAME_SPLIT_ENABLED,
  IS_SELF_HOSTED,
  NOVU_CONNECT_HOSTNAME,
  NOVU_PLATFORM_HOSTNAME,
} from '@/config';
import { isAbsoluteUrl } from '@/utils/apps';
import { buildAfterSignOutUrl } from '@/utils/cross-product-sign-out';
import { ROUTES } from '@/utils/routes';

type EEAuthProviderProps = PropsWithChildren;

export const EEAuthProvider = (props: EEAuthProviderProps) => {
  const navigate = useNavigate();
  const { children } = props;

  if (IS_SELF_HOSTED && !IS_ENTERPRISE) {
    // @ts-expect-error - Self-hosted ClerkProvider has simpler props
    return <_ClerkProvider>{children}</_ClerkProvider>;
  }

  if (EE_AUTH_PROVIDER === 'better-auth') {
    // @ts-expect-error - Better Auth wrapper has different props via vite alias
    return <_ClerkProvider>{children}</_ClerkProvider>;
  }

  // Platform and Connect are separate origins with independent Clerk sessions (no satellite).
  // Sign-in/sign-up stay on whichever host you are on. Rail switching uses CrossAppLink to pass
  // the dev auth token when you are already signed in on the source host.
  const navigateClerk = (to: string, replace = false) => {
    if (isAbsoluteUrl(to)) {
      if (replace) {
        window.location.replace(to);
      } else {
        window.location.assign(to);
      }

      return;
    }

    if (replace) {
      navigate(to, { replace: true });
    } else {
      navigate(to);
    }
  };

  return (
    <_ClerkProvider
      routerPush={(to) => navigateClerk(to)}
      routerReplace={(to) => navigateClerk(to, true)}
      publishableKey={CLERK_PUBLISHABLE_KEY}
      signInUrl={ROUTES.SIGN_IN}
      signUpUrl={ROUTES.SIGN_UP}
      afterSignOutUrl={buildAfterSignOutUrl()}
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
      allowedRedirectOrigins={[
        'http://localhost:*',
        window.location.origin,
        ...(IS_HOSTNAME_SPLIT_ENABLED && NOVU_PLATFORM_HOSTNAME
          ? [`${window.location.protocol}//${NOVU_PLATFORM_HOSTNAME}`]
          : []),
        ...(IS_HOSTNAME_SPLIT_ENABLED && NOVU_CONNECT_HOSTNAME
          ? [`${window.location.protocol}//${NOVU_CONNECT_HOSTNAME}`]
          : []),
      ]}
    >
      {children}
    </_ClerkProvider>
  );
};

export { EEAuthProvider as ClerkProvider };
