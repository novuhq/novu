import type { AgentToolResultContent } from '@novu/agent-event-protocol';
import type { AgentToolPart } from './agent-message.types';

/** Input and output shapes used to narrow `AgentToolPart` at compile time. */
export type AgentToolDefinition = {
  input?: unknown;
  output?: unknown;
};

export type WebChatToolsDefinition = Record<string, AgentToolDefinition>;

/**
 * Optional tool catalog. Use it to narrow `AgentToolPart` by `toolName`.
 *
 * @example
 * type MyChat = WebChatDefinition<{
 *   tools: {
 *     getOrder: { input: { orderId: string }; output: { status: string } };
 *   };
 * }>;
 * type OrderTool = AgentToolPartFor<MyChat['tools'], 'getOrder'>;
 */
export type WebChatDefinition<TTools extends WebChatToolsDefinition = WebChatToolsDefinition> = {
  tools: TTools;
};

export type AgentToolPartFor<TTools extends WebChatToolsDefinition, TName extends string> = TName extends keyof TTools
  ? AgentToolPart & {
      toolName: TName;
      input: TTools[TName]['input'] extends undefined ? Record<string, unknown> | undefined : TTools[TName]['input'];
      output: TTools[TName]['output'] extends undefined
        ? AgentToolResultContent[] | undefined
        : TTools[TName]['output'];
    }
  : AgentToolPart;
