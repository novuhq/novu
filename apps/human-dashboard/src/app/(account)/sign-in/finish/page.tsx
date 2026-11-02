import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { ContinueToAccount } from '@/components/auth/continue-to-account';
import { getRedirectPath } from '@/lib/auth-page';

export const metadata: Metadata = {
  title: 'Signing in',
  robots: { index: false, follow: false },
};

/**
 * Where Clerk's forms go once the session exists. The page someone came for can take seconds to answer,
 * because a new account is set up on the first page that asks for it (`requireHumanAccount`), and by then
 * Clerk's form has nothing left to draw. This stays on screen until that page is ready. It does no work of its
 * own, so it opens right away, and it sits under `/sign-in` for the session check of `proxy.ts`.
 */
export default async function SignInFinishPage(props: PageProps<'/sign-in/finish'>) {
  const redirectPath = await getRedirectPath(await props.searchParams);

  return (
    <AuthShell claiming={redirectPath.startsWith('/claim?')}>
      <ContinueToAccount redirectPath={redirectPath} />
    </AuthShell>
  );
}
