import { ClerkProvider } from '@clerk/nextjs';
import type { ReactNode } from 'react';

import { DASHBOARD_HOME } from '@/components/dashboard/nav';
import { humanClerkAppearance } from '@/lib/clerk-appearance';

/**
 * Human accounts (the Human Clerk app) only exist on these pages: sign-in, sign-up, the claim page,
 * the account page and the dashboard. The rest of the site, including invite links, works without the Clerk keys.
 */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl={DASHBOARD_HOME}
      signUpFallbackRedirectUrl={DASHBOARD_HOME}
      afterSignOutUrl="/"
      appearance={humanClerkAppearance}
    >
      {children}
    </ClerkProvider>
  );
}
