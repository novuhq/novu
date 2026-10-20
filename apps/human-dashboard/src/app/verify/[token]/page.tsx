import type { Metadata } from 'next';

import { InviteFrame } from '@/components/invite/invite-frame';
import { VerifyPage } from '@/components/verify/verify-page';
import { API_PROXY_PATH } from '@/lib/novu-api';

export const metadata: Metadata = {
  title: 'Verify email',
  robots: { index: false, follow: false },
  referrer: 'origin',
};

export default async function Page(props: PageProps<'/verify/[token]'>) {
  const { token } = await props.params;

  return (
    <InviteFrame>
      <VerifyPage apiUrl={API_PROXY_PATH} token={token} />
    </InviteFrame>
  );
}
