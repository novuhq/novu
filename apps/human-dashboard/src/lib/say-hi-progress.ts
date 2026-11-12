import type { HostStatus } from './host-status';
import { type SetupStep, wasMadeInTheSteps } from './onboarding-progress';
import type { OnboardingState } from './onboarding-state';

/**
 * Where an operator stands in the onboarding where the agent says hi with its card
 * (`IS_AGENT_INBOX_NEW_ONBOARDING_ENABLED`): naming it and picking its look (A.1), picking where it lives (A.2),
 * connecting that host (A.3), asking it to say hi (A.4a), and its card shown (A.4). `done` once they open the
 * inbox, or for an agent the steps never made.
 */
export type SayHiStep = 'name' | 'host' | 'connect' | 'say-hi' | 'said-hi' | 'done';

type StepAgent = { id: string; createdAt?: string; cardShown?: { at: string } | null };

/**
 * The step, from what is true: the agent, the host it has, the card it showed and what the operator chose.
 * A refresh, another browser and "Continue setup" all open the same one, and an operator who was halfway
 * through the earlier onboarding lands where they stand: no host yet is A.2, a host without a card is A.4a.
 *
 * A card shown at any point, even before the page asked for it, is the agent saying hi. A host has come in once
 * the API saw it (it used its code, or checked the inbox) or once it signed in through the MCP server
 * (`signedIn`), which a chat app or a plugin does before its first check.
 */
export function resolveSayHiStep(
  agent: StepAgent | null,
  state: OnboardingState,
  hostStatus: HostStatus | null,
  signedIn = false
): SayHiStep {
  if (!agent) return 'name';
  if (!wasMadeInTheSteps(agent, state)) return 'done';
  if (state.finishedAt) return 'done';
  if (agent.cardShown || hostStatus?.cardShown) return 'said-hi';
  if (hostStatus?.connected || signedIn) return 'say-hi';
  if (!hasPickedHost(state)) return 'host';

  return 'connect';
}

/** A host picked since the operator last chose "Do it later": coming back asks where the agent lives again. */
function hasPickedHost(state: OnboardingState): boolean {
  if (!state.hostPickedAt) {
    return false;
  }

  return !state.skippedAt || Date.parse(state.hostPickedAt) >= Date.parse(state.skippedAt);
}

/**
 * The step as the rest of the dashboard knows the earlier onboarding's, for its banners and its redirects: until
 * a host connects the setup is unfinished, as on that onboarding's Connect step; saying hi is its last step,
 * which never keeps anyone from the dashboard.
 */
export function legacyStepOf(step: SayHiStep): SetupStep {
  switch (step) {
    case 'name':
      return 'address';
    case 'host':
    case 'connect':
      return 'connect';
    case 'say-hi':
    case 'said-hi':
      return 'reach';
    default:
      return 'done';
  }
}

/** Which of the four steps a page shows, for the dots and for "step N of 4". */
export function stepNumberOf(step: SayHiStep): 1 | 2 | 3 | 4 {
  switch (step) {
    case 'name':
      return 1;
    case 'host':
      return 2;
    case 'connect':
      return 3;
    default:
      return 4;
  }
}
