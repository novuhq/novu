import { randomUUID } from 'node:crypto';

const API_URL = process.env.NOVU_API_URL ?? 'http://localhost:3000';
const TURN_TIMEOUT_MS = Number(process.env.TURN_TIMEOUT_MS ?? 300_000);

export type ToolCall = {
  toolName: string;
  input?: unknown;
  output?: unknown;
  error?: string;
};

export type TurnResult = {
  text: string;
  toolCalls: ToolCall[];
  /** An `error` chunk on the stream, e.g. a moderation refusal or an agent crash. */
  streamError?: string;
};

export type WorkflowSummary = {
  id: string;
  workflowId: string;
  name: string;
  tags: string[];
  critical: boolean;
  payloadKeys: string[];
  payloadRequired: string[];
  steps: { type: string; name: string; controlValues: Record<string, unknown> }[];
};

type WorkflowResponse = {
  _id: string;
  workflowId: string;
  name: string;
  tags?: string[];
  preferences?: { user?: { all?: { readOnly?: boolean } } | null };
  payloadSchema?: { properties?: Record<string, unknown>; required?: string[] } | null;
  steps: { type: string; name: string; controlValues?: Record<string, unknown> | null }[];
};

function secretKey(): string {
  const key = process.env.NOVU_SECRET_KEY;
  if (!key) throw new Error('NOVU_SECRET_KEY is not set');

  return key;
}

function headers(): Record<string, string> {
  return { Authorization: `ApiKey ${secretKey()}`, 'Content-Type': 'application/json' };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${method} ${path} → ${response.status}: ${text.slice(0, 500)}`);
  }

  const json = text ? JSON.parse(text) : {};

  return (json.data ?? json) as T;
}

export async function createChat(): Promise<{ _id: string }> {
  return request('POST', '/v2/ai/chat', { resourceType: 'workflow' });
}

export async function getChat(chatId: string): Promise<{ _id: string; resourceId?: string }> {
  return request('GET', `/v2/ai/chat/${chatId}`);
}

export async function getWorkflow(id: string): Promise<WorkflowSummary> {
  const workflow = await request<WorkflowResponse>('GET', `/v2/workflows/${encodeURIComponent(id)}`);

  return {
    id: workflow._id,
    workflowId: workflow.workflowId,
    name: workflow.name,
    tags: workflow.tags ?? [],
    critical: workflow.preferences?.user?.all?.readOnly === true,
    payloadKeys: Object.keys(workflow.payloadSchema?.properties ?? {}),
    payloadRequired: workflow.payloadSchema?.required ?? [],
    steps: workflow.steps.map((step) => ({
      type: step.type,
      name: step.name,
      controlValues: step.controlValues ?? {},
    })),
  };
}

export async function deleteWorkflow(id: string): Promise<void> {
  await request('DELETE', `/v2/workflows/${encodeURIComponent(id)}`);
}

/** Direct tools can report a failure as a returned value instead of throwing. */
function isErrorOutput(output: unknown): boolean {
  if (!output || typeof output !== 'object') return false;
  const value = output as Record<string, unknown>;

  return value.isError === true || value.success === false || typeof value.error === 'string';
}

/**
 * Sends one user message the way the dashboard does and reads the AI SDK UI message stream
 * (SSE `data: {...}` chunks) until it ends.
 */
export async function sendTurn(chatId: string, text: string): Promise<TurnResult> {
  const response = await fetch(`${API_URL}/v2/ai/chat-stream`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      id: chatId,
      agentType: 'generate-workflow',
      message: { id: randomUUID(), role: 'user', parts: [{ type: 'text', text }] },
    }),
    signal: AbortSignal.timeout(TURN_TIMEOUT_MS),
  });

  if (!response.ok || !response.body) {
    throw new Error(`POST /v2/ai/chat-stream → ${response.status}: ${(await response.text()).slice(0, 500)}`);
  }

  const result: TurnResult = { text: '', toolCalls: [] };
  const toolCalls = new Map<string, ToolCall>();
  const decoder = new TextDecoder();
  let buffer = '';

  const handleLine = (line: string) => {
    if (!line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') return;

    const chunk = JSON.parse(data) as Record<string, any>;
    const call = (): ToolCall => {
      const existing = toolCalls.get(chunk.toolCallId);
      if (existing) return existing;
      const created: ToolCall = { toolName: chunk.toolName ?? 'unknown' };
      toolCalls.set(chunk.toolCallId, created);

      return created;
    };

    switch (chunk.type) {
      case 'text-delta':
        result.text += chunk.delta ?? '';
        break;
      case 'tool-input-available':
        Object.assign(call(), { toolName: chunk.toolName, input: chunk.input });
        break;
      case 'tool-output-available': {
        const toolCall = call();
        toolCall.output = chunk.output;
        if (isErrorOutput(chunk.output)) toolCall.error = JSON.stringify(chunk.output).slice(0, 500);
        break;
      }
      case 'tool-output-error':
        call().error = chunk.errorText ?? 'tool error';
        break;
      case 'error':
        result.streamError = chunk.errorText ?? 'stream error';
        break;
    }
  };

  for await (const bytes of response.body) {
    buffer += decoder.decode(bytes, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    lines.forEach(handleLine);
  }
  handleLine(buffer);

  result.toolCalls = [...toolCalls.values()];

  return result;
}
