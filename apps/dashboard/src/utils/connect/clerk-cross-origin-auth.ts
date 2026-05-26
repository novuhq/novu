import { isConnectHostnameUrl } from '@/utils/product-auth-urls';

type ClerkCrossOriginAuth = {
  loaded: boolean;
  redirectWithAuth: (to: string) => Promise<unknown>;
  buildSignInUrl: (opts?: { signInForceRedirectUrl?: string | null }) => string;
  buildSignUpUrl: (opts?: { signUpForceRedirectUrl?: string | null }) => string;
};

/** Primary → Connect handoff: Clerk syncs the session to the satellite domain. */
export async function navigateToConnectWithClerkSession(
  clerk: ClerkCrossOriginAuth,
  destination: string
): Promise<void> {
  await clerk.redirectWithAuth(destination);
}

/** Cross-product navigation — Connect targets must go through Clerk session sync. */
export async function navigateWithClerkSessionIfCrossOrigin(
  clerk: ClerkCrossOriginAuth,
  destination: string
): Promise<void> {
  if (isConnectHostnameUrl(destination)) {
    await navigateToConnectWithClerkSession(clerk, destination);

    return;
  }

  window.location.assign(destination);
}

/** Connect satellite → primary sign-in with optional post-auth return to Connect. */
export function redirectSatelliteToPrimarySignIn(clerk: ClerkCrossOriginAuth, returnUrl: string | null): void {
  const primarySignInUrl = clerk.buildSignInUrl(
    returnUrl ? { signInForceRedirectUrl: returnUrl } : undefined
  );

  window.location.replace(primarySignInUrl);
}

/** Connect satellite → primary sign-up with optional post-auth return to Connect. */
export function redirectSatelliteToPrimarySignUp(clerk: ClerkCrossOriginAuth, returnUrl: string | null): void {
  const primarySignUpUrl = clerk.buildSignUpUrl(
    returnUrl ? { signUpForceRedirectUrl: returnUrl } : undefined
  );

  window.location.replace(primarySignUpUrl);
}
