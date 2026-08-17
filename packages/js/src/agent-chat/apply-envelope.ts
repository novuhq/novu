/**
 * Folds `AgentEventEnvelope` streams into a parts-based `AgentMessage[]` timeline.
 * Runs on clients only (live WS + durable history); the server append-only stores envelopes.
 */
import type { AgentEventEnvelope, AgentFileRef, AgentMessageContent } from '@novu/agent-event-protocol';
import type {
  AgentConversationState,
  AgentMessage,
  AgentMessagePart,
  AgentMessageRole,
  AgentTextPart,
  AgentThinkingPart,
  AgentToolPart,
} from './agent-message.types';
import { createInitialAgentConversationState } from './agent-message.types';

export function applyEnvelopes(
  initialState: AgentConversationState = createInitialAgentConversationState(),
  envelopes: AgentEventEnvelope[]
): AgentConversationState {
  return envelopes.reduce((state, envelope) => applyEnvelope(state, envelope), initialState);
}

export function applyEnvelope(state: AgentConversationState, envelope: AgentEventEnvelope): AgentConversationState {
  const next: AgentConversationState = {
    ...state,
    lastSequence: Math.max(state.lastSequence, envelope.sequence),
  };

  return applyEvent(next, envelope);
}

function applyEvent(state: AgentConversationState, envelope: AgentEventEnvelope): AgentConversationState {
  const { event } = envelope;

  switch (event.type) {
    case 'run-start':
      return { ...state, isRunning: true };

    case 'run-finish':
      return finalizeOpenStreamingParts({
        ...state,
        isRunning: false,
        activeAssistantMessageId: undefined,
      });

    case 'run-error':
      return finalizeOpenStreamingParts({
        ...state,
        isRunning: false,
        activeAssistantMessageId: undefined,
        error: { message: event.message, code: event.code },
      });

    case 'resolve':
      return { ...state, status: 'resolved' };

    case 'message-start':
      return clearTyping(
        withAssistantMessage(state, envelope, event.messageId, (message) => ({
          ...message,
          parts: [...message.parts, createStreamingTextPart('')],
        }))
      );

    case 'message-delta':
      return withAssistantMessage(state, envelope, event.messageId, (message) => ({
        ...message,
        parts: appendToStreamingTextPart(message.parts, event.delta),
      }));

    case 'message-end':
      return withAssistantMessage(state, envelope, event.messageId, (message) => ({
        ...message,
        parts: finalizeMessageEndParts(message.parts, event.content, event.files),
      }));

    case 'message': {
      const next = withMessage(state, envelope, event.messageId, event.role, (message) => ({
        ...message,
        parts: applyDurableMessageParts(message.parts, event.content, event.files),
        status: 'sent',
      }));

      if (event.role === 'assistant') {
        return clearTyping(next);
      }

      return next;
    }

    case 'thinking-start':
      return withActiveAssistantMessage(state, envelope, (message) => ({
        ...message,
        parts: [...message.parts, createStreamingThinkingPart(event.thinkingId)],
      }));

    case 'thinking-delta':
      return withActiveAssistantMessage(state, envelope, (message) => ({
        ...message,
        parts: appendToThinkingPart(message.parts, event.thinkingId, event.delta),
      }));

    case 'thinking-end':
      return withActiveAssistantMessage(state, envelope, (message) => ({
        ...message,
        parts: finalizeThinkingPart(message.parts, event.thinkingId),
      }));

    case 'tool-use-start':
      return withActiveAssistantMessage(state, envelope, (message) => ({
        ...message,
        parts: [...message.parts, createStreamingToolPart(event.toolUseId, event.toolName, event.source)],
      }));

    case 'tool-use-delta':
      return withActiveAssistantMessage(state, envelope, (message) => ({
        ...message,
        parts: appendToToolInputDelta(message.parts, event.toolUseId, event.delta),
      }));

    case 'tool-use-done':
      return withActiveAssistantMessage(state, envelope, (message) => ({
        ...message,
        parts: finalizeToolInput(message.parts, event.toolUseId, event.toolName, event.input, event.source),
      }));

    case 'tool-use-result':
      return withActiveAssistantMessage(state, envelope, (message) => ({
        ...message,
        parts: applyToolResult(message.parts, event.toolUseId, event.content, event.isError),
      }));

    case 'tool-approval-request': {
      const addApproval = (message: AgentMessage): AgentMessage => ({
        ...message,
        parts: [
          ...message.parts,
          {
            type: 'approval',
            approvalId: event.approvalId,
            toolUseId: event.toolUseId,
            toolName: event.toolName,
            input: event.input,
            source: event.source,
            approveActionId: event.approveActionId,
            denyActionId: event.denyActionId,
            state: 'pending',
          },
        ],
      });
      const nextState = event.messageId
        ? withAssistantMessage(state, envelope, event.messageId, addApproval)
        : withActiveAssistantMessage(state, envelope, addApproval);

      return clearTyping(nextState);
    }

    case 'tool-approval-response':
      return applyApprovalResponse(state, event.approvalId, event.decision);

    case 'mcp-connection-request':
      return clearTyping(
        withActiveAssistantMessage(state, envelope, (message) => ({
          ...message,
          parts: [
            ...message.parts,
            {
              type: 'mcp-connection',
              actionId: event.actionId,
              mcpId: event.mcpId,
              displayName: event.displayName,
              authorizeUrl: event.authorizeUrl,
              authorizeUrlWithAutoApprove: event.authorizeUrlWithAutoApprove,
              state: 'pending',
            },
          ],
        }))
      );

    case 'mcp-connection-result':
      return applyMcpConnectionResult(state, event.actionId, event.status, event.message);

    case 'source':
      return withAssistantMessage(state, envelope, event.messageId, (message) => ({
        ...message,
        parts: [
          ...message.parts,
          {
            type: 'source',
            sourceType: event.sourceType,
            url: event.url,
            title: event.title,
            filename: event.filename,
          },
        ],
      }));

    case 'channel.edit':
      return editMessage(state, envelope.timestamp, event.messageId, event.content, event.files);

    case 'channel.delete':
      return {
        ...state,
        messages: state.messages.filter((message) => message.id !== event.messageId),
      };

    case 'channel.typing':
      if (event.state === 'on') {
        const status = event.status?.trim();

        return {
          ...state,
          typing: status ? { status } : {},
        };
      }

      return clearTyping(state);

    case 'step-start':
    case 'step-end':
    case 'channel.reaction':
    case 'connection.error':
    case 'signal':
    case 'custom':
      return state;

    default:
      return state;
  }
}

