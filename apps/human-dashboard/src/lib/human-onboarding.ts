import 'server-only';

import type { User } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { AgentReach } from './agent-settings';
import { buildChannelPrompt } from './agent-setup-prompt';
import type { ToolId } from './ai-tools';
import { findCurrentUser } from './auth-page';
import type { HostStatus } from './host-status';
import type { HostId } from './hosts';
import type { HumanAccount } from './human-account';
import { agentDisplayName, DEFAULT_AGENT_NAME, getRelayAgent, type RelayAgent } from './human-agent-api';
import { requestForAccount } from './human-api-key';
import { listChannels } from './human-channels-api';
import { loadChannelsOverview } from './human-channels-overview';
import { loadHostStatus } from './human-hosts-api';
import { getInboxThread, listInboxThreads } from './human-inbox-api';
import type { SlackSetupState } from './human-slack-setup';
import type { TelegramSetupState } from './human-telegram-setup';
import { listConnectedTools, readMcpUrl } from './human-tools-api';
import {
  activityIsAfter,
  humanMessageAfter,
  type InboundEmail,
  inboundEmailFrom,
  latestHumanMessageAt,
  newestInboundEmail,
  preferNewerInbound,
} from './inbound-email';
import type { InboxThread } from './inbox';
import {
  AGENT_DOMAIN,
  cardLinkOf,
  ONBOARDING_PATH,
  type OnboardingStep,
  onboardingConnectPath,
  toHandle,
} from './onboarding';
import {
  awaitsTestMail,
  isSetupUnfinished,
  rememberTestReply,
  resolveStep,
  type SetupStep,
  wasMadeInTheSteps,
} from './onboarding-progress';
import { type OnboardingState, readOnboardingState, writeOnboardingState } from './onboarding-state';
import { readApiUrl, readSiteOrigin } from './site-origin';

export { isSetupUnfinished, resolveStep, type SetupStep, wasMadeInTheSteps };

export type SetupProgress = {
  step: SetupStep;
  state: OnboardingState;
  agent: RelayAgent | null;
  hostStatus: HostStatus | null;
  /** Missing only when the session outlived its user; the pages have sent that visitor to sign in by then. */
  user: User | null;
  /**
   * Who the test step's inbound email was from, and what it was about, from this request's inbox read.
   * Absent once that step is over. Not written to the operator's account.
   */
  testMail: { from: string; subject: string } | null;
};

/**
 * The operator's progress, read once per request and shared by the shell and the page. Reading it also
 * lets it catch up with what happened since: see `catchUp`.
 */
export const loadSetupProgress = cache(async (account: HumanAccount): Promise<SetupProgress> => {
  const [user, agent] = await Promise.all([findCurrentUser(), getRelayAgent(account)]);
  const hostStatus = agent ? await loadHostStatus(account) : null;
  if (!user) {
    return { step: resolveStep(agent, {}, hostStatus), state: {}, agent, hostStatus, user, testMail: null };
  }

  const { state, testMail } = await catchUp(user, account, agent, readOnboardingState(user));

  return { step: resolveStep(agent, state, hostStatus), state, agent, hostStatus, user, testMail };
});

/**
 * Brings the stored state up to date with mail that landed after the agent was created. Only the time is
 * stored. Who sent it stays on `testMail` for this request, and only while the test step is still open.
 * A state that can't be saved is tried again on the next read, so a failure here never takes a page down.
 */
async function catchUp(
  user: User,
  account: HumanAccount,
  agent: RelayAgent | null,
  state: OnboardingState
): Promise<{ state: OnboardingState; testMail: SetupProgress['testMail'] }> {
  let replyAt = state.testReplyAt;
  let inbound: InboundEmail | null = null;
  if (awaitsTestMail(agent, state)) {
    const lookup = await readTestMail(account, agent, state);
    if (lookup.ok) {
      replyAt = lookup.inbound?.at;
      inbound = lookup.inbound;
    }
  }

  const saved = await saveProgress(user, state, rememberTestReply(state, replyAt));
  if (!inbound || saved.testReplyAt !== inbound.at) {
    return { state: saved, testMail: null };
  }

  return { state: saved, testMail: { from: inbound.from, subject: inbound.subject } };
}

