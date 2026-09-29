import type { ButtonElement, CardChild, CardElement, LinkButtonElement } from 'chat';

/**
 * Pure mapping between the Novu chat-SDK world (post / edit / typing keyed by thread = A2A contextId,
 * plus the sink's end-of-turn signal) and A2A v0.3 stream events with A2UI v0.9 parts.
 * Wire shapes were verified against Gemini Enterprise (NV-8870 / NV-8873).
 */

export const A2UI_MIME = 'application/json+a2ui';
export const A2UI_V09_EXTENSION = 'https://a2ui.org/a2a-extension/a2ui/v0.9';
export const GE_CATALOG_V09 =
  'https://www.gstatic.com/vertexaisearch/a2ui/v0_9/gemini_enterprise_composite_catalog.json';
/** Every Novu card button uses this A2UI event name; the Novu action id rides in `context`. */
export const NOVU_ACTION_EVENT = 'novu_action';

const SURFACE_PREFIX = 'novu-';

export const surfaceIdFor = (messageId: string) => `${SURFACE_PREFIX}${messageId}`;

function messageIdFromSurface(surfaceId: unknown): string | undefined {
  return typeof surfaceId === 'string' && surfaceId.startsWith(SURFACE_PREFIX)
    ? surfaceId.slice(SURFACE_PREFIX.length)
    : undefined;
}

export type A2aTextPart = { kind: 'text'; text: string };
export type A2aDataPart = { kind: 'data'; metadata?: { mimeType?: string }; data: Record<string, unknown> };
export type A2aPart = A2aTextPart | A2aDataPart;

export type GeInbound =
  | { kind: 'message'; contextId: string | null; messageId?: string; text: string }
  | {
      kind: 'action';
      contextId: string | null;
      messageId?: string;
      action: { id: string; value?: string; sourceMessageId?: string };
    };

const CONTEXT_ID_PATTERN = /^[\w-]{1,128}$/;

type InboundActionContext = { actionId?: unknown; value?: unknown };
type InboundAction = { name?: unknown; surfaceId?: unknown; context?: unknown };
type InboundPart = { kind?: unknown; text?: unknown; metadata?: unknown; data?: unknown } | null;

type InboundParams = {
  message?: { contextId?: string; messageId?: string; parts?: InboundPart[] };
};

/**
 * First turn has no contextId; later turns echo the one the agent returned.
 * A card click is a new turn with the text "User action triggered." plus an A2UI DataPart.
 */
export function parseInbound(params: InboundParams | undefined): GeInbound {
  const message = params?.message ?? {};
  const parts = Array.isArray(message.parts) ? message.parts : [];
  // Flows into Redis keys and the subscriber id; anything else starts a new context.
  const contextId =
    typeof message.contextId === 'string' && CONTEXT_ID_PATTERN.test(message.contextId) ? message.contextId : null;
  const messageId =
    typeof message.messageId === 'string' && CONTEXT_ID_PATTERN.test(message.messageId) ? message.messageId : undefined;
  const action = parts.map(a2uiAction).find(Boolean);

  if (action) {
    return { kind: 'action', contextId, messageId, action: parseAction(action) };
  }

  const text = parts
    .flatMap((p) => (p?.kind === 'text' && typeof p.text === 'string' ? [p.text] : []))
    .join('\n')
    .trim();

  return { kind: 'message', contextId, messageId, text };
}

function a2uiAction(part: InboundPart): InboundAction | undefined {
  if (part?.kind !== 'data') return undefined;

  const { metadata, data } = part;
  const isA2ui =
    !!metadata && typeof metadata === 'object' && 'mimeType' in metadata && metadata.mimeType === A2UI_MIME;

  if (!isA2ui || !data || typeof data !== 'object' || !('action' in data)) return undefined;

  const { action } = data;

  return action && typeof action === 'object' ? action : undefined;
}

