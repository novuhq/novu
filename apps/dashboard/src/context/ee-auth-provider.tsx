import { ClerkProvider as _ClerkProvider } from '@clerk/react';
import { PropsWithChildren } from 'react';
import { useNavigate } from 'react-router-dom';
import { buttonVariants } from '@/components/primitives/button';
import { CLERK_PUBLISHABLE_KEY, EE_AUTH_PROVIDER, IS_ENTERPRISE, IS_SELF_HOSTED } from '@/config';
import { isAbsoluteUrl } from '@/utils/apps';
import { buildClerkAllowedRedirectOrigins } from '@/utils/product-auth-urls';
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

  // Escape React Router for absolute URLs; otherwise navigate in-app.
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

  const signInUrl = ROUTES.SIGN_IN;
  const signUpUrl = ROUTES.SIGN_UP;

  const allowedRedirectOrigins = buildClerkAllowedRedirectOrigins();

  return (
    <_ClerkProvider
      routerPush={(to) => navigateClerk(to)}
      routerReplace={(to) => navigateClerk(to, true)}
      publishableKey={CLERK_PUBLISHABLE_KEY}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
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
      allowedRedirectOrigins={allowedRedirectOrigins}
    >
      {children}
    </_ClerkProvider>
  );
};

export { EEAuthProvider as ClerkProvider };