function withMessage(
  state: AgentConversationState,
  envelope: AgentEventEnvelope,
  messageId: string,
  role: AgentMessageRole,
  update: (message: AgentMessage) => AgentMessage
): AgentConversationState {
  const { messages, index } = ensureMessage(state, envelope, messageId, role);
  const existing = messages[index];
  if (!existing) {
    return state;
  }
  const nextMessages = messages.slice();
  nextMessages[index] = update(existing);

  return {
    ...state,
    messages: nextMessages,
    ...(role === 'assistant' ? { activeAssistantMessageId: messageId } : {}),
  };
}

function withAssistantMessage(
  state: AgentConversationState,
  envelope: AgentEventEnvelope,
  messageId: string,
  update: (message: AgentMessage) => AgentMessage
): AgentConversationState {
  return withMessage(state, envelope, messageId, 'assistant', update);
}

function withActiveAssistantMessage(
  state: AgentConversationState,
  envelope: AgentEventEnvelope,
  update: (message: AgentMessage) => AgentMessage
): AgentConversationState {
  const messageId = state.activeAssistantMessageId ?? envelope.runId;

  return withMessage(state, envelope, messageId, 'assistant', update);
}

function ensureMessage(
  state: AgentConversationState,
  envelope: AgentEventEnvelope,
  messageId: string,
  role: AgentMessageRole
): { messages: AgentMessage[]; index: number } {
  const existingIndex = state.messages.findIndex((message) => message.id === messageId && message.role === role);

  if (existingIndex >= 0) {
    return { messages: state.messages, index: existingIndex };
  }

  const message: AgentMessage = {
    id: messageId,
    role,
    parts: [],
    createdAt: envelope.timestamp,
    status: 'sent',
  };

  return { messages: [...state.messages, message], index: state.messages.length };
}

function createStreamingTextPart(text: string): AgentTextPart {
  return { type: 'text', text, state: 'streaming' };
}

function createStreamingThinkingPart(thinkingId: string): AgentThinkingPart {
  return { type: 'thinking', thinkingId, text: '', state: 'streaming' };
}