/** Writes `next` when it differs from `before`. A failed write leaves `before` in place for the next read. */
async function saveProgress(user: User, before: OnboardingState, next: OnboardingState): Promise<OnboardingState> {
  if (next === before) {
    return before;
  }

  try {
    return await writeOnboardingState(user.id, before, next);
  } catch (error) {
    console.error('Failed to save the onboarding progress', error);

    return before;
  }
}

/** Changes the stored state of the signed-in operator. Returns `null` when nobody is signed in. */
export async function updateOnboardingState(
  change: (state: OnboardingState) => OnboardingState
): Promise<OnboardingState | null> {
  const user = await findCurrentUser();
  if (!user) {
    return null;
  }

  const state = readOnboardingState(user);
  const next = change(state);

  // A change that changes nothing hands the state back as it got it, and then there is nothing to save.
  return next === state ? state : writeOnboardingState(user.id, state, next);
}

/**
 * Marks the operator as someone who goes through the steps: the first time they see step 1. A failure to
 * save it only means the next visit tries again.
 */
export async function noteOnboardingStarted(): Promise<void> {
  try {
    await updateOnboardingState((state) =>
      state.startedAt ? state : { ...state, startedAt: new Date().toISOString() }
    );
  } catch (error) {
    console.error('Failed to note the start of the onboarding', error);
  }
}

/**
 * Records that the operator's agent came from a terminal by way of a claim. Such an agent has its address
 * and its host, so the steps are over for it, even for an operator who had opened them before.
 * Losing this note must not fail the claim it follows.
 */
export async function noteAgentClaimed(user: User): Promise<void> {
  const state = readOnboardingState(user);
  const now = new Date().toISOString();

  try {
    await writeOnboardingState(user.id, state, {
      ...state,
      testLeftAt: state.testLeftAt ?? now,
      finishedAt: state.finishedAt ?? now,
    });
  } catch (error) {
    console.error('Failed to note the claimed agent', error);
  }
}

/**
 * For a dashboard page: the operator's progress, once they may be there. Without an agent they belong in
 * the onboarding, and so do they in the middle of it, until they choose "Skip for now". `connect` is a host
 * the page was asked to connect (`?connect=codex`), which the onboarding's "Connect" step then starts on.
 */
export async function requireSetUpAgent(
  account: HumanAccount,
  connect: HostId | null = null
): Promise<SetupProgress & { agent: RelayAgent }> {
  const progress = await loadSetupProgress(account);
  const { agent } = progress;

  if (!agent || (isSetupUnfinished(progress.step) && !progress.state.skippedAt)) {
    redirect(connect ? onboardingConnectPath(connect) : ONBOARDING_PATH);
  }

  return { ...progress, agent };
}

/** What the onboarding page keeps asking for, to notice a change it has to show. Cheap to work out. */
export function describeProgress({ step, state, agent, hostStatus }: SetupProgress): string {
  return [
    step,
    agent?.id,
    state.testSentAt,
    state.testReplyAt,
    agent && state.testLeftAt && !hostStatus ? 'host-status-unavailable' : '',
    hostStatus?.connected ? 'connected' : '',
    ...(hostStatus?.hosts ?? []).map((host) => `${host.via}:${host.connectedAt}`),
    hostStatus?.waitingMessage?.seenAt,
    state.skippedAt,
  ]
    .map((part) => part ?? '')
    .join('|');
}

export type AgentIdentity = {
  /** What the operator called it. */
  name: string;
  /** The part of its address before the `@`, also how the CLI and its public card know it. */
  handle: string;
  address: string;
  cardLink: string;
  pictureUrl?: string;
  createdAt?: string;
};

