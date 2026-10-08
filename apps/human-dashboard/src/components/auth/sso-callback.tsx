'use client';

import { useClerk, useSignIn, useSignUp } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { type AuthPage, authHref, SSO_ERROR_PARAM } from '@/lib/auth-redirect';

import { AuthCard, useEnterApp } from './auth-form';

type SsoCallbackProps = {
  /** The form the visitor left for GitHub or Google from, which is where a failure goes back to. */
  page: AuthPage;
  /** Where to go once signed in. */
  redirectPath: string;
};

/** How the return ended: in the app, on a form to carry on there, or with nothing to finish. */
type Outcome = 'app' | AuthPage | 'failed';

/**
 * Where GitHub and Google send the visitor back to. Finishes what the form started: opens the app if
 * Clerk has a session ready, or carries a sign-in over to a sign-up (and the other way round) when the
 * account turned out to exist or not.
 *
 * The steps are those of Clerk's `HandleSSOCallback`, which `@clerk/nextjs` 7.9.9 doesn't export.
 */
export function SsoCallback({ page, redirectPath }: SsoCallbackProps) {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const router = useRouter();
  const enterApp = useEnterApp(redirectPath);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!clerk.loaded || hasRun.current) {
      return;
    }
    hasRun.current = true;

    // The status changes under the same object as each request comes back, which TypeScript can't follow.
    const signInIsComplete = () => signIn.status === 'complete';
    const signUpIsComplete = () => signUp.status === 'complete';

    /** Signed up with an account that already exists: sign in to it instead. */
    async function transferToSignIn(): Promise<Outcome> {
      await signIn.create({ transfer: true });
      if (!signInIsComplete()) {
        return '/sign-in';
      }
      await signIn.finalize({ navigate: enterApp });

      return 'app';
    }

    /** Signed in with an account that doesn't exist yet: create it. */
    async function transferToSignUp(): Promise<Outcome> {
      await signUp.create({ transfer: true });
      if (!signUpIsComplete()) {
        return '/sign-up';
      }
      await signUp.finalize({ navigate: enterApp });

      return 'app';
    }

    async function finish(): Promise<Outcome> {
      if (signInIsComplete()) {
        await signIn.finalize({ navigate: enterApp });

        return 'app';
      }
      if (signUp.isTransferable) {
        return transferToSignIn();
      }
      if (signIn.isTransferable) {
        return transferToSignUp();
      }
      if (signUpIsComplete()) {
        await signUp.finalize({ navigate: enterApp });

        return 'app';
      }

      const sessionId = signIn.existingSession?.sessionId ?? signUp.existingSession?.sessionId;
      if (sessionId) {
        await clerk.setActive({ session: sessionId, navigate: enterApp });

        return 'app';
      }

      // Nothing to finish: the visitor cancelled at the provider, or the provider refused.
      return 'failed';
    }

    void finish()
      .catch((): Outcome => 'failed')
      .then((outcome) => {
        if (outcome === 'app') {
          return;
        }

        const href = authHref(outcome === 'failed' ? page : outcome, redirectPath);
        const failedParam = `${href.includes('?') ? '&' : '?'}${SSO_ERROR_PARAM}=1`;
        router.replace(outcome === 'failed' ? `${href}${failedParam}` : href);
      });
  }, [clerk, clerk.loaded, signIn, signUp, router, enterApp, page, redirectPath]);

  return (
    <AuthCard step="sso-callback" title="Signing you in" description="One moment while we finish with your provider.">
      <output className="font-mono text-[13px] leading-4.5 text-secondary">
        Loading
        <span aria-hidden="true" className="ml-0.5 animate-terminal-cursor text-accent">
          ▍
        </span>
      </output>
      {/* Clerk puts its bot check here when a new account needs one. */}
      {/* biome-ignore lint/correctness/useUniqueElementIds: Clerk looks the element up by this id */}
      <div id="clerk-captcha" className="empty:hidden" />
    </AuthCard>
  );
}
