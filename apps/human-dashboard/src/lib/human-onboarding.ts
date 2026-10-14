import 'server-only';

import type { User } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { findCurrentUser } from './auth-page';
import type { HumanAccount } from './human-account';
import { DEFAULT_AGENT_NAME, getRelayAgent, type RelayAgent } from './human-agent-api';
import { requestForAccount } from './human-api-key';
import { listChannels } from './human-channels-api';
import { listConnectedTools } from './human-tools-api';
import { addressOf, cardLinkOf, type HostVia, ONBOARDING_PATH, type OnboardingStep, toHandle } from './onboarding';
import { advanceMocks, connectCode } from './onboarding-mocks';
import { type OnboardingState, readOnboardingState, writeOnboardingState } from './onboarding-state';

/** Where an operator stands: on one of the four steps, or `done` with them. */
export type SetupStep = OnboardingStep | 'done';

export type SetupProgress = {
  step: SetupStep;
  state: OnboardingState;
  agent: RelayAgent | null;
  /** Missing only when the session outlived its user; the pages have sent that visitor to sign in by then. */
  user: User | null;
};

/** How far apart the dashboard's clock and the API's may be when a time of one is held against the other's. */
const CLOCK_SLACK_MS = 60_000;

/**
 * Whether the agent was made while its operator was in the onboarding: after they first saw step 1.
 *
 * An agent that is older than that visit was there all along. Step 1 only showed because the agent
 * couldn't be found for a moment, and that doesn't put an agent that has long been in use through the steps.
 */
export function wasMadeInTheSteps(agent: Pick<RelayAgent, 'createdAt'>, state: OnboardingState): boolean {
  if (!state.startedAt) {
    return false;
  }

  return !agent.createdAt || Date.parse(agent.createdAt) >= Date.parse(state.startedAt) - CLOCK_SLACK_MS;
}

/**
 * The step the operator is on. Nothing but the agent and the stored state decide it, so a refresh, another
 * browser and "Continue setup" all open the same one.
 *
 * An agent the steps never saw being made came from a terminal: claimed, or set up there after logging in.
 * It has its address and its host already, so there is nothing to walk its operator through.
 */
export function resolveStep(agent: Pick<RelayAgent, 'createdAt'> | null, state: OnboardingState): SetupStep {
  if (!agent) return 'address';
  if (!wasMadeInTheSteps(agent, state)) return 'done';
  if (!state.testLeftAt) return 'test';
  if (!state.host) return 'connect';
  if (!state.finishedAt) return 'reach';

  return 'done';
}

/** The agent exists but no host reads its mail yet: what the "setup not finished" banners are about. */
export function isSetupUnfinished(step: SetupStep): step is 'test' | 'connect' {
  return step === 'test' || step === 'connect';
}

/**
 * The operator's progress, read once per request and shared by the shell and the page. Reading it also
 * lets it catch up with what happened since: see `catchUp`.
 */
export const loadSetupProgress = cache(async (account: HumanAccount): Promise<SetupProgress> => {
  const [user, agent] = await Promise.all([findCurrentUser(), getRelayAgent(account)]);
  if (!user) {
    return { step: resolveStep(agent, {}), state: {}, agent, user };
  }

  const state = await catchUp(user, account, agent, readOnboardingState(user));

  return { step: resolveStep(agent, state), state, agent, user };
});

/**
 * Brings the stored state up to date: the stand-ins that are due (`advanceMocks`), and a connector that
 * signed in to the account, which is a host that really connected. A state that can't be saved is tried
 * again on the next read, so a failure here never takes a page down.
 */
