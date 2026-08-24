/**
 * Wire-only AgentEvent contract: envelope shapes, event union, and runtime guards.
 * Server paths validate, store, and forward envelopes — they do not fold timelines.
 * Client-side projection (`applyEnvelope` → `AgentMessage[]`) lives in `@novu/js` agent-chat.
 */
export type {
  AgentApprovalRequest,
  AgentEvent,
  AgentEventEnvelope,
  AgentEventUsage,
  AgentFinishReason,
  AgentRunOutcome,
  AgentSignal,
} from './agent-event.types';
export { AGENT_EVENT_PROTOCOL_VERSION, isAgentEventEnvelope, isDeltaEvent } from './agent-event.types';
export type {
  AgentFileRef,
  AgentMessageContent,
  AgentMessageRole,
  AgentToolResultContent,
  AgentToolSource,
} from './wire-content.types';
