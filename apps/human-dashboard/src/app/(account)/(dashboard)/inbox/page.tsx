import type { Metadata } from 'next';

import { AgentSetupBanner } from '@/components/dashboard/agent-setup-banner';
import { PageHeader } from '@/components/dashboard/page-header';
import { requireHumanAccount } from '@/lib/human-account';
import { getRelayAgent } from '@/lib/human-agent-api';

export const metadata: Metadata = {
  title: 'Inbox',
};

/**
 * The dashboard's home. The threads and the thread drawer come with NV-9036; until then the page says
 * where the agent's messages are, so the new navigation has somewhere to land.
 */
export default async function InboxPage() {
  const account = await requireHumanAccount({ returnTo: '/inbox' });
  const agent = await getRelayAgent(account);

  return (
    <>
      <PageHeader title="Inbox" description="Every message your agent gets, on every channel." />
      {agent ? (
        <p className="rounded-lg border border-border px-5 py-4.5 text-[13px] leading-4.5 text-secondary">
          The threads will show up here soon. For now your agent reads them from its terminal.
        </p>
      ) : (
        <AgentSetupBanner>
          The inbox belongs to your agent. Once it&apos;s set up, its threads land here.
        </AgentSetupBanner>
      )}
    </>
  );
}
