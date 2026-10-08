import { Info } from 'lucide-react';
import type { Metadata } from 'next';

import { ChannelsTable } from '@/components/channels/channels-table';
import { AgentSetupBanner } from '@/components/dashboard/agent-setup-banner';
import { CopyCliCommand } from '@/components/dashboard/copy-cli-command';
import { PageHeader } from '@/components/dashboard/page-header';
import { requireHumanAccount } from '@/lib/human-account';
import { agentDisplayName, getRelayAgent } from '@/lib/human-agent-api';
import { channelsBeforeSetup, loadChannelsOverview } from '@/lib/human-channels-overview';

export const metadata: Metadata = {
  title: 'Channels',
};

/**
 * The agent's channels. Until `human setup` has made the agent there is nothing to connect a channel to,
 * so the rows are switched off and a banner sends the operator to the Agent page.
 */
export default async function ChannelsPage() {
  const account = await requireHumanAccount({ returnTo: '/channels' });
  const agent = await getRelayAgent(account);
  const { rows, telegramSetup, slackSetup } = agent ? await loadChannelsOverview(account) : channelsBeforeSetup();

  return (
    <>
      <PageHeader
        title="Channels"
        description="How your agent shows up on each channel. People reply right where the message lands."
        action={<CopyCliCommand command="npx @novu/human channels" />}
      />
      {!agent && (
        <AgentSetupBanner>
          Channels belong to your agent. Once it&apos;s set up, you connect them here.
        </AgentSetupBanner>
      )}
      <ChannelsTable
        rows={rows}
        telegramSetup={telegramSetup}
        slackSetup={slackSetup}
        agentName={agent ? agentDisplayName(agent) : undefined}
        disabled={!agent}
      />
      <p className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-xs leading-4 text-secondary">
        <Info aria-hidden="true" className="size-3.5 shrink-0" />
        Every channel belongs to your agent: its own address, bot and app. One account, one agent.
      </p>
    </>
  );
}
