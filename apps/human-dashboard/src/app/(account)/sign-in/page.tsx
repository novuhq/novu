import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { SignInForm } from '@/components/auth/sign-in-form';
import { prepareAuthForm } from '@/lib/auth-page';

export const metadata: Metadata = {
  title: 'Sign in',
};

/**
 * Sign-in to a Human account. The CLI login and the dashboard send signed-out visitors here with
 * `?redirect_url=`, and get them back once they are in.
 */
export default async function SignInPage(props: PageProps<'/sign-in'>) {
  const { redirectPath, initialError } = await prepareAuthForm(await props.searchParams);

  return (
    <AuthShell>
      <SignInForm redirectPath={redirectPath} initialError={initialError} />
    </AuthShell>
  );
}
