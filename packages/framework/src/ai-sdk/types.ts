import type { generateText, streamText } from 'ai';
import type { AgentHandlers, AgentMessage, AgentMessageContext, MessageContent } from '../resources/agent/agent.types';
import type { Awaitable } from '../types/util.types';

/** Result from `streamText()` or `generateText()`. Return from `onMessage` to reply with the model output. */
export type AiSdkResult = ReturnType<typeof streamText> | Awaited<ReturnType<typeof generateText>>;

/**
 * Event handlers for an AI SDK agent.
 *
 * Same shape as `AgentHandlers`, except `onMessage` may also return a
 * `streamText()` or `generateText()` result — Novu delivers the model output
 * automatically.
 */
export type AiSdkAgentHandlers = Omit<AgentHandlers, 'onMessage'> & {
  onMessage: (message: AgentMessage, ctx: AgentMessageContext) => Awaitable<MessageContent | AiSdkResult | void>;
};
