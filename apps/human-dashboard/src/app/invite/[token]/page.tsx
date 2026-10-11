import type { Metadata } from 'next';

import { InviteFrame } from '@/components/invite/invite-frame';
import { InvitePage } from '@/components/invite/invite-page';
import { resolveNovuApiUrl } from '@/lib/novu-api';

export const metadata: Metadata = {
  title: 'Invitation',
  robots: { index: false, follow: false },
  // The invite token is in the URL; keep it out of the Referer sent to Telegram and Slack.
  referrer: 'origin',
};

export default async function Page(props: PageProps<'/invite/[token]'>) {
  const { token } = await props.params;
  const { region } = await props.searchParams;

  return (
    <InviteFrame>
      <InvitePage apiUrl={resolveNovuApiUrl(region)} token={token} />
    </InviteFrame>
  );
}