function parseAction({
  name,
  surfaceId,
  context: rawContext,
}: InboundAction): Extract<GeInbound, { kind: 'action' }>['action'] {
  const context: InboundActionContext = rawContext && typeof rawContext === 'object' ? rawContext : {};
  const sourceMessageId = messageIdFromSurface(surfaceId);
  const { actionId, value } = context;

  if (name === NOVU_ACTION_EVENT && typeof actionId === 'string') {
    return { id: actionId, value: value == null ? undefined : String(value), sourceMessageId };
  }

  return { id: String(name), value: JSON.stringify(context), sourceMessageId };
}

type A2uiComponent = Record<string, unknown> & { id: string; component: string };

/**
 * Two DataParts: createSurface + updateComponents. Only Card / Column / Text / Button are verified in
 * the GE catalog, so links, fields and link-buttons degrade to markdown Text.
 */
export function cardToA2uiParts(card: CardElement, messageId: string): [A2aDataPart, A2aDataPart] {
  const surfaceId = surfaceIdFor(messageId);
  const components: A2uiComponent[] = [{ id: 'root', component: 'Card', child: 'col' }];
  const column: string[] = [];
  let n = 0;

  const add = (component: A2uiComponent) => {
    components.push(component);
    column.push(component.id);
  };
  const addText = (value: string, variant?: string) => {
    if (value) add({ id: `t${n++}`, component: 'Text', text: value, ...(variant ? { variant } : {}) });
  };
  const addButton = (button: ButtonElement) => {
    const id = `b${n++}`;
    add({
      id,
      component: 'Button',
      child: `${id}-label`,
      ...(button.style === 'primary' ? { variant: 'primary' } : {}),
      action: {
        event: {
          name: NOVU_ACTION_EVENT,
          // A2UI context is free JSON: no 64-byte callback limit, so no action-token swap is needed.
          context: { actionId: button.id, ...(button.value !== undefined ? { value: button.value } : {}) },
        },
      },
    });
    components.push({ id: `${id}-label`, component: 'Text', text: button.label });
  };
  const visit = (child: CardChild) => {
    switch (child.type) {
      case 'text':
        addText(child.content.replace(/^\n+/, ''));
        break;
      case 'link':
        addText(`[${child.label}](${child.url})`);
        break;
      case 'fields':
        addText(child.children.map((field) => `**${field.label}:** ${field.value}`).join('\n'));
        break;
      case 'section':
        child.children.forEach(visit);
        break;
      case 'actions':
        for (const action of child.children) {
          if (action.type === 'button') addButton(action);
          if (action.type === 'link-button') addText(linkButtonMarkdown(action));
        }
        break;
      default:
        break;
    }
  };

  if (card.title) addText(card.title, 'h3');
  if (card.subtitle) addText(card.subtitle);
  card.children?.forEach(visit);

  components.splice(1, 0, { id: 'col', component: 'Column', children: column });

  const metadata = { mimeType: A2UI_MIME };

  return [
    { kind: 'data', metadata, data: { version: 'v0.9', createSurface: { surfaceId, catalogId: GE_CATALOG_V09 } } },
    { kind: 'data', metadata, data: { version: 'v0.9', updateComponents: { surfaceId, components } } },
  ];
}

function linkButtonMarkdown(button: LinkButtonElement): string {
  return `[${button.label}](${button.url})`;
}

// ---------------------------------------------------------------------------
// One held stream = one turn. Reducer: (turn, input) -> { turn, events, close }
// ---------------------------------------------------------------------------

export type GeContent = { text: string } | { card: CardElement };

export type GeTurnInput =
  | { type: 'start' }
  | { type: 'post' | 'edit'; messageId: string; content: GeContent }
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
  cards: Array<{ messageId: string; card: CardElement }>;
  cardUpdates: Array<{ messageId: string; card: CardElement }>;
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
  return { taskId, contextId, closed: false, texts: [], cards: [], cardUpdates: [], dropped: 0, statusSeq: 0 };
}

const textPart = (text: string): A2aTextPart => ({ kind: 'text', text });