function createStreamingToolPart(toolUseId: string, toolName: string, source: AgentToolPart['source']): AgentToolPart {
  return {
    type: 'tool',
    toolUseId,
    toolName,
    source,
    state: 'input-streaming',
  };
}

function findStreamingTextPartIndex(parts: AgentMessagePart[]): number {
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index];
    if (part?.type === 'text' && part.state === 'streaming') {
      return index;
    }
  }

  return -1;
}

function appendToStreamingTextPart(parts: AgentMessagePart[], delta: string): AgentMessagePart[] {
  const index = findStreamingTextPartIndex(parts);

  if (index < 0) {
    return [...parts, createStreamingTextPart(delta)];
  }

  const next = parts.slice();
  const part = next[index] as AgentTextPart;
  next[index] = { ...part, text: part.text + delta };

  return next;
}

function applyDurableMessageParts(
  parts: AgentMessagePart[],
  content: AgentMessageContent,
  files?: AgentFileRef[]
): AgentMessagePart[] {
  let next = parts.slice();
  const streamingIndex = findStreamingTextPartIndex(next);

  if ('markdown' in content) {
    if (streamingIndex >= 0) {
      next[streamingIndex] = { type: 'text', text: content.markdown, state: 'done' };
    } else {
      next = [...next, { type: 'text', text: content.markdown, state: 'done' }];
    }
  } else {
    next = [...next, { type: 'card', card: content.card }];
  }

  return appendFileParts(next, files);
}

function finalizeMessageEndParts(
  parts: AgentMessagePart[],
  content?: AgentMessageContent,
  files?: AgentFileRef[]
): AgentMessagePart[] {
  let next = parts.slice();
  const streamingIndex = findStreamingTextPartIndex(next);

  if (content) {
    next = applyDurableMessageParts(next, content, files);

    return next;
  }

  if (streamingIndex >= 0) {
    const part = next[streamingIndex] as AgentTextPart;
    next[streamingIndex] = { ...part, state: 'done' };
  }

  return appendFileParts(next, files);
}

function appendFileParts(parts: AgentMessagePart[], files?: AgentFileRef[]): AgentMessagePart[] {
  if (!files?.length) {
    return parts;
  }

  return [
    ...parts,
    ...files.map((file) => ({
      type: 'file' as const,
      fileId: file.fileId,
      name: file.name,
      mediaType: file.mediaType,
    })),
  ];
}

function findThinkingPartIndex(parts: AgentMessagePart[], thinkingId: string): number {
  return parts.findIndex((part) => part.type === 'thinking' && part.thinkingId === thinkingId);
}

function appendToThinkingPart(parts: AgentMessagePart[], thinkingId: string, delta: string): AgentMessagePart[] {
  const index = findThinkingPartIndex(parts, thinkingId);

  if (index < 0) {
    return [...parts, { type: 'thinking', thinkingId, text: delta, state: 'streaming' }];
  }

  const next = parts.slice();
  const part = next[index] as AgentThinkingPart;
  next[index] = { ...part, text: part.text + delta };

  return next;
}

function finalizeThinkingPart(parts: AgentMessagePart[], thinkingId: string): AgentMessagePart[] {
  const index = findThinkingPartIndex(parts, thinkingId);

  if (index < 0) {
    return parts;
  }

  const next = parts.slice();
  const part = next[index] as AgentThinkingPart;
  next[index] = { ...part, state: 'done' };

  return next;
}

function findToolPartIndex(parts: AgentMessagePart[], toolUseId: string): number {
  return parts.findIndex((part) => part.type === 'tool' && part.toolUseId === toolUseId);
}

function getToolInputStream(input: AgentToolPart['input']): string {
  if (typeof input !== 'object' || input === null) {
    return '';
  }

  const stream = input.__stream;
  if (typeof stream === 'string') {
    return stream;
  }

  return JSON.stringify(input);
}

function appendToToolInputDelta(parts: AgentMessagePart[], toolUseId: string, delta: string): AgentMessagePart[] {
  const index = findToolPartIndex(parts, toolUseId);

  if (index < 0) {
    return parts;
  }

  const next = parts.slice();
  const part = next[index] as AgentToolPart;
  const rawInput = getToolInputStream(part.input);
  const streamed = `${rawInput}${delta}`;
  let parsedInput: Record<string, unknown> | undefined;

  try {
    parsedInput = JSON.parse(streamed) as Record<string, unknown>;
  } catch {
    parsedInput = { __stream: streamed };
  }

  next[index] = { ...part, input: parsedInput };

  return next;
}

