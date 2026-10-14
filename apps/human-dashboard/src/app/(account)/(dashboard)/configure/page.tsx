import type { Metadata } from 'next';

import { ChannelsTable } from '@/components/channels/channels-table';
import { CONFIGURE_PATH, DOCS_URL } from '@/components/dashboard/nav';
import { ResumeSetupCard, SetupDoneBanner } from '@/components/dashboard/setup-banners';
import {
  buildFinishSetupPrompt,
  buildSetupCommand,
  buildSetupPrompt,
  maskSetupCommand,
  type SetupContext,
} from '@/lib/agent-setup-prompt';
import { findCurrentUser } from '@/lib/auth-page';
import { type HumanAccount, requireHumanAccount } from '@/lib/human-account';
import { agentDisplayName } from '@/lib/human-agent-api';
import { describeAgentStatus } from '@/lib/human-agent-status';
import { readApiKey } from '@/lib/human-api-key';
import { loadChannelsOverview } from '@/lib/human-channels-overview';
import { isSetupUnfinished, loadSetupSummary, requireSetUpAgent } from '@/lib/human-onboarding';
import { listConnectedTools, readMcpUrl } from '@/lib/human-tools-api';
import { resolveNovuApiUrl } from '@/lib/novu-api';

import { AgentStatusPoll } from './agent-status-poll';
import { AgentView } from './agent-view';

export const metadata: Metadata = {
  title: 'Configure',
};

/** How often the page asks whether a channel got connected in the operator's terminal. */
const CHANNELS_POLL_MS = 5000;

/**
 * The operator's agent and how people see it. The agent is made in the onboarding, which is where an
 * operator without one is sent; what the onboarding leaves behind shows across the top here.
 *
 * Agent and Channels were two pages; until the Configure page of the new design lands (NV-9034), the
 * channels table sits under the agent so nothing it does is lost.
 */
export default async function AgentPage() {
  const account = await requireHumanAccount({ returnTo: CONFIGURE_PATH });
  const progress = await requireSetUpAgent(account);
  const { agent } = progress;
  const mcpUrl = readMcpUrl();
  const [setup, secretKey, user, connectedTools, { rows, telegramSetup, slackSetup }] = await Promise.all([
    loadSetupSummary(account, progress),
    loadApiKey(account),
    findCurrentUser(),
    mcpUrl ? listConnectedTools(account) : [],
    loadChannelsOverview(account),
  ]);

  const context: SetupContext = { secretKey, apiUrl: resolveNovuApiUrl(account.region) };
  const command = buildSetupCommand(context);
  const missing = rows.filter((row) => !row.connected).map((row) => row.via);
  // With Telegram or Slack connected the setup is done, and there is nothing left to wait for.
  const settingUp = !rows.some((row) => row.via !== 'email' && row.connected);
  const status = describeAgentStatus(agent.id, rows);

  return (
    <>
      {settingUp && <AgentStatusPoll status={status} everyMs={CHANNELS_POLL_MS} />}
      {isSetupUnfinished(setup.step) ? (
        <ResumeSetupCard handle={setup.agent.handle} step={setup.step} waiting={setup.waiting} />
      ) : (
        setup.wentThroughSteps && !setup.doneBannerDismissed && <SetupDoneBanner handle={setup.agent.handle} />
      )}
      <AgentView
        agent={{
          id: agent.id,
          name: agentDisplayName(agent),
          active: agent.active,
          pictureUrl: agent.pictureUrl,
          createdAt: agent.createdAt,
        }}
        channels={rows}
        telegramSetup={telegramSetup}
        slackSetup={slackSetup}
        setup={{
          command,
          commandDisplay: maskSetupCommand(command, secretKey),
          prompt: buildSetupPrompt(context, {
            name: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || undefined,
            email: user?.primaryEmailAddress?.emailAddress,
          }),
          finishPrompt: buildFinishSetupPrompt(context, missing),
        }}
        docsUrl={DOCS_URL}
        mcpUrl={mcpUrl}
        connectedTools={connectedTools}
      />
      <ChannelsTable
        rows={rows}
        telegramSetup={telegramSetup}
        slackSetup={slackSetup}
        agentName={agentDisplayName(agent)}
      />
    </>
  );
}

/** Without the key the page still explains the setup; the command then logs in from the terminal instead. */
async function loadApiKey(account: HumanAccount): Promise<string | null> {
  try {
    return await readApiKey(account);
  } catch (error) {
    console.error('Failed to load the API key for the Agent page', error);

    return null;
  }
}
