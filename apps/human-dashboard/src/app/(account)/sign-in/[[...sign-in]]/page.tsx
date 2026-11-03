import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';

import { AuthFormPending, AuthFrame } from '@/components/auth/auth-card';
import { AuthShell } from '@/components/auth/auth-shell';
import { authStepMetadata, prepareAuthForm } from '@/lib/auth-page';
import { authHref } from '@/lib/auth-redirect';

export async function generateMetadata(props: PageProps<'/sign-in/[[...sign-in]]'>): Promise<Metadata> {
  return authStepMetadata('Sign in', (await props.params)['sign-in']);
}

/**
 * Sign-in to an Agent Inbox account, on Clerk's form in our design (`lib/clerk-appearance`). Its later steps
 * have paths of their own, hence the catch-all. The CLI login and the dashboard send signed-out visitors
 * here with `?redirect_url=`, and get them back once they are in.
 */
export default async function SignInPage(props: PageProps<'/sign-in/[[...sign-in]]'>) {
  const redirectPath = await prepareAuthForm(await props.searchParams);
  const finishPath = authHref('/sign-in/finish', redirectPath);

  return (
    <AuthShell>
      <AuthFrame>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl={authHref('/sign-up', redirectPath)}
          forceRedirectUrl={finishPath}
          signUpForceRedirectUrl={finishPath}
          fallback={<AuthFormPending />}
        />
      </AuthFrame>
    </AuthShell>
  );
}