/**
 * A short name for sentences and the connect prompt. The mailbox local-part wins, so an edited
 * address stays the one the card, the link and `connect` use. Otherwise the name, then a handle
 * left over from an older step 1.
 */
export function handleOf(agent: RelayAgent, state: OnboardingState, emailAddress?: string): string {
  return inboxHandleOf(emailAddress) || toHandle(agent.name) || state.handle || 'agent';
}

/** The part of an inbox address before `@`, when it is itself a handle. */
export function inboxHandleOf(emailAddress: string | undefined): string | undefined {
  const local = emailAddress?.split('@')[0]?.trim().toLowerCase();
  if (!local || toHandle(local) !== local) {
    return undefined;
  }

  return local;
}

/**
 * How the agent is addressed. `emailAddress` is the Agent Email Inbox the API assigned. Empty when that
 * inbox could not be read: the pages say it isn't ready rather than inventing `{name}@agentinbox.md`.
 * Its card is on the site `origin` names (`readSiteOrigin`).
 */
export function describeAgentIdentity(
  agent: RelayAgent,
  state: OnboardingState,
  origin: string,
  emailAddress?: string
): AgentIdentity {
  const name = agent.name && agent.name !== DEFAULT_AGENT_NAME ? agent.name : 'Your agent';
  const handle = handleOf(agent, state, emailAddress);

  return {
    name,
    handle,
    address: emailAddress ?? '',
    cardLink: cardLinkOf(origin, handle),
    pictureUrl: agent.pictureUrl,
    createdAt: agent.createdAt,
  };
}

/** Everything the dashboard shows about a setup: the banners, the dot in the sidebar and the checklist. */
export type SetupSummary = {
  step: SetupStep;
  agent: AgentIdentity;
  /** Messages nobody has read yet. They wait for the host. */
  waiting: number;
  /** A channel besides email is connected: Telegram or Slack. */
  secondChannelConnected: boolean;
  /** The operator went through the steps, as opposed to bringing an agent from a terminal. */
  wentThroughSteps: boolean;
  doneBannerDismissed: boolean;
  checklist: { done: string[]; hidden: boolean };
};

export async function loadSetupSummary(
  account: HumanAccount,
  progress: SetupProgress & { agent: RelayAgent }
): Promise<SetupSummary> {
  const { state, agent, step } = progress;
  const [channels, waiting, origin] = await Promise.all([
    loadChannelFacts(account),
    countWaitingMessages(account),
    readSiteOrigin(),
  ]);

  return {
    step,
    agent: describeAgentIdentity(agent, state, origin, channels.emailAddress),
    waiting: waiting ?? 0,
    secondChannelConnected: channels.telegram || channels.slack,
    wentThroughSteps: wasMadeInTheSteps(agent, state),
    doneBannerDismissed: state.doneBannerDismissed === true,
    checklist: { done: Object.keys(state.checklist?.done ?? {}), hidden: state.checklist?.hidden === true },
  };
}

export type OnboardingView = {
  step: OnboardingStep;
  /** `describeProgress` of what this view shows. */
  status: string;
  operator: { email: string | null; firstName: string | null };
  /** Missing on step 1, where the agent is still being named. */
  agent: AgentIdentity | null;
  test: { sentAt?: string; replyAt?: string; from?: string; subject?: string };
  host: { via: 'cli' | 'mcp'; connectedAt: string } | null;
  /** True when an agent may already be connected but its host status could not be checked. */
  hostStatusUnavailable: boolean;
  waitingMessage: HostStatus['waitingMessage'];
  /** `null` when the unread count could not be checked. */
  waiting: number | null;
  /** The Agent Inbox API (`readApiUrl`), named by the connect command of step 3 and the channel prompts of step 4. */
  apiUrl: string;
  /** The hosted MCP server the chat apps of step 3 connect to, or `null` while there is none. */
  mcpUrl: string | null;
  /** The chat apps that have signed in to the account. Only asked on step 3, whose drawers show it. */
  connectedTools: ToolId[];
  channels: { telegram: boolean; slack: boolean };
  /** What the Telegram and Slack drawers of step 4 open with. `null` on the other steps. */
  channelSetup: OnboardingChannelSetup | null;
  /** Who can reach the agent, for the Share dialog of step 4. `null` while there is no agent, or it couldn't be read. */
  reach: AgentReach | null;
  /** Where the dashboard is served (`readSiteOrigin`): the card link the steps show before there is an agent. */
  origin: string;
  /** Mailbox domain the API publishes, such as `dev.agentinbox.md`. The address step shows this before an inbox exists. */
  mailDomain: string;
};

