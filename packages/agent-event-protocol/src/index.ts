/**
 * Wire-only AgentEvent contract: envelope shapes, event union, and runtime guards.
 * Server paths validate, store, and forward envelopes — they do not fold timelines.
 * Client-side projection (`applyEnvelope` → `AgentMessage[]`) lives in `@novu/js` web-chat.
 */
export type {
  AgentApprovalRequest,
  AgentEvent,
  AgentEventEnvelope,
  AgentEventUsage,
  AgentFinishReason,
  AgentHumanCard,
  AgentHumanCardElement,
  AgentHumanChromeCard,
  AgentHumanOptionInput,
  AgentRunOutcome,
  AgentSignal,
} from './agent-event.types';
export { AGENT_EVENT_PROTOCOL_VERSION, isAgentEventEnvelope, isDeltaEvent } from './agent-event.types';
export type {
  CardElement,
  CardElementActionChild,
  CardElementActionsElement,
  CardElementButtonElement,
  CardElementChartDataPoint,
  CardElementChartDefinition,
  CardElementChartElement,
  CardElementChartSegment,
  CardElementChartSeries,
  CardElementChild,
  CardElementDividerElement,
  CardElementFieldElement,
  CardElementFieldsElement,
  CardElementImageElement,
  CardElementLinkButtonElement,
  CardElementLinkElement,
  CardElementPieChartDefinition,
  CardElementRadioSelectElement,
  CardElementSectionElement,
  CardElementSelectElement,
  CardElementSelectOptionElement,
  CardElementSeriesChartDefinition,
  CardElementTableElement,
  CardElementTextElement,
} from './card-element.types';
export type {
  AgentFileRef,
  AgentMessageContent,
  AgentMessageRole,
  AgentToolResultContent,
  AgentToolSource,
} from './wire-content.types';
