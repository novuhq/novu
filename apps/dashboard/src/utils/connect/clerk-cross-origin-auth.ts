import { isConnectHostnameUrl } from '@/utils/product-auth-urls';

// Clerk + Netlify: CDN can cache handshake redirects and cause infinite auth loops.
const CLERK_NETLIFY_CACHE_BUST_PARAM = '__clerk_netlify_cache_bust';

function isLocalDevRuntime(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname;

  return hostname === 'localhost' || hostname.endsWith('.localhost');
}

type ClerkCrossOriginAuth = {
  loaded: boolean;
  redirectWithAuth: (to: string) => Promise<unknown>;
  buildUrlWithAuth: (to: string) => string;
  buildSignInUrl: (opts?: { signInForceRedirectUrl?: string | null }) => string;
  buildSignUpUrl: (opts?: { signUpForceRedirectUrl?: string | null }) => string;
};

function withNetlifyHandshakeCacheBust(url: string): string {
  if (isLocalDevRuntime()) {
    return url;
  }

  try {
    const parsed = new URL(url);

    if (parsed.searchParams.has('__clerk_handshake')) {
      return url;
    }

    if (!parsed.searchParams.has(CLERK_NETLIFY_CACHE_BUST_PARAM)) {
      parsed.searchParams.set(CLERK_NETLIFY_CACHE_BUST_PARAM, Date.now().toString());
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

function navigateWithDecoratedAuthUrl(clerk: ClerkCrossOriginAuth, destination: string): void {
  const authedUrl = withNetlifyHandshakeCacheBust(clerk.buildUrlWithAuth(destination));

  window.location.assign(authedUrl);
}

/** Primary → Connect handoff: decorates the URL so Clerk propagates the session to the satellite. */
export function navigateToConnectWithClerkSession(clerk: ClerkCrossOriginAuth, destination: string): void {
  navigateWithDecoratedAuthUrl(clerk, destination);
}

/** Cross-product navigation — Connect targets must go through Clerk session sync. */
export function navigateWithClerkSessionIfCrossOrigin(clerk: ClerkCrossOriginAuth, destination: string): void {
  if (isConnectHostnameUrl(destination)) {
    navigateToConnectWithClerkSession(clerk, destination);

    return;
  }

  window.location.assign(destination);
}

/** Connect satellite → primary sign-in with optional post-auth return to Connect. */
export function redirectSatelliteToPrimarySignIn(clerk: ClerkCrossOriginAuth, returnUrl: string | null): void {
  const primarySignInUrl = clerk.buildSignInUrl(
    returnUrl ? { signInForceRedirectUrl: returnUrl } : undefined
  );

  window.location.replace(withNetlifyHandshakeCacheBust(primarySignInUrl));
}

/** Connect satellite → primary sign-up with optional post-auth return to Connect. */
export function redirectSatelliteToPrimarySignUp(clerk: ClerkCrossOriginAuth, returnUrl: string | null): void {
  const primarySignUpUrl = clerk.buildSignUpUrl(
    returnUrl ? { signUpForceRedirectUrl: returnUrl } : undefined
  );

  window.location.replace(withNetlifyHandshakeCacheBust(primarySignUpUrl));
}