/** What the Configure page hands its Telegram and Slack drawers, for the same drawers in step 4. */
export type OnboardingChannelSetup = {
  /** How far each setup got, so its drawer opens where it was left. `unknown` when it couldn't be read. */
  telegram: TelegramSetupState;
  slack: SlackSetupState;
  /** What the Slack app is called until the operator names it. */
  slackAppName: string;
  /** What the operator hands their own agent in each drawer. */
  prompts: Record<'telegram' | 'slack', string>;
};

/** What the onboarding page renders. `null` once there is nothing left to walk the operator through. */
export async function loadOnboardingView(account: HumanAccount): Promise<OnboardingView | null> {
  const progress = await loadSetupProgress(account);
  const { step, state, agent, hostStatus, user } = progress;
  if (step === 'done' || !user) {
    return null;
  }

  const [channels, waiting, setups] = agent
    ? await Promise.all([
        loadChannelFacts(account),
        countWaitingMessages(account),
        step === 'reach' ? loadChannelSetups(account) : null,
      ])
    : [{ telegram: false, slack: false, emailAddress: undefined }, 0, null];
  const mcpUrl = readMcpUrl();
  const [origin, mailDomain, connectedTools] = await Promise.all([
    readSiteOrigin(),
    readInboxMailDomain(account),
    step === 'connect' && mcpUrl ? listConnectedTools(account) : [],
  ]);
  const host = hostStatus?.hosts.reduce<(typeof hostStatus.hosts)[number] | null>(
    (earliest, entry) => (!earliest || entry.connectedAt < earliest.connectedAt ? entry : earliest),
    null
  );
  const identity = agent && describeAgentIdentity(agent, state, origin, channels.emailAddress);
  const apiUrl = await readApiUrl();

  return {
    step,
    status: describeProgress(progress),
    operator: { email: user.primaryEmailAddress?.emailAddress ?? null, firstName: user.firstName },
    agent: identity,
    test: {
      sentAt: state.testSentAt,
      replyAt: state.testReplyAt,
      from: progress.testMail?.from,
      subject: progress.testMail?.subject,
    },
    host: host ? { via: host.via, connectedAt: host.connectedAt } : null,
    hostStatusUnavailable: Boolean(agent && state.testLeftAt && !hostStatus),
    waitingMessage: hostStatus?.waitingMessage ?? null,
    waiting,
    apiUrl,
    mcpUrl,
    connectedTools,
    channels: { telegram: channels.telegram, slack: channels.slack },
    channelSetup:
      agent && identity && setups
        ? {
            ...setups,
            slackAppName: agentDisplayName(agent),
            prompts: {
              telegram: buildChannelPrompt({ apiUrl }, 'telegram', identity.handle),
              slack: buildChannelPrompt({ apiUrl }, 'slack', identity.handle),
            },
          }
        : null,
    reach: agent?.settings?.reach ?? null,
    origin,
    mailDomain,
  };
}

/** The domain new inboxes are created on. The production domain stands in when the API has not published one. */
async function readInboxMailDomain(account: HumanAccount): Promise<string> {
  try {
    const result = await requestForAccount<{ domain?: string }>(account, '/v1/human/inbox-address');
    const domain = result.domain?.trim().toLowerCase();
    if (domain && !/[\s@]/.test(domain) && domain.includes('.')) {
      return domain;
    }
  } catch {
    // The address preview keeps the production domain when this call cannot be made.
  }

  return AGENT_DOMAIN;
}

