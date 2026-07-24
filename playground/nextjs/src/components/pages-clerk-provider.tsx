'use client';

import { ClerkProvider as _ClerkProvider } from '@clerk/react';
import { useRouter } from 'next/router';
import type { PropsWithChildren } from 'react';

const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

export function PagesClerkProvider({ children }: PropsWithChildren) {
  const router = useRouter();

  if (!CLERK_PUBLISHABLE_KEY) {
    return <>{children}</>;
  }

  return (
    <_ClerkProvider
      routerPush={(to) => void router.push(to)}
      routerReplace={(to) => void router.replace(to)}
      publishableKey={CLERK_PUBLISHABLE_KEY}
      allowedRedirectOrigins={['http://localhost:*', typeof window !== 'undefined' ? window.location.origin : '']}
    >
      {children}
    </_ClerkProvider>
  );
}
