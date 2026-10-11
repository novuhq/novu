import type { Metadata } from 'next';

import { DOCS_URL } from '@/components/dashboard/nav';
import {
  buildFinishSetupPrompt,
  buildSetupCommand,
  buildSetupPrompt,
  maskSetupCommand,
  type SetupContext,
} from '@/lib/agent-setup-prompt';
import { findCurrentUser } from '@/lib/auth-page';
import { type HumanAccount, requireHumanAccount } from '@/lib/human-account';
import { agentDisplayName, getRelayAgent } from '@/lib/human-agent-api';
import { describeAgentStatus } from '@/lib/human-agent-status';
import { readApiKey } from '@/lib/human-api-key';
import { channelsBeforeSetup, loadChannelsOverview } from '@/lib/human-channels-overview';
import { listConnectedTools, readMcpUrl } from '@/lib/human-tools-api';
import { resolveNovuApiUrl } from '@/lib/novu-api';

import { AgentStatusPoll } from './agent-status-poll';
import { AgentView } from './agent-view';

export const metadata: Metadata = {
  title: 'Agent',
};

/** How often the page asks whether `human setup` has made the agent yet. */
const SETUP_POLL_MS = 3000;

/** Slower once the agent is there and only its channels can still change. */
const CHANNELS_POLL_MS = 5000;

/**
 * The dashboard's home: the operator's agent and how people see it. An account starts without an agent,
 * so the page opens on how to make one with `human setup`, and switches by itself once that has run.
 */
export default async function AgentPage() {
  const account = await requireHumanAccount({ returnTo: '/agent' });
  const mcpUrl = readMcpUrl();
  const [agent, secretKey, user, connectedTools] = await Promise.all([
    getRelayAgent(account),
    loadApiKey(account),
    findCurrentUser(),
    mcpUrl ? listConnectedTools(account) : [],
  ]);
  const { rows, telegramSetup, slackSetup } = agent ? await loadChannelsOverview(account) : channelsBeforeSetup();

  const context: SetupContext = { secretKey, apiUrl: resolveNovuApiUrl(account.region) };
  const command = buildSetupCommand(context);
  const missing = rows.filter((row) => !row.connected).map((row) => row.via);
  // With Telegram or Slack connected the setup is done, and there is nothing left to wait for.
  const settingUp = !rows.some((row) => row.via !== 'email' && row.connected);
  const status = describeAgentStatus(agent?.id ?? null, rows);

  return (
    <>
      {settingUp && <AgentStatusPoll status={status} everyMs={agent ? CHANNELS_POLL_MS : SETUP_POLL_MS} />}
      <AgentView
        agent={
          agent && {
            id: agent.id,
            name: agentDisplayName(agent),
            active: agent.active,
            pictureUrl: agent.pictureUrl,
            createdAt: agent.createdAt,
          }
        }
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
