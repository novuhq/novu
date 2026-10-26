import type { HostStatus } from './host-status';
import type { OnboardingState } from './onboarding-state';

/** How far apart the dashboard's clock and the API's may be when a time of one is held against the other's. */
const CLOCK_SLACK_MS = 60_000;

/** Where an operator stands: on one of the four steps, or `done` with them. */
export type SetupStep = 'address' | 'test' | 'connect' | 'reach' | 'done';

type StepAgent = { id: string; createdAt?: string };

/**
 * Whether the agent was made while its operator was in the onboarding: after they first saw step 1,
 * and by the web's own create step (which is the only writer of `state.agentId`).
 *
 * An agent that is older than that visit was there all along. Step 1 only showed because the agent
 * couldn't be found for a moment, and that doesn't put an agent that has long been in use through the steps.
 * An agent made in a terminal or over MCP never gets `state.agentId`, so it has no steps left to walk —
 * even when the operator merely viewed step 1 earlier and `startedAt` was written.
 */
export function wasMadeInTheSteps(agent: StepAgent, state: OnboardingState): boolean {
  if (!state.startedAt || !state.agentId || state.agentId !== agent.id) {
    return false;
  }

  return !agent.createdAt || Date.parse(agent.createdAt) >= Date.parse(state.startedAt) - CLOCK_SLACK_MS;
}

/**
 * The step the operator is on. The agent, its real host status and the stored operator choices decide it,
 * so a refresh, another browser and "Continue setup" all open the same one.
 *
 * An agent the steps never saw being made came from a terminal or the MCP: claimed, or set up there after
 * logging in. It has its address and its host already, so there is nothing to walk its operator through.
 */
export function resolveStep(agent: StepAgent | null, state: OnboardingState, hostStatus: HostStatus | null): SetupStep {
  if (!agent) return 'address';
  if (!wasMadeInTheSteps(agent, state)) return 'done';
  if (state.finishedAt) return 'done';
  if (!state.testLeftAt) return 'test';
  if (!hostStatus?.connected) return 'connect';

  return 'reach';
}

/** The agent exists but no host reads its mail yet: what the "setup not finished" banners are about. */
export function isSetupUnfinished(step: SetupStep): step is 'test' | 'connect' {
  return step === 'test' || step === 'connect';
}

/**
 * The operator is still on the test step of an agent this onboarding created. A claimed agent is
 * not, and neither is anyone who already left that step.
 */
export function awaitsTestMail(agent: StepAgent | null, state: OnboardingState): boolean {
  return Boolean(agent && wasMadeInTheSteps(agent, state) && !state.finishedAt && !state.testLeftAt);
}

/**
 * The time a human email arrived. The sender and the subject are not kept: an older build stored them
 * beside this time, and they are dropped here. The same state comes back when the time is unchanged
 * and those fields are already gone.
 */
export function rememberTestReply(state: OnboardingState, replyAt: string | undefined): OnboardingState {
  const stored = state as OnboardingState & { testInboundFrom?: string; testInboundSubject?: string };
  const hasCopy = stored.testInboundFrom != null || stored.testInboundSubject != null;
  if (state.testReplyAt === replyAt && !hasCopy) {
    return state;
  }

  const { testReplyAt: _at, testInboundFrom: _from, testInboundSubject: _subject, ...rest } = stored;
  if (!replyAt) {
    return rest;
  }

  return { ...rest, testReplyAt: replyAt };
}
