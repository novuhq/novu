import { SignUp } from '@clerk/nextjs';
import type { Metadata } from 'next';

import { AuthFormPending, AuthFrame } from '@/components/auth/auth-card';
import { AuthShell } from '@/components/auth/auth-shell';
import { ClaimSignUp } from '@/components/auth/claim-sign-up';
import { authStepMetadata, prepareAuthForm } from '@/lib/auth-page';
import { authHref } from '@/lib/auth-redirect';

export async function generateMetadata(props: PageProps<'/sign-up/[[...sign-up]]'>): Promise<Metadata> {
  return authStepMetadata('Sign up', (await props.params)['sign-up']);
}

/**
 * Sign-up for an Agent Inbox account, on Clerk's form in our design (`lib/clerk-appearance`). Its later steps
 * have paths of their own, hence the catch-all. The claim page and the CLI login send new visitors here with
 * `?redirect_url=`, and get them back once the account exists. Clerk asks for whatever its app is set to
 * require, including consent to the legal documents, and tells `/api/webhooks/clerk` once the user exists.
 */
export default async function SignUpPage(props: PageProps<'/sign-up/[[...sign-up]]'>) {
  const redirectPath = await prepareAuthForm(await props.searchParams);
  const finishPath = authHref('/sign-in/finish', redirectPath);
  // The claim page sends signed-out visitors here; the screen then says what signing up is for.
  const claiming = redirectPath.startsWith('/claim?');
  const form = {
    routing: 'path',
    path: '/sign-up',
    signInUrl: authHref('/sign-in', redirectPath),
    forceRedirectUrl: finishPath,
    signInForceRedirectUrl: finishPath,
    fallback: <AuthFormPending />,
  } as const;

  return (
    <AuthShell claiming={claiming}>
      <AuthFrame>{claiming ? <ClaimSignUp {...form} /> : <SignUp {...form} />}</AuthFrame>
    </AuthShell>
  );
}
