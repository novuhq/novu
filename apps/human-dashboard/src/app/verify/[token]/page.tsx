import type { Metadata } from 'next';

import { InviteFrame } from '@/components/invite/invite-frame';
import { VerifyPage } from '@/components/verify/verify-page';
import { resolveNovuApiUrl } from '@/lib/novu-api';

export const metadata: Metadata = {
  title: 'Verify email',
  robots: { index: false, follow: false },
  referrer: 'origin',
};

export default async function Page(props: PageProps<'/verify/[token]'>) {
  const { token } = await props.params;
  const { region } = await props.searchParams;

  return (
    <InviteFrame>
      <VerifyPage apiUrl={resolveNovuApiUrl(region)} token={token} />
    </InviteFrame>
  );
}