export function step(current: GeTurn, input: GeTurnInput): GeStepResult {
  if (current.closed) {
    return { turn: { ...current, dropped: current.dropped + 1 }, events: [], close: false };
  }

  const { taskId, contextId } = current;
  const seq = current.statusSeq + 1;
  const turn: GeTurn = { ...current, statusSeq: seq };
  const status = (state: string, message?: A2aPart[], final = false): A2aStreamEvent => ({
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
    case 'edit':
      return applyContent(turn, input, status);

    case 'end':
    case 'deadline':
    case 'superseded':
      return closeTurn(turn, input.type, status);

    default:
      return { turn, events: [], close: false };
  }
}

type StatusEvent = (state: string, message?: A2aPart[], final?: boolean) => A2aStreamEvent;

function applyContent(
  turn: GeTurn,
  input: Extract<GeTurnInput, { type: 'post' | 'edit' }>,
  status: StatusEvent
): GeStepResult {
  if ('text' in input.content) {
    // GE appends every artifact-update to the answer, so text can't be edited once sent. Hold the
    // latest version of each message, show it as the status line meanwhile, send it once at the end.
    const { text } = input.content;
    const exists = turn.texts.some((t) => t.messageId === input.messageId);
    const texts = exists
      ? turn.texts.map((t) => (t.messageId === input.messageId ? { ...t, text } : t))
      : [...turn.texts, { messageId: input.messageId, text }];

    return { turn: { ...turn, texts }, events: [status('working', [textPart(text)])], close: false };
  }

  const { card } = input.content;
  const inTurn = turn.cards.some((c) => c.messageId === input.messageId);

  // Cards go out in the final status message: the only card placement verified in GE.
  if (input.type === 'post' || inTurn) {
    const cards = [...turn.cards.filter((c) => c.messageId !== input.messageId), { messageId: input.messageId, card }];

    return { turn: { ...turn, cards }, events: [], close: false };
  }

  // Edit of a card from an earlier turn (e.g. buttons stripped after a click): re-sent as
  // updateComponents on the old surfaceId; harmless if GE ignores it.
  return {
    turn: { ...turn, cardUpdates: [...turn.cardUpdates, { messageId: input.messageId, card }] },
    events: [],
    close: false,
  };
}

function closeTurn(turn: GeTurn, closedBy: NonNullable<GeTurn['closedBy']>, status: StatusEvent): GeStepResult {
  const parts: A2aPart[] = turn.texts.map((t) => textPart(t.text));

  if (closedBy === 'deadline') parts.push(textPart(DEADLINE_TEXT));
  if (closedBy === 'superseded') parts.push(textPart(SUPERSEDED_TEXT));

  for (const { messageId, card } of turn.cards) parts.push(...cardToA2uiParts(card, messageId));
  for (const { messageId, card } of turn.cardUpdates) parts.push(cardToA2uiParts(card, messageId)[1]);

  if (!parts.length) parts.push(textPart(NO_REPLY_TEXT));

  // Always `completed`: Novu already posts a user-facing error text on run-error / bridge failure,
  // and `completed` is the only terminal state whose rendering and follow-up turn are verified.
  return {
    turn: { ...turn, closed: true, closedBy },
    events: [status('completed', parts, true)],
    close: true,
  };
}

/** Agent card for the channel endpoint. Declaring A2UI v0.9 makes GE send a2uiClientCapabilities. */
export function agentCard({ url, name, description }: { url: string; name: string; description: string }) {
  return {
    protocolVersion: '0.3.0',
    name,
    description,
    url,
    preferredTransport: 'JSONRPC',
    version: '0.1.0',
    capabilities: {
      streaming: true,
      pushNotifications: false,
      extensions: [{ uri: A2UI_V09_EXTENSION, required: false, params: { supportedCatalogIds: [GE_CATALOG_V09] } }],
    },
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain', A2UI_MIME],
    skills: [{ id: 'chat', name: 'Chat', description, tags: ['novu'] }],
  };
}
