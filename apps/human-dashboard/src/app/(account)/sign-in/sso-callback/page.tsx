import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { SsoCallback } from '@/components/auth/sso-callback';
import { getRedirectPath } from '@/lib/auth-page';

export const metadata: Metadata = {
  title: 'Signing in',
  robots: { index: false, follow: false },
};

/** Where GitHub and Google come back to after "Continue with …" on the sign-in page. */
export default async function SignInSsoCallbackPage(props: PageProps<'/sign-in/sso-callback'>) {
  const redirectPath = await getRedirectPath(await props.searchParams);

  return (
    <AuthShell>
      <SsoCallback page="/sign-in" redirectPath={redirectPath} />
    </AuthShell>
  );
}
