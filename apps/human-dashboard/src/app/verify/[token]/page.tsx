import type { Metadata } from 'next';

import { InviteFrame } from '@/components/invite/invite-frame';
import { UnsupportedVerification, VerifyPage } from '@/components/verify/verify-page';
import { API_PROXY_PATH } from '@/lib/novu-api';

export const metadata: Metadata = {
  title: 'Verify email',
  robots: { index: false, follow: false },
  referrer: 'origin',
};

export default async function Page(props: PageProps<'/verify/[token]'>) {
  const { token } = await props.params;
  const { region } = await props.searchParams;

  // Agent Inbox's API only reaches the US region, so a link the EU API issued is never sent to it.
  return (
    <InviteFrame>
      {region === 'eu' ? <UnsupportedVerification /> : <VerifyPage apiUrl={API_PROXY_PATH} token={token} />}
    </InviteFrame>
  );
}