async function catchUp(
  user: User,
  account: HumanAccount,
  agent: RelayAgent | null,
  state: OnboardingState
): Promise<OnboardingState> {
  let next = advanceMocks(state) ?? state;

  if (agent && isSetupUnfinished(resolveStep(agent, next)) && !next.host) {
    const [tool] = await listConnectedTools(account);
    if (tool) {
      next = { ...next, host: { via: 'mcp', connectedAt: new Date().toISOString() } };
    }
  }

  if (next === state) {
    return state;
  }

  try {
    return await writeOnboardingState(user.id, state, next);
  } catch (error) {
    console.error('Failed to save the onboarding progress', error);

    return state;
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
 * Like `noteHostConnected`, it never fails what it follows.
 */
export async function noteAgentClaimed(user: User): Promise<void> {
  const state = readOnboardingState(user);
  const now = new Date().toISOString();

  try {
    await writeOnboardingState(user.id, state, {
      ...state,
      host: state.host ?? { via: 'cli', connectedAt: now },
      testLeftAt: state.testLeftAt ?? now,
      finishedAt: state.finishedAt ?? now,
    });
  } catch (error) {
    console.error('Failed to note the claimed agent', error);
  }
}

/**
 * Records that a host connected to the operator's agent, the first time one does. Approving a CLI login
 * calls it: a terminal that was let into the account is a host. Losing this note must not fail the login
 * it comes from, so it never throws.
 */
export async function noteHostConnected(user: User, via: HostVia): Promise<void> {
  const state = readOnboardingState(user);
  if (state.host) {
    return;
  }

  try {
    await writeOnboardingState(user.id, state, { ...state, host: { via, connectedAt: new Date().toISOString() } });
  } catch (error) {
    console.error('Failed to note the connected host', error);
  }
}

/**
 * For a dashboard page: the operator's progress, once they may be there. Without an agent they belong in
 * the onboarding, and so do they in the middle of it, until they choose "Skip for now".
 */
export async function requireSetUpAgent(account: HumanAccount): Promise<SetupProgress & { agent: RelayAgent }> {
  const progress = await loadSetupProgress(account);
  const { agent } = progress;

  if (!agent || (isSetupUnfinished(progress.step) && !progress.state.skippedAt)) {
    redirect(ONBOARDING_PATH);
  }

  return { ...progress, agent };
}

/** What the onboarding page keeps asking for, to notice a change it has to show. Cheap to work out. */
export function describeProgress({ step, state, agent }: SetupProgress): string {
  return [
    step,
    agent?.id,
    state.testSentAt,
    state.testReplyAt,
    state.host?.connectedAt,
    state.host?.readAt,
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
 * How the agent is addressed. The address is the one the API gave it; while the API can't take the one
 * picked on step 1 (NV-9032), an agent without an inbox of its own shows the picked one instead.
 */
export function describeAgentIdentity(agent: RelayAgent, state: OnboardingState, emailAddress?: string): AgentIdentity {
  const name = agent.name && agent.name !== DEFAULT_AGENT_NAME ? agent.name : 'Your agent';
  const handle = state.handle || toHandle(agent.name) || 'agent';

  return {
    name,
    handle,
    address: emailAddress ?? addressOf(handle),
    cardLink: cardLinkOf(handle),
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
  telegramConnected: boolean;
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
  const [channels, waiting] = await Promise.all([loadChannelFacts(account), countWaitingMessages(account, state)]);

  return {
    step,
    agent: describeAgentIdentity(agent, state, channels.emailAddress),
    waiting,
    telegramConnected: channels.telegram,
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
  test: { sentAt?: string; replyAt?: string };
  host: OnboardingState['host'] | null;
  waiting: number;
  /** The one-time code in the prompt of step 3. */
  connectCode: string;
  channels: { telegram: boolean; slack: boolean };
};

/** What the onboarding page renders. `null` once there is nothing left to walk the operator through. */
export async function loadOnboardingView(account: HumanAccount): Promise<OnboardingView | null> {
  const progress = await loadSetupProgress(account);
  const { step, state, agent, user } = progress;
  if (step === 'done' || !user) {
    return null;
  }

  const [channels, waiting] = agent
    ? await Promise.all([loadChannelFacts(account), countWaitingMessages(account, state)])
    : [{ telegram: false, slack: false, emailAddress: undefined }, 0];

  return {
    step,
    status: describeProgress(progress),
    operator: { email: user.primaryEmailAddress?.emailAddress ?? null, firstName: user.firstName },
    agent: agent && describeAgentIdentity(agent, state, channels.emailAddress),
    test: { sentAt: state.testSentAt, replyAt: state.testReplyAt },
    host: state.host ?? null,
    waiting,
    connectCode: connectCode(user.id),
    channels: { telegram: channels.telegram, slack: channels.slack },
  };
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

/**
 * How many messages wait for a host: the unread threads of the inbox, plus the stand-in reply to the test
 * email (NV-9032) until a host has read it.
 */
async function countWaitingMessages(account: HumanAccount, state: OnboardingState): Promise<number> {
  const mockReply = state.testReplyAt && !state.host?.readAt ? 1 : 0;

  try {
    const counts = await requestForAccount<{ tabs?: { unread?: number } }>(account, '/v1/human/inbox/counts', {
      query: { senders: 'all' },
    });

    return (counts?.tabs?.unread ?? 0) + mockReply;
  } catch (error) {
    console.error('Failed to count the waiting messages', error);

    return mockReply;
  }
}
