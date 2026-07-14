import type { AgentRuntime } from '@novu/shared';

export const SUBSCRIBER_ACCESS_SETTING_LABEL = 'Accept messages from anonymous';

/**
 * The Agent behavior toggle drives every downstream "who can reach this agent?"
 * copy — the tooltip and both channel guidance rows read the same runtime, so we
 * keep the wording centralised here.
 *
 * At every point we surface these copies the agent already exists and its runtime
 * cannot change (managed vs. self-hosted is fixed at creation), so the tooltip
 * only describes the runtime the user is actually looking at instead of both.
 */
export function isManagedAgentRuntime(runtime: AgentRuntime | undefined): boolean {
  return runtime === 'managed';
}

/**
 * Tooltip for the `SUBSCRIBER_ACCESS_SETTING_LABEL` toggle on Agent behavior.
 * Describes the on/off behavior tailored to the fixed runtime of this agent.
 */
export function getSubscriberAccessToggleTooltip(runtime: AgentRuntime | undefined): string {
  if (isManagedAgentRuntime(runtime)) {
    return 'On: anonymous senders become lightweight subscribers so the agent can reply immediately. Off: only known or already-linked subscribers are accepted; everyone else gets a short denial reply. Abuse mitigation is your responsibility when this is on.';
  }

  return 'On: anonymous senders are forwarded to your bridge with a null subscriber for your code to decide (auto-provision, deny, escalate). Off: only known or already-linked subscribers are accepted; everyone else gets a short denial reply. Abuse mitigation is your responsibility when this is on.';
}
