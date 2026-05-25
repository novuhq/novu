import { buttonVariants } from '@/components/primitives/button';
import {
  CLERK_PUBLISHABLE_KEY,
  EE_AUTH_PROVIDER,
  IS_ENTERPRISE,
  IS_HOSTNAME_SPLIT_ENABLED,
  IS_NOVU_CONNECT,
  IS_SELF_HOSTED,
  NOVU_CONNECT_HOSTNAME,
  NOVU_PLATFORM_HOSTNAME,
} from '@/config';
import { isAbsoluteUrl } from '@/utils/apps';
import { buildAfterSignOutUrl } from '@/utils/cross-product-sign-out';
import {
  buildPrimarySignInUrl,
  buildPrimarySignUpUrl,
  CONNECT_PRODUCT_VALUE,
  PRODUCT_QUERY_PARAM,
} from '@/utils/product-auth-urls';
import { ROUTES } from '@/utils/routes';
import { ClerkProvider as _ClerkProvider } from '@clerk/clerk-react';
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

  /**
   * Clerk's `routerPush`/`routerReplace` receive in-app paths and the occasional absolute URL
   * (cross-origin sign-in handoff). For absolute URLs we have to escape React Router and use
   * the browser's navigation so we actually cross origins.
   *
   * Clerk drives its own internal sub-route navigation for sign-in / sign-up flows (e.g.
   * `/auth/sign-in` → `/auth/sign-in/factor-one`). React Router's `navigate(path)` drops the
   * current query string, which would strip the `?product=connect` flag mid-flow and cause
   * the primary's auth page to fall back to Platform branding. We re-attach the flag whenever
   * Clerk pushes us into a different auth path inside the same flow.
   */
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

  /*
   * Satellite mode (Connect host): Clerk owns session sync. On every cold visit the SDK
   * auto-redirects to the primary's handshake endpoint, picks up the cookie, and bounces back —
   * no clicks required and no token-in-hash to babysit. `signInUrl`/`signUpUrl` must be
   * absolute URLs back to the primary because sign-in flows are only allowed there.
   *
   * Primary mode (Platform host): standard Clerk config plus `allowedRedirectOrigins` for the
   * Connect satellite so post-auth `forceRedirectUrl` back to connect.novu.co is honored.
   */
  const isSatellite = IS_HOSTNAME_SPLIT_ENABLED && IS_NOVU_CONNECT;

  const satelliteSignInUrl = buildPrimarySignInUrl({ product: CONNECT_PRODUCT_VALUE });
  const satelliteSignUpUrl = buildPrimarySignUpUrl({ product: CONNECT_PRODUCT_VALUE });

  const signInUrl = isSatellite ? satelliteSignInUrl : ROUTES.SIGN_IN;
  const signUpUrl = isSatellite ? satelliteSignUpUrl : ROUTES.SIGN_UP;

  const satelliteProps = isSatellite
    ? {
        isSatellite: true as const,
        domain: NOVU_CONNECT_HOSTNAME,
      }
    : {};

  const allowedRedirectOrigins: Array<string | RegExp> = [
    'http://localhost:*',
    ...(typeof window !== 'undefined' ? [window.location.origin] : []),
    ...(IS_HOSTNAME_SPLIT_ENABLED && NOVU_PLATFORM_HOSTNAME && typeof window !== 'undefined'
      ? [`${window.location.protocol}//${NOVU_PLATFORM_HOSTNAME}`]
      : []),
    ...(IS_HOSTNAME_SPLIT_ENABLED && NOVU_CONNECT_HOSTNAME && typeof window !== 'undefined'
      ? [`${window.location.protocol}//${NOVU_CONNECT_HOSTNAME}`]
      : []),
  ];

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
