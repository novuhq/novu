'use client';

import { ClerkProvider as _ClerkProvider } from '@clerk/react';
import { useRouter } from 'next/navigation';
import type { PropsWithChildren } from 'react';

const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

export function ClerkProvider({ children }: PropsWithChildren) {
  const router = useRouter();

  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui', lineHeight: 1.5 }}>
        <h1 style={{ fontSize: '1rem', fontWeight: 600 }}>Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</h1>
        <p style={{ fontSize: '0.85rem', color: '#555' }}>
          Set <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> in <code>playground/nextjs/.env</code> (use the same value
          as <code>VITE_CLERK_PUBLISHABLE_KEY</code> in <code>apps/dashboard/.env</code>), then restart{' '}
          <code>pnpm dev</code> in the playground.
        </p>
      </div>
    );
  }

  return (
    <_ClerkProvider
      routerPush={(to) => router.push(to)}
      routerReplace={(to) => router.replace(to)}
      publishableKey={CLERK_PUBLISHABLE_KEY}
      allowedRedirectOrigins={['http://localhost:*', typeof window !== 'undefined' ? window.location.origin : '']}
    >
      {children}
    </_ClerkProvider>
  );
}
