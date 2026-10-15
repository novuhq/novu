import type { Metadata } from 'next';

import { CONFIGURE_DRAWER_PARAM, CONFIGURE_PATH, configureChannelPath, DOCS_URL } from '@/components/dashboard/nav';
import { ResumeSetupCard, SetupDoneBanner } from '@/components/dashboard/setup-banners';
import {
  buildChannelPrompt,
  buildSetupCommand,
  buildSetupPrompt,
  maskSetupCommand,
  type SetupContext,
} from '@/lib/agent-setup-prompt';
import { type HumanAccount, requireHumanAccount } from '@/lib/human-account';
import { agentDisplayName } from '@/lib/human-agent-api';
import { describeAgentStatus } from '@/lib/human-agent-status';
import { readApiKey } from '@/lib/human-api-key';
import type { ChannelVia } from '@/lib/human-channels-api';
import { loadChannelsOverview } from '@/lib/human-channels-overview';
import { isSetupUnfinished, loadSetupSummary, requireSetUpAgent } from '@/lib/human-onboarding';
import { listConnectedTools, readMcpUrl } from '@/lib/human-tools-api';
import { resolveNovuApiUrl } from '@/lib/novu-api';

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
 * Whether a host reads the agent's mail comes from the onboarding's record of it, the same one its banners
 * and the sidebar's dot go by: an approved CLI login, a connector that signed in, an agent that came from a
 * terminal, and until NV-9037 the onboarding's stand-in after its prompt is copied. The API has no word
 * for it yet.
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
  const { agent, user } = progress;
  const mcpUrl = readMcpUrl();
  const [setup, secretKey, connectedTools, { rows, telegramSetup, slackSetup }] = await Promise.all([
    loadSetupSummary(account, progress),
    loadApiKey(account),
    mcpUrl ? listConnectedTools(account) : [],
    loadChannelsOverview(account),
  ]);

  const context: SetupContext = { secretKey, apiUrl: resolveNovuApiUrl(account.region) };
  const command = buildSetupCommand(context);
  const operatorName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
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
        agent={{ ...setup.agent, active: agent.active, hostConnected: !isSetupUnfinished(setup.step) }}
        operatorName={operatorName}
        channels={rows}
        telegramSetup={telegramSetup}
        slackSetup={slackSetup}
        slackAppName={agentDisplayName(agent)}
        channelPrompts={{
          telegram: buildChannelPrompt(context, 'telegram', handle),
          slack: buildChannelPrompt(context, 'slack', handle),
        }}
        setup={{
          prompt: buildSetupPrompt(context, {
            name: operatorName || undefined,
            email: user?.primaryEmailAddress?.emailAddress,
          }),
          command,
          commandDisplay: maskSetupCommand(command, secretKey),
        }}
        docsUrl={DOCS_URL}
        mcpUrl={mcpUrl}
        connectedTools={connectedTools}
      />
    </>
  );
}

/** The channel whose drawer a link asked for, when it names one this page has a drawer for. */
function readDrawerParam(value: string | string[] | undefined): ChannelVia | null {
  return value === 'email' || value === 'telegram' || value === 'slack' ? value : null;
}

/** Without the key the page still explains the setup; the command then logs in from the terminal instead. */
async function loadApiKey(account: HumanAccount): Promise<string | null> {
  try {
    return await readApiKey(account);
  } catch (error) {
    console.error('Failed to load the API key for the Configure page', error);

    return null;
  }
}
