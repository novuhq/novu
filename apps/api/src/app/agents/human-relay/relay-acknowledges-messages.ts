import type { AgentEntity } from '@novu/dal';

/**
 * Whether the operator of an Agent Inbox agent turned on acknowledging incoming messages. Other agents acknowledge
 * unless told not to; a relay agent waits to be told, because a person or a host answers it later, and typing would
 * promise a reply nobody is writing yet (NV-9161).
 */
export function relayAcknowledgesMessages(agent: Pick<AgentEntity, 'behavior'>): boolean {
  return agent.behavior?.acknowledgeOnReceived === true;
}
