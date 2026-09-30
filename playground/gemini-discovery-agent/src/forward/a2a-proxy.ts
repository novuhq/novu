import { randomUUID } from 'node:crypto';
import { config } from '../config.ts';
import { googlePost } from '../google.ts';
import type { AgentReply } from './index.ts';

const TIMEOUT_MS = 120_000;
/** How the proxy reports an A2A `input-required` question: a fake tool call with the question in its args. */
const INPUT_REQUIRED_CALL = 'mock_function_call_for_required_user_input';

type ToolCall = { name?: string; args?: Record<string, unknown> };

type ProxyMessage = {
  contextId?: string;
  content?: Array<{ text?: string }>;
  metadata?: {
    answer?: {
      replies?: Array<{ actionInvocation?: { actionName?: string; args?: Record<string, unknown> } }>;
      diagnosticInfo?: {
        plannerSteps?: Array<{ planStep?: { parts?: Array<{ functionCall?: { functionName?: string; args?: Record<string, unknown> } }> } }>;
      };
    };
  };
};

/**
 * Discovery Engine A2A proxy for registered A2A agents. It accepts text only and ignores `taskId`,
 * so the conversation continues through `contextId` = the saved session.
 */
export async function askA2aProxy(agentId: string, text: string, session: string | undefined): Promise<AgentReply> {
  const url = `https://discoveryengine.googleapis.com/v1/${config.engine}/assistants/default_assistant/agents/${agentId}/a2a/v1/message:send`;
  const body = { message: { messageId: randomUUID(), role: 'ROLE_USER', content: [{ text }], contextId: session } };

  const { message }: { message?: ProxyMessage } = JSON.parse(await googlePost(url, body, TIMEOUT_MS));
  if (!message?.contextId) throw new Error('A2A proxy response has no contextId');

  // The proxy returns both the artifact and the final status message, so the answer comes twice.
  const texts = new Set((message.content ?? []).map((part) => part.text?.trim()).filter(Boolean));

  return { text: [...texts].join('\n\n') || findQuestion(message), session: message.contextId };
}

function findQuestion(message: ProxyMessage): string | undefined {
  const answer = message.metadata?.answer;
  const calls: ToolCall[] = [
    ...(answer?.replies ?? []).map(({ actionInvocation: call }) => ({ name: call?.actionName, args: call?.args })),
    ...(answer?.diagnosticInfo?.plannerSteps ?? []).flatMap((step) =>
      (step.planStep?.parts ?? []).map(({ functionCall: call }) => ({ name: call?.functionName, args: call?.args }))
    ),
  ];
  const question = calls.find((call) => call.name === INPUT_REQUIRED_CALL)?.args?.input_required;

  return typeof question === 'string' ? question.trim() || undefined : undefined;
}