/**
 * The Telegram and Slack setups, read as the Configure page reads them. They are a detail of step 4: when
 * they can't be read, the drawers find out for themselves once they open.
 */
async function loadChannelSetups(account: HumanAccount): Promise<Pick<OnboardingChannelSetup, 'telegram' | 'slack'>> {
  try {
    const { telegramSetup, slackSetup } = await loadChannelsOverview(account);

    return { telegram: telegramSetup, slack: slackSetup };
  } catch (error) {
    console.error('Failed to read the channel setups for the onboarding', error);

    return { telegram: { step: 'unknown' }, slack: { step: 'unknown' } };
  }
}

async function loadChannelFacts(account: HumanAccount) {
  try {
    const channels = await listChannels(account);
    const connected = (via: 'telegram' | 'slack') =>
      channels.some((channel) => channel.via === via && channel.active && channel.connected);

    return {
      telegram: connected('telegram'),
      slack: connected('slack'),
      emailAddress: channels.find((channel) => channel.via === 'email' && channel.active)?.address,
    };
  } catch (error) {
    // The channels are a detail of these screens: without them the agent still shows, as not set up.
    console.error('Failed to load the channels for the onboarding', error);

    return { telegram: false, slack: false, emailAddress: undefined };
  }
}

/** How many messages wait for a host: the unread threads of the inbox. */
async function countWaitingMessages(account: HumanAccount): Promise<number | null> {
  try {
    const counts = await requestForAccount<{ tabs?: { unread?: number } }>(account, '/v1/human/inbox/counts', {
      query: { senders: 'all' },
    });

    return counts?.tabs?.unread ?? 0;
  } catch (error) {
    console.error('Failed to count the waiting messages', error);

    return null;
  }
}

/**
 * The newest human email after the agent was created. A failed read leaves the stored time alone, so the
 * step stays passed and this request shows no sender. With no time to measure from, nothing is recorded.
 */
async function readTestMail(
  account: HumanAccount,
  agent: RelayAgent | null,
  state: OnboardingState
): Promise<{ ok: true; inbound: InboundEmail | null } | { ok: false }> {
  const floor = agent?.createdAt ?? state.startedAt;
  if (!agent || !floor) {
    return { ok: true, inbound: null };
  }

  try {
    return { ok: true, inbound: await findInboundEmail(account, floor) };
  } catch (error) {
    console.error('Failed to look for inbound email', error);

    return { ok: false };
  }
}

/**
 * The newest human email after `floor`. The newest page is enough: a message that arrives while the
 * operator is on this step is at the top. The agent's own test email is from the agent, so it does not count.
 */
async function findInboundEmail(account: HumanAccount, floor: string): Promise<InboundEmail | null> {
  const sinceMs = Date.parse(floor);
  if (!Number.isFinite(sinceMs)) {
    return null;
  }

  const page = await listInboxThreads(account, { tab: 'all', channel: 'email' });
  let newest = newestInboundEmail(page.threads, sinceMs);

  for (const thread of page.threads) {
    if (!activityIsAfter(thread.lastActivityAt, sinceMs)) {
      break;
    }

    // This thread's latest message is already the newest human email on the page. Older threads cannot beat it.
    if (humanMessageAfter(thread.lastMessage, sinceMs)) {
      break;
    }

    const at = await latestHumanInThread(account, thread, sinceMs);
    if (!at) {
      continue;
    }

    newest = preferNewerInbound(newest, inboundEmailFrom(thread, at));
  }

  return newest;
}

/** A human message inside the thread, for when the agent wrote something after it. */
async function latestHumanInThread(
  account: HumanAccount,
  thread: InboxThread,
  sinceMs: number
): Promise<string | null> {
  const view = await getInboxThread(account, thread.id);

  return latestHumanMessageAt(view.messages, sinceMs);
}
