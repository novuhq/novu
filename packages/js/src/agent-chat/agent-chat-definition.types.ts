import type { AgentToolResultContent } from '@novu/agent-event-protocol';
import type { AgentToolPart } from './agent-message.types';

/** Per-tool input/output shapes for compile-time narrowing on `AgentToolPart`. */
export type AgentToolDefinition = {
  input?: unknown;
  output?: unknown;
};

export type AgentChatToolsDefinition = Record<string, AgentToolDefinition>;

/**
 * Optional integrator-defined tool catalog for narrowing `AgentToolPart` by `toolName`.
 *
 * @example
 * type MyChat = AgentChatDefinition<{
 *   tools: {
 *     getOrder: { input: { orderId: string }; output: { status: string } };
 *   };
 * }>;
 * type OrderTool = AgentToolPartFor<MyChat['tools'], 'getOrder'>;
 */
export type AgentChatDefinition<TTools extends AgentChatToolsDefinition = AgentChatToolsDefinition> = {
  tools: TTools;
};

export type AgentToolPartFor<TTools extends AgentChatToolsDefinition, TName extends string> = TName extends keyof TTools
  ? AgentToolPart & {
      toolName: TName;
      input: TTools[TName]['input'] extends undefined ? Record<string, unknown> | undefined : TTools[TName]['input'];
      output: TTools[TName]['output'] extends undefined
        ? AgentToolResultContent[] | undefined
        : TTools[TName]['output'];
    }
  : AgentToolPart;
