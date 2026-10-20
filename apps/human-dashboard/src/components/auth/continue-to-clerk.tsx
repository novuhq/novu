'use client';

import { useClerk } from '@clerk/nextjs';
import { useEffect } from 'react';

import { AuthCard, AuthLoading } from './auth-form';

/**
 * Back to Clerk's authorize page, where the AI tool that sent the operator to sign in finishes connecting.
 * It goes from the browser: a development Clerk only knows the session with its token on the address,
 * which `buildUrlWithAuth` adds and only the browser holds.
 */
export function ContinueToClerk({ authorizeUrl }: { authorizeUrl: string }) {
  const clerk = useClerk();

  useEffect(() => {
    if (clerk.loaded) {
      window.location.replace(clerk.buildUrlWithAuth(authorizeUrl));
    }
  }, [clerk, clerk.loaded, authorizeUrl]);

  return (
    <AuthCard step="continue-to-clerk" title="Signing you in" description="One moment while we connect your AI tool.">
      <AuthLoading />
    </AuthCard>
  );
}
