import type { AgentEvent } from '@novu/agent-event-protocol';

export {
  AGENT_EVENT_PROTOCOL_VERSION,
  type AgentEventEnvelope,
  type AgentFileRef,
  type AgentMessageContent,
} from '@novu/agent-event-protocol';

/** Subset of `AgentEvent` the chat adapter emits. */
export type AdapterAgentEvent = Extract<
  AgentEvent,
  | { type: 'message' }
  | { type: 'channel.edit' }
  | { type: 'channel.reaction' }
  | { type: 'signal' }
  | { type: 'resolve' }
>;
