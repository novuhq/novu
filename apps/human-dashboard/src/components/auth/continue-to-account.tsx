'use client';

import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { homePathAction } from '@/app/(account)/sign-in/finish/actions';
import { DASHBOARD_HOME } from '@/components/dashboard/nav';

import { AuthCard, AuthLoading } from './auth-card';

/**
 * Opens the page someone signed in for, and says so until it is there: the router keeps this on screen while
 * that page loads. See `/sign-in/finish`.
 *
 * It waits for Clerk. Coming back from GitHub or Google lands here as a new page load, and the session cookie
 * is only written once Clerk has loaded: going on before that, the next page sees nobody signed in and sends
 * the visitor back to sign-in.
 */
export function ContinueToAccount({ redirectPath }: { redirectPath: string }) {
  const clerk = useClerk();
  const router = useRouter();

  useEffect(() => {
    if (!clerk.loaded) {
      return;
    }

    if (redirectPath === DASHBOARD_HOME) {
      void homePathAction()
        .catch(() => DASHBOARD_HOME)
        .then((path) => router.replace(path));
    } else {
      router.replace(redirectPath);
    }
  }, [clerk, clerk.loaded, router, redirectPath]);

  return (
    <AuthCard title="Signing you in" description="One moment while we get your account ready.">
      <AuthLoading />
    </AuthCard>
  );
}
