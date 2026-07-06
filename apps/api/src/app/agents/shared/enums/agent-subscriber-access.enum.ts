/**
 * Controls whether an agent accepts inbound messages from senders that are not
 * yet linked to a Novu subscriber.
 *
 * - `restricted` (default): unknown senders are rejected with the "couldn't
 *   verify your email" reply and no LLM dispatch fires.
 * - `open`: unknown email senders are auto-provisioned as lightweight
 *   subscribers (marked with agent-platform provenance) so the agent can reply.
 *   Abuse mitigation is the customer's responsibility in this mode.
 */
export enum AgentSubscriberAccessEnum {
  OPEN = 'open',
  RESTRICTED = 'restricted',
}
