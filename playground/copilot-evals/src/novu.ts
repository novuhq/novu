import { createHmac, randomUUID } from 'node:crypto';

export const API_URL = process.env.NOVU_API_URL ?? 'http://localhost:3000';
const TURN_TIMEOUT_MS = Number(process.env.TURN_TIMEOUT_MS ?? 300_000);

const SECRET_KEY = process.env.NOVU_SECRET_KEY;
if (!SECRET_KEY) throw new Error('NOVU_SECRET_KEY is not set');

const API_KEY_AUTHORIZATION = `ApiKey ${SECRET_KEY}`;

const INTERNAL_AUTH_SECRET = process.env.NOVU_INTERNAL_AUTH_SECRET;
// Must match INTERNAL_AUTH_AUDIENCE and INTERNAL_AUTH_TOKEN_TTL_SECONDS in packages/shared/src/types/auth.ts.
const INTERNAL_AUTH_AUDIENCE = 'novu-internal';
const INTERNAL_AUTH_TOKEN_TTL_SECONDS = 60;
/** As `URL.hostname` spells them: it keeps the brackets around an IPv6 address. */
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

function apiKeyReadReason(): string | undefined {
  if (!INTERNAL_AUTH_SECRET) return 'NOVU_INTERNAL_AUTH_SECRET is not set';
  // A minted token authenticates as the chat's member, so it is only ever sent to an API on this machine.
  const { hostname } = new URL(API_URL);
  if (!LOOPBACK_HOSTS.includes(hostname)) return `NOVU_API_URL points at ${hostname}, not localhost, 127.0.0.1 or ::1`;

  return undefined;
}

/**
 * Why workflow reads use the API key instead of an Internal token, which the API never answers from its 60 s
 * workflow-preferences cache; unset when they use the token.
 */
export const API_KEY_READ_REASON = apiKeyReadReason();

const headers = (authorization = API_KEY_AUTHORIZATION) => ({
  Authorization: authorization,
  'Content-Type': 'application/json',
});

export type ToolCall = {
  toolName: string;
  input?: unknown;
  error?: string;
};

export type TurnResult = {
  text: string;
  /** Text parts left out of `text` because each is one JSON object, e.g. the input guard's output leaking out. */
  droppedText?: string[];
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
  steps: { stepId: string; type: string; name: string; controlValues: Record<string, unknown> }[];
  /** Why the read used the API key instead of an Internal token; such reads can serve preferences up to 60 s stale. */
  apiKeyReadReason?: string;
};

/** The member a chat belongs to, whom an Internal token acts as. */
export interface ChatIdentity {
  userId: string;
  organizationId: string;
  environmentId: string;
}

export interface Chat {
  _id: string;
  resourceId?: string;
  identity?: ChatIdentity;
}

interface ChatResponse {
  _id: string;
  resourceId?: string;
  _userId?: string;
  _organizationId?: string;
  _environmentId?: string;
}

type WorkflowResponse = {
  _id: string;
  workflowId: string;
  name: string;
  tags?: string[];
  preferences?: { user?: { all?: { readOnly?: boolean } } | null };
  payloadSchema?: { properties?: Record<string, unknown>; required?: string[] } | null;
  steps: { stepId: string; type: string; name: string; controlValues?: Record<string, unknown> | null }[];
};