function finalizeToolInput(
  parts: AgentMessagePart[],
  toolUseId: string,
  toolName: string,
  input: Record<string, unknown> | undefined,
  source: AgentToolPart['source']
): AgentMessagePart[] {
  const index = findToolPartIndex(parts, toolUseId);
  const nextPart: AgentToolPart = {
    type: 'tool',
    toolUseId,
    toolName,
    source,
    input,
    state: 'input-available',
  };

  if (index < 0) {
    return [...parts, nextPart];
  }

  const next = parts.slice();
  const existing = next[index] as AgentToolPart;
  next[index] = { ...existing, ...nextPart };

  return next;
}

function applyToolResult(
  parts: AgentMessagePart[],
  toolUseId: string,
  content: AgentToolPart['output'],
  isError?: boolean
): AgentMessagePart[] {
  const index = findToolPartIndex(parts, toolUseId);

  if (index < 0) {
    return parts;
  }

  const next = parts.slice();
  const part = next[index] as AgentToolPart;
  next[index] = {
    ...part,
    output: content,
    state: isError ? 'output-error' : 'output-available',
  };

  return next;
}

function applyApprovalResponse(
  state: AgentConversationState,
  approvalId: string,
  decision: 'approved' | 'denied'
): AgentConversationState {
  const nextState = decision === 'approved' ? 'approved' : 'denied';

  return {
    ...state,
    messages: state.messages.map((message) => ({
      ...message,
      parts: message.parts.map((part) =>
        part.type === 'approval' && part.approvalId === approvalId ? { ...part, state: nextState } : part
      ),
    })),
  };
}

function applyMcpConnectionResult(
  state: AgentConversationState,
  actionId: string,
  status: 'connected' | 'failed',
  message?: string
): AgentConversationState {
  return {
    ...state,
    messages: state.messages.map((item) => ({
      ...item,
      parts: item.parts.map((part) =>
        part.type === 'mcp-connection' && part.actionId === actionId ? { ...part, state: status, message } : part
      ),
    })),
  };
}

function editMessage(
  state: AgentConversationState,
  timestamp: string,
  messageId: string,
  content: AgentMessageContent,
  files?: AgentFileRef[]
): AgentConversationState {
  const index = state.messages.findIndex((message) => message.id === messageId);

  if (index < 0) {
    return state;
  }

  const existing = state.messages[index];
  if (!existing) {
    return state;
  }

  const edited: AgentMessage = {
    ...existing,
    createdAt: timestamp,
    parts: applyDurableMessageParts([], content, files),
  };

  const nextMessages = state.messages.slice();
  nextMessages[index] = edited;

  return { ...state, messages: nextMessages };
}

/**
 * Clears ephemeral typing. Call sites are intentional and small:
 * - `channel.typing` state `off`
 * - assistant `message-start` / durable assistant `message` (content replaced waiting)
 * - `tool-approval-request` (human input replaced waiting)
 * Do not clear on `run-finish` / `run-error` here — that lifecycle stays separate.
 */
function clearTyping(state: AgentConversationState): AgentConversationState {
  if (state.typing === undefined) {
    return state;
  }

  return {
    ...state,
    typing: undefined,
  };
}

function finalizeOpenStreamingParts(state: AgentConversationState): AgentConversationState {
  return {
    ...state,
    messages: state.messages.map((message) => ({
      ...message,
      parts: message.parts.map((part) => {
        if (part.type === 'text' && part.state === 'streaming') {
          return { ...part, state: 'done' as const };
        }

        if (part.type === 'thinking' && part.state === 'streaming') {
          return { ...part, state: 'done' as const };
        }

        return part;
      }),
    })),
  };
}

export function appendUserMessage(
  state: AgentConversationState,
  message: Pick<AgentMessage, 'id' | 'parts' | 'createdAt' | 'status'> & Partial<Pick<AgentMessage, 'role'>>
): AgentConversationState {
  const role: AgentMessageRole = message.role ?? 'user';

  return {
    ...state,
    messages: [
      ...state.messages,
      {
        id: message.id,
        role,
        parts: message.parts,
        createdAt: message.createdAt,
        status: message.status,
      },
    ],
  };
}
