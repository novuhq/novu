import type { Metadata } from 'next';

import { CONFIGURE_DRAWER_PARAM, CONFIGURE_PATH, configureChannelPath, DOCS_URL } from '@/components/dashboard/nav';
import { ResumeSetupCard, SetupDoneBanner } from '@/components/dashboard/setup-banners';
import { buildChannelPrompt, type PromptContext } from '@/lib/agent-setup-prompt';
import { requireHumanAccount } from '@/lib/human-account';
import { agentDisplayName } from '@/lib/human-agent-api';
import { describeAgentStatus } from '@/lib/human-agent-status';
import type { ChannelVia } from '@/lib/human-channels-api';
import { loadChannelsOverview } from '@/lib/human-channels-overview';
import { loadHostStatus } from '@/lib/human-hosts-api';
import { isSetupUnfinished, loadSetupSummary, requireSetUpAgent } from '@/lib/human-onboarding';
import { listConnectedTools, readMcpUrl } from '@/lib/human-tools-api';
import { readApiUrl } from '@/lib/site-origin';

import { AgentStatusPoll } from './agent-status-poll';
import { ConfigureView } from './configure-view';

export const metadata: Metadata = {
  title: 'Configure',
};

/** How often the page asks whether a channel got connected in the operator's terminal. */
const CHANNELS_POLL_MS = 5000;

/**
 * The operator's agent: its card, its channels and the agent behind it. The agent is made in the
 * onboarding, which is where an operator without one is sent; what the onboarding leaves behind shows
 * across the top here.
 *
 * Whether a host reads the agent's mail comes from the API's record of its hosts: when one last checked the
 * inbox. The card and the Agent setup row go by it; the onboarding's banners and the sidebar's dot still go
 * by the onboarding's own record (NV-9050).
 *
 * `?setup=telegram` (`configureChannelPath`) opens with that channel's drawer, for links such as the
 * Inbox checklist's "Add Telegram".
 */
export default async function ConfigurePage(props: PageProps<'/configure'>) {
  const openDrawer = readDrawerParam((await props.searchParams)[CONFIGURE_DRAWER_PARAM]);
  const account = await requireHumanAccount({
    returnTo: openDrawer ? configureChannelPath(openDrawer) : CONFIGURE_PATH,
  });
  const progress = await requireSetUpAgent(account);
  const { agent } = progress;
  const mcpUrl = readMcpUrl();
  const [setup, connectedTools, { rows, telegramSetup, slackSetup }, hostStatus] = await Promise.all([
    loadSetupSummary(account, progress),
    mcpUrl ? listConnectedTools(account) : [],
    loadChannelsOverview(account),
    loadHostStatus(account),
  ]);

  const context: PromptContext = { apiUrl: await readApiUrl() };
  const { handle } = setup.agent;
  // With Telegram or Slack connected the setup is done, and there is nothing left to wait for.
  const settingUp = !rows.some((row) => row.via !== 'email' && row.connected);
  const status = describeAgentStatus(agent.id, rows);

  return (
    <>
      {settingUp && <AgentStatusPoll status={status} everyMs={CHANNELS_POLL_MS} />}
      {isSetupUnfinished(setup.step) ? (
        <ResumeSetupCard handle={handle} step={setup.step} waiting={setup.waiting} />
      ) : (
        setup.wentThroughSteps && !setup.doneBannerDismissed && <SetupDoneBanner handle={handle} />
      )}
      <ConfigureView
        initialDrawer={openDrawer}
        agent={{ ...setup.agent, active: agent.active }}
        operatorName={agent.operatorName}
        channels={rows}
        telegramSetup={telegramSetup}
        slackSetup={slackSetup}
        slackAppName={agentDisplayName(agent)}
        channelPrompts={{
          telegram: buildChannelPrompt(context, 'telegram', handle),
          slack: buildChannelPrompt(context, 'slack', handle),
        }}
        hostStatus={hostStatus}
        renderedAt={new Date().toISOString()}
        apiUrl={context.apiUrl}
        docsUrl={DOCS_URL}
        mcpUrl={mcpUrl}
        connectedTools={connectedTools}
        settings={agent.settings}
      />
    </>
  );
}

/** The channel whose drawer a link asked for, when it names one this page has a drawer for. */
function readDrawerParam(value: string | string[] | undefined): ChannelVia | null {
  return value === 'email' || value === 'telegram' || value === 'slack' ? value : null;
}
