import { randomUUID } from 'node:crypto';
import {
  AGENT_EVENT_PROTOCOL_VERSION,
  type AgentEvent,
  type AgentEventEnvelope,
  type AgentFinishReason,
  type AgentToolSource,
} from '@novu/shared';
import type { ActionRequired, Response, StreamPart } from '@novu/thalamus';

interface RunEventBuilderIds {
  conversationId: string;
  agentId: string;
  turnId: string;
  runId: string;
}

export function mapStreamPart(part: StreamPart): AgentEvent[] {
  switch (part.type) {
    case 'stream-start':
      return [{ type: 'run-start' }];

    case 'message':
      return [
        {
          type: 'message',
          messageId: randomUUID(),
          content: { markdown: part.text },
        },
      ];

    case 'text-delta':
      return [];

    case 'thinking':
      return mapThinkingEvents(part.text);

    case 'refusal':
      return [
        {
          type: 'message',
          messageId: randomUUID(),
          content: { markdown: part.text },
        },
      ];

    case 'tool-use-start':
      return [
        {
          type: 'tool-use-start',
          toolUseId: part.toolUseId,
          toolName: part.toolName,
          source: part.source,
        },
      ];

    case 'tool-use-delta':
      return [
        {
          type: 'tool-use-delta',
          toolUseId: part.toolUseId,
          delta: part.argumentsDelta,
        },
      ];

    case 'tool-use-done':
      return [
        {
          type: 'tool-use-done',
          toolUseId: part.toolUseId,
          toolName: part.toolName,
          input: part.input,
          source: part.source,
        },
      ];

    case 'tool-use-result':
      return [
        {
          type: 'tool-use-result',
          toolUseId: part.toolUseId,
          content: part.content,
          isError: part.isError,
        },
      ];

    case 'step-start':
      return [{ type: 'step-start', index: part.stepIndex }];

    case 'step-done':
      return [{ type: 'step-end', index: part.stepIndex }];

    case 'finish':
      return mapFinishEvents(part.response);

    case 'error':
      return mapErrorEvents(part.error);

    case 'status-change':
    case 'mcp-tools-discovered':
      return [];

    case 'mcp-server-failure':
      return [
        {
          type: 'connection.error',
          source: 'mcp',
          serverName: part.serverName,
          reason: part.reason,
          message: part.message,
        },
      ];

    case 'provider-event':
      return [
        {
          type: 'custom',
          name: `provider.${part.provider}.${part.event}`,
          data: part.data,
        },
      ];

    default: {
      const _exhaustive: never = part;

      return [];
    }
  }
}

export class RunEventBuilder {
  private sequence = 0;

  constructor(private readonly ids: RunEventBuilderIds) {}

  wrap(events: AgentEvent[]): AgentEventEnvelope[] {
    return events.map((event) => {
      this.sequence += 1;

      return {
        version: AGENT_EVENT_PROTOCOL_VERSION,
        conversationId: this.ids.conversationId,
        agentId: this.ids.agentId,
        runId: this.ids.runId,
        turnId: this.ids.turnId,
        sequence: this.sequence,
        timestamp: new Date().toISOString(),
        event,
      };
    });
  }
}

function mapThinkingEvents(text: string): AgentEvent[] {
  const thinkingId = randomUUID();
  const events: AgentEvent[] = [{ type: 'thinking-start', thinkingId }];

  if (text !== '') {
    events.push({ type: 'thinking-delta', thinkingId, delta: text });
  }

  events.push({ type: 'thinking-end', thinkingId });

  return events;
}

function mapActionRequired(action: ActionRequired): AgentEvent {
  const source: AgentToolSource =
    action.type === 'mcp-approval' ? { type: 'mcp', serverName: action.serverName } : { type: 'custom' };

  return {
    type: 'tool-approval-request',
    approvalId: action.toolUseId,
    toolUseId: action.toolUseId,
    toolName: action.toolName,
    input: action.input,
    source,
  };
}

function mapFinishReason(finishReason: Response['finishReason']): AgentFinishReason | undefined {
  switch (finishReason) {
    case 'stop':
      return 'stop';
    case 'length':
      return 'length';
    case 'refused':
      return 'refused';
    case 'requires-action':
      return undefined;
    case 'error':
    case 'other':
      return 'other';
    default: {
      const _exhaustive: never = finishReason;

      return undefined;
    }
  }
}

function mapFinishEvents(response: Response): AgentEvent[] {
  const events: AgentEvent[] = [];

  for (const action of response.actionsRequired ?? []) {
    events.push(mapActionRequired(action));
  }

  const outcome = response.finishReason === 'requires-action' ? 'paused' : 'completed';
  const finishReason = mapFinishReason(response.finishReason);
  const runFinish: AgentEvent = {
    type: 'run-finish',
    outcome,
    ...(finishReason !== undefined ? { finishReason } : {}),
    ...(response.usage !== undefined ? { usage: response.usage } : {}),
  };

  events.push(runFinish);

  return events;
}

function mapErrorEvents(error: Error): AgentEvent[] {
  const code = (error as { code?: string }).code;

  return [
    {
      type: 'run-error',
      message: error.message,
      ...(code !== undefined ? { code } : {}),
    },
  ];
}
