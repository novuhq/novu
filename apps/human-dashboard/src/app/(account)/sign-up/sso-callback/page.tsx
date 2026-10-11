import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { SsoCallback } from '@/components/auth/sso-callback';
import { getRedirectPath } from '@/lib/auth-page';

export const metadata: Metadata = {
  title: 'Signing up',
  robots: { index: false, follow: false },
};

/** Where GitHub and Google come back to after "Continue with …" on the sign-up page. */
export default async function SignUpSsoCallbackPage(props: PageProps<'/sign-up/sso-callback'>) {
  const redirectPath = await getRedirectPath(await props.searchParams);

  return (
    <AuthShell>
      <SsoCallback page="/sign-up" redirectPath={redirectPath} />
    </AuthShell>
  );
}
