import { buttonVariants } from '@/components/primitives/button';
import {
  CLERK_PUBLISHABLE_KEY,
  EE_AUTH_PROVIDER,
  getHostnameWithoutPort,
  IS_ENTERPRISE,
  IS_HOSTNAME_SPLIT_ENABLED,
  IS_NOVU_CONNECT,
  IS_SELF_HOSTED,
  NOVU_CONNECT_HOSTNAME,
} from '@/config';
import { isAbsoluteUrl } from '@/utils/apps';
import { buildAfterSignOutUrl } from '@/utils/cross-product-sign-out';
import {
  buildClerkAllowedRedirectOrigins,
  buildPrimarySignInUrl,
  buildPrimarySignUpUrl,
  CONNECT_PRODUCT_VALUE,
  PRODUCT_QUERY_PARAM,
} from '@/utils/product-auth-urls';
import { ROUTES } from '@/utils/routes';
import { ClerkProvider as _ClerkProvider } from '@clerk/react';
import { PropsWithChildren } from 'react';
import { useNavigate } from 'react-router-dom';

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

  // Escape React Router for absolute URLs (cross-origin handoff) and re-attach `?product=` so
  // Clerk's internal sub-route pushes don't strip the Connect-branding flag mid-flow.
  const navigateClerk = (to: string, replace = false) => {
    if (isAbsoluteUrl(to)) {
      if (replace) {
        window.location.replace(to);
      } else {
        window.location.assign(to);
      }

      return;
    }

    let target = to;

    if (typeof window !== 'undefined' && target.startsWith('/auth/')) {
      const currentProduct = new URLSearchParams(window.location.search).get(PRODUCT_QUERY_PARAM);

      if (currentProduct) {
        const url = new URL(target, window.location.origin);

        if (!url.searchParams.has(PRODUCT_QUERY_PARAM)) {
          url.searchParams.set(PRODUCT_QUERY_PARAM, currentProduct);
          target = `${url.pathname}${url.search}${url.hash}`;
        }
      }
    }

    if (replace) {
      navigate(target, { replace: true });
    } else {
      navigate(target);
    }
  };

  // Sign-in flows are only allowed on the primary; satellite must point `signInUrl`/`signUpUrl`
  // back to it. Primary lists the Connect origin in `allowedRedirectOrigins` for post-auth bounce.
  const isSatellite = IS_HOSTNAME_SPLIT_ENABLED && IS_NOVU_CONNECT;

  const satelliteSignInUrl = buildPrimarySignInUrl({ product: CONNECT_PRODUCT_VALUE });
  const satelliteSignUpUrl = buildPrimarySignUpUrl({ product: CONNECT_PRODUCT_VALUE });

  const signInUrl = isSatellite ? satelliteSignInUrl : ROUTES.SIGN_IN;
  const signUpUrl = isSatellite ? satelliteSignUpUrl : ROUTES.SIGN_UP;

  const satelliteProps = isSatellite
    ? {
        isSatellite: true as const,
        domain: getHostnameWithoutPort(NOVU_CONNECT_HOSTNAME),
        // Clerk v6 / Core 3 flipped the satellite default from auto-sync ON to OFF (#7597), so
        // Connect now treats every first page load as anonymous unless cookies are already
        // present — primary's sign-in then bounces back to a still-anonymous satellite and we
        // loop. We rely on the Core 2 behavior (auto-handshake with primary on first load) so
        // an already-signed-in user on Platform is recognized on Connect without re-auth.
        // See https://clerk.com/docs/guides/development/upgrading/upgrade-guides/core-3
        satelliteAutoSync: true,
      }
    : {};

  const allowedRedirectOrigins = buildClerkAllowedRedirectOrigins();

  return (
    <_ClerkProvider
      {...satelliteProps}
      routerPush={(to) => navigateClerk(to)}
      routerReplace={(to) => navigateClerk(to, true)}
      publishableKey={CLERK_PUBLISHABLE_KEY}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
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
      allowedRedirectOrigins={allowedRedirectOrigins}
    >
      {children}
    </_ClerkProvider>
  );
};

export { EEAuthProvider as ClerkProvider };
