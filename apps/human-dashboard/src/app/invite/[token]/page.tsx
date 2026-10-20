import type { Metadata } from 'next';

import { InviteFrame } from '@/components/invite/invite-frame';
import { InvitePage, UnsupportedInvite } from '@/components/invite/invite-page';
import { API_PROXY_PATH } from '@/lib/novu-api';

export const metadata: Metadata = {
  title: 'Invitation',
  robots: { index: false, follow: false },
  // The invite token is in the URL; keep it out of the Referer sent to Telegram and Slack.
  referrer: 'origin',
};

export default async function Page(props: PageProps<'/invite/[token]'>) {
  const { token } = await props.params;
  const { region } = await props.searchParams;

  // Agent Inbox's API only reaches the US region, so a link the EU API issued is never sent to it.
  return (
    <InviteFrame>
      {region === 'eu' ? <UnsupportedInvite /> : <InvitePage apiUrl={API_PROXY_PATH} token={token} />}
    </InviteFrame>
  );
}
