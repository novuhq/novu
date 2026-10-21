import type { Metadata } from 'next';

import { ConnectPage } from '@/components/connect/connect-page';
import { InviteFrame } from '@/components/invite/invite-frame';
import { API_PROXY_PATH } from '@/lib/novu-api';
import { setupChannelOf } from '@/lib/setup-link';

export const metadata: Metadata = {
  title: 'Connect',
  robots: { index: false, follow: false },
  // The setup token is in the URL fragment; keep the rest of the link out of the Referer.
  referrer: 'origin',
};

/**
 * Opened from `channel add telegram` or `channel add slack` when the operator finishes in the
 * browser. The token stays in the fragment, so this server component never sees it.
 */
export default async function Page(props: PageProps<'/connect'>) {
  const { channel } = await props.searchParams;

  return (
    <InviteFrame>
      <ConnectPage apiUrl={API_PROXY_PATH} channel={setupChannelOf(channel)} />
    </InviteFrame>
  );
}
