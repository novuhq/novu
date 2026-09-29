import { randomUUID } from 'node:crypto';
import type { Config } from '../config.ts';
import { googleJson } from '../google-auth.ts';
import type { ForwardResult } from './index.ts';

const MOCK_INPUT_REQUIRED = 'mock_function_call_for_required_user_input';
const TIMEOUT_MS = 120_000;

type ProxyMessage = {
  contextId?: string;
  content?: Array<{ text?: string }>;
  metadata?: {
    sessionInfo?: { session?: string };
    answer?: {
      diagnosticInfo?: {
        plannerSteps?: Array<{ planStep?: { parts?: Array<{ functionCall?: { functionName?: string; args?: Record<string, unknown> } }> } }>;
      };
      replies?: Array<{ actionInvocation?: { actionName?: string; args?: Record<string, unknown> } }>;
    };
  };
};

/**
 * Discovery Engine A2A proxy (v1, protobuf-JSON). Only text parts are accepted; `taskId` is ignored
 * and DataParts return 400, so the conversation continues via `contextId` = the saved session name.
 */
export async function sendToA2aProxy(
  config: Config,
  targetId: string,
  text: string,
  session: string | undefined
): Promise<ForwardResult> {
  const url =
    `https://discoveryengine.googleapis.com/v1/${config.engine}/assistants/default_assistant` +
    `/agents/${targetId}/a2a/v1/message:send`;
  const body = {
    message: {
      messageId: randomUUID(),
      role: 'ROLE_USER',
      content: [{ text }],
      ...(session ? { contextId: session } : {}),
    },
  };
  const response = await googleJson<{ message?: ProxyMessage }>('POST', url, config.project, body, TIMEOUT_MS);

  return parseProxyMessage(response.message);
}

export function parseProxyMessage(message: ProxyMessage | undefined): ForwardResult {
  const session = message?.contextId ?? message?.metadata?.sessionInfo?.session;
  if (!message || !session) throw new Error('A2A proxy response has no message or session');

  // message:send converts both the artifact and the final status message, so the answer comes twice.
  const texts = [...new Set((message.content ?? []).map((part) => part.text?.trim()).filter((t): t is string => !!t))];
  if (texts.length > 0) return { kind: 'answer', text: texts.join('\n\n'), session };

  const question = findInputRequired(message);
  if (question) return { kind: 'question', text: question, session };

  return { kind: 'unreadable', session };
}

function findInputRequired(message: ProxyMessage): string | undefined {
  const answer = message.metadata?.answer;
  const candidates: Array<{ name?: string; args?: Record<string, unknown> }> = [
    ...(answer?.replies ?? []).map((reply) => ({ name: reply.actionInvocation?.actionName, args: reply.actionInvocation?.args })),
    ...(answer?.diagnosticInfo?.plannerSteps ?? []).flatMap((step) =>
      (step.planStep?.parts ?? []).map((part) => ({ name: part.functionCall?.functionName, args: part.functionCall?.args }))
    ),
  ];

  for (const { name, args } of candidates) {
    const question = args?.input_required;
    if (name === MOCK_INPUT_REQUIRED && typeof question === 'string' && question.trim()) return question.trim();
  }

  return undefined;
}
