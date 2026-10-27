import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { SignUpForm } from '@/components/auth/sign-up-form';
import { prepareAuthForm } from '@/lib/auth-page';

export const metadata: Metadata = {
  title: 'Sign up',
};

/**
 * Sign-up for an Agent Inbox account. The claim page and the CLI login send new visitors here with
 * `?redirect_url=`, and get them back once the account exists.
 */
export default async function SignUpPage(props: PageProps<'/sign-up'>) {
  const { redirectPath, initialError } = await prepareAuthForm(await props.searchParams);
  // The claim page sends signed-out visitors here; the screen then says what signing up is for.
  const claiming = redirectPath.startsWith('/claim?');

  return (
    <AuthShell claiming={claiming}>
      <SignUpForm redirectPath={redirectPath} initialError={initialError} claiming={claiming} />
    </AuthShell>
  );
}
