/**
 * Pure mapping between the Novu chat-SDK world (post / edit / typing keyed by thread = A2A contextId,
 * plus the sink's end-of-turn signal) and A2A v0.3 stream events with text parts.
 * Wire shapes were verified against Gemini Enterprise (NV-8870 / NV-8873).
 */

export type A2aTextPart = { kind: 'text'; text: string };

export type GeInbound = { contextId: string | null; messageId?: string; text: string };

const CONTEXT_ID_PATTERN = /^[\w-]{1,128}$/;

type InboundPart = { kind?: unknown; text?: unknown } | null;

type InboundParams = {
  message?: { contextId?: string; messageId?: string; parts?: InboundPart[] };
};

/** First turn has no contextId; later turns echo the one the agent returned. */
export function parseInbound(params: InboundParams | undefined): GeInbound {
  const message = params?.message ?? {};
  const parts = Array.isArray(message.parts) ? message.parts : [];
  // Flows into Redis keys and the subscriber id; anything else starts a new context.
  const contextId =
    typeof message.contextId === 'string' && CONTEXT_ID_PATTERN.test(message.contextId) ? message.contextId : null;
  const messageId =
    typeof message.messageId === 'string' && CONTEXT_ID_PATTERN.test(message.messageId) ? message.messageId : undefined;
  const text = parts
    .flatMap((p) => (p?.kind === 'text' && typeof p.text === 'string' ? [p.text] : []))
    .join('\n')
    .trim();

  return { contextId, messageId, text };
}

// ---------------------------------------------------------------------------
// One held stream = one turn. Reducer: (turn, input) -> { turn, events, close }
// ---------------------------------------------------------------------------

export type GeTurnInput =
  | { type: 'start' }
  | { type: 'post' | 'edit'; messageId: string; text: string }
  | { type: 'typing'; status?: string }
  | { type: 'end' }
  | { type: 'deadline' }
  | { type: 'superseded' };

export type GeTurn = {
  taskId: string;
  contextId: string;
  closed: boolean;
  closedBy?: 'end' | 'deadline' | 'superseded';
  texts: Array<{ messageId: string; text: string }>;
  dropped: number;
  statusSeq: number;
};

export type A2aStreamEvent = Record<string, unknown> & { kind: 'task' | 'status-update' };

export type GeStepResult = { turn: GeTurn; events: A2aStreamEvent[]; close: boolean };

export const DEADLINE_TEXT =
  'This is taking longer than Gemini Enterprise lets a reply stay open. Ask me again in a few minutes and I will pick it up.';
export const SUPERSEDED_TEXT = '(Stopped: you sent a newer message.)';
export const NO_REPLY_TEXT = '(The agent finished without replying.)';

export function openTurn({ taskId, contextId }: { taskId: string; contextId: string }): GeTurn {
  return { taskId, contextId, closed: false, texts: [], dropped: 0, statusSeq: 0 };
}

const textPart = (text: string): A2aTextPart => ({ kind: 'text', text });

export function step(current: GeTurn, input: GeTurnInput): GeStepResult {
  if (current.closed) {
    return { turn: { ...current, dropped: current.dropped + 1 }, events: [], close: false };
  }

  const { taskId, contextId } = current;
  const seq = current.statusSeq + 1;
  const turn: GeTurn = { ...current, statusSeq: seq };
  const status = (state: string, message?: A2aTextPart[], final = false): A2aStreamEvent => ({
    kind: 'status-update',
    taskId,
    contextId,
    status: {
      state,
      ...(message
        ? {
            message: {
              kind: 'message',
              role: 'agent',
              messageId: `${taskId}-status-${seq}`,
              taskId,
              contextId,
              parts: message,
            },
          }
        : {}),
    },
    final,
  });

  switch (input.type) {
    case 'start':
      return {
        turn,
        events: [{ kind: 'task', id: taskId, contextId, status: { state: 'submitted' } }, status('working')],
        close: false,
      };

    case 'typing':
      // Renders in GE as a status / thought line, not as the answer.
      return { turn, events: input.status ? [status('working', [textPart(input.status)])] : [], close: false };

    case 'post':
    case 'edit': {
      // GE appends every artifact-update to the answer, so text can't be edited once sent. Hold the
      // latest version of each message, show it as the status line meanwhile, send it once at the end.
      const { messageId, text } = input;
      const exists = turn.texts.some((t) => t.messageId === messageId);
      const texts = exists
        ? turn.texts.map((t) => (t.messageId === messageId ? { ...t, text } : t))
        : [...turn.texts, { messageId, text }];

      return { turn: { ...turn, texts }, events: [status('working', [textPart(text)])], close: false };
    }

    case 'end':
    case 'deadline':
    case 'superseded': {
      const parts = turn.texts.map((t) => textPart(t.text));
      if (input.type === 'deadline') parts.push(textPart(DEADLINE_TEXT));
      if (input.type === 'superseded') parts.push(textPart(SUPERSEDED_TEXT));
      if (!parts.length) parts.push(textPart(NO_REPLY_TEXT));

      // Always `completed`: Novu already posts a user-facing error text on run-error / bridge failure,
      // and `completed` is the only terminal state whose rendering and follow-up turn are verified.
      return {
        turn: { ...turn, closed: true, closedBy: input.type },
        events: [status('completed', parts, true)],
        close: true,
      };
    }

    default:
      return { turn, events: [], close: false };
  }
}

export function agentCard({ url, name, description }: { url: string; name: string; description: string }) {
  return {
    protocolVersion: '0.3.0',
    name,
    description,
    url,
    preferredTransport: 'JSONRPC',
    version: '0.1.0',
    capabilities: { streaming: true, pushNotifications: false },
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain'],
    skills: [{ id: 'chat', name: 'Chat', description, tags: ['novu'] }],
  };
}