async function request<T>(method: string, path: string, body?: unknown, authorization?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: headers(authorization),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${method} ${path} → ${response.status}: ${text.slice(0, 500)}`);
  }

  const json = text ? JSON.parse(text) : {};

  return (json.data ?? json) as T;
}

const base64UrlJson = (value: Record<string, unknown>) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** An `Internal <jwt>` authorization, minted like ee-ai's `internal-token.ts`: HS256 over the shared secret. */
function internalAuthorization({ userId, organizationId, environmentId }: ChatIdentity): string {
  if (API_KEY_READ_REASON || !INTERNAL_AUTH_SECRET) throw new Error(`no Internal token: ${API_KEY_READ_REASON}`);

  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: 'HS256', typ: 'JWT' });
  const payload = base64UrlJson({
    sub: userId,
    organizationId,
    environmentId,
    aud: INTERNAL_AUTH_AUDIENCE,
    iat: now,
    exp: now + INTERNAL_AUTH_TOKEN_TTL_SECONDS,
  });
  const signature = createHmac('sha256', INTERNAL_AUTH_SECRET).update(`${header}.${payload}`).digest('base64url');

  return `Internal ${header}.${payload}.${signature}`;
}

export async function createChat(): Promise<{ _id: string }> {
  return request('POST', '/v2/ai/chat', { resourceType: 'workflow' });
}

export async function getChat(chatId: string): Promise<Chat> {
  const { _id, resourceId, _userId, _organizationId, _environmentId } = await request<ChatResponse>(
    'GET',
    `/v2/ai/chat/${chatId}`
  );
  const identity =
    _userId && _organizationId && _environmentId
      ? { userId: _userId, organizationId: _organizationId, environmentId: _environmentId }
      : undefined;

  return { _id, resourceId, identity };
}

function summarizeWorkflow(workflow: WorkflowResponse): WorkflowSummary {
  return {
    id: workflow._id,
    workflowId: workflow.workflowId,
    name: workflow.name,
    tags: workflow.tags ?? [],
    critical: workflow.preferences?.user?.all?.readOnly === true,
    payloadKeys: Object.keys(workflow.payloadSchema?.properties ?? {}),
    payloadRequired: workflow.payloadSchema?.required ?? [],
    steps: workflow.steps.map((step) => ({
      stepId: step.stepId,
      type: step.type,
      name: step.name,
      controlValues: step.controlValues ?? {},
    })),
  };
}

/**
 * Reads as the chat's member with an Internal token when it can, because the API answers ApiKey reads' preferences
 * (`critical`) from a 60 s in-memory cache. Otherwise reads with the API key and says why in `apiKeyReadReason`.
 */
export async function getWorkflow(id: string, identity?: ChatIdentity): Promise<WorkflowSummary> {
  const path = `/v2/workflows/${encodeURIComponent(id)}`;
  const readWithApiKey = async (apiKeyReadReason: string): Promise<WorkflowSummary> => ({
    ...summarizeWorkflow(await request<WorkflowResponse>('GET', path)),
    apiKeyReadReason,
  });

  if (API_KEY_READ_REASON) return readWithApiKey(API_KEY_READ_REASON);
  if (!identity) return readWithApiKey('the chat has no user, organization or environment id');

  try {
    return summarizeWorkflow(await request<WorkflowResponse>('GET', path, undefined, internalAuthorization(identity)));
  } catch (error) {
    return readWithApiKey(`the Internal read failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function deleteWorkflow(id: string): Promise<void> {
  await request('DELETE', `/v2/workflows/${encodeURIComponent(id)}`);
}

/** A text part holding one JSON object: the input guard's or the tool router's output, which the dashboard hides. */
function isJsonObject(text: string): boolean {
  try {
    const value: unknown = JSON.parse(text);

    return typeof value === 'object' && value !== null && !Array.isArray(value);
  } catch {
    return false;
  }
}

/**
 * Sends one user message the way the dashboard does and reads the AI SDK UI message stream
 * (SSE `data: {...}` chunks) until it ends. `stepId` focuses that step, as the dashboard does while its editor is open.
 */
export async function sendTurn(chatId: string, text: string, stepId?: string): Promise<TurnResult> {
  const response = await fetch(`${API_URL}/v2/ai/chat-stream`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      id: chatId,
      agentType: 'generate-workflow',
      message: {
        id: randomUUID(),
        role: 'user',
        parts: [{ type: 'text', text }],
        metadata: stepId ? { stepId } : undefined,
      },
    }),
    signal: AbortSignal.timeout(TURN_TIMEOUT_MS),
  });

  if (!response.ok || !response.body) {
    throw new Error(`POST /v2/ai/chat-stream → ${response.status}: ${(await response.text()).slice(0, 500)}`);
  }

  /** Text by part id: every LLM call's output streams as its own part, in the order the parts started. */
  const textParts = new Map<string, string>();
  let streamError: string | undefined;
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
      case 'text-start':
        if (!textParts.has(chunk.id)) textParts.set(chunk.id, '');
        break;
      case 'text-delta':
        textParts.set(chunk.id, (textParts.get(chunk.id) ?? '') + (chunk.delta ?? ''));
        break;
      case 'tool-input-available':
        Object.assign(call(), { toolName: chunk.toolName, input: chunk.input });
        break;
      case 'tool-output-error':
        call().error = chunk.errorText ?? 'tool error';
        break;
      case 'error':
        streamError = chunk.errorText ?? 'stream error';
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

  const parts = [...textParts.values()].filter((part) => part.trim());
  const droppedText = parts.filter(isJsonObject);

  return {
    text: parts.filter((part) => !isJsonObject(part)).join('\n\n'),
    droppedText: droppedText.length ? droppedText : undefined,
    toolCalls: [...toolCalls.values()],
    streamError,
  };
}
