import { Injectable } from '@nestjs/common';
import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEvent, type AgentEventEnvelope } from '@novu/agent-event-protocol';
import { shortId } from '@novu/application-generic';

type WebChatFactoryBaseInput = {
  conversationId: string;
  conversationIdentifier: string;
  agentId: string;
  sequence: number;
  runId?: string;
  turnId?: string;
  timestamp?: string;
};

export type WebChatFactoryMessageInput = WebChatFactoryBaseInput & {
  platformMessageId: string;
  content: { markdown: string };
};

export type WebChatFactoryEditInput = WebChatFactoryBaseInput & {
  platformMessageId: string;
  content: { markdown: string };
};

export type WebChatFactoryDeleteInput = WebChatFactoryBaseInput & {
  platformMessageId: string;
};

export type WebChatFactoryTypingInput = WebChatFactoryBaseInput & {
  state: 'on' | 'off';
  status?: string;
};

/**
 * Nest-owned factory for live web-chat envelopes. Run/turn ids are synthetic
 * (`web_*` / `turn_*`) — clients correlate live vs history by
 * `messageId` + `sequence`, not by run identity.
 */
@Injectable()
export class WebChatEventFactory {
  createMessageEnvelope(input: WebChatFactoryMessageInput): AgentEventEnvelope {
    return this.build(input, {
      type: 'message',
      role: 'assistant',
      messageId: input.platformMessageId,
      content: input.content,
    });
  }

  createEditEnvelope(input: WebChatFactoryEditInput): AgentEventEnvelope {
    return this.build(input, {
      type: 'channel.edit',
      messageId: input.platformMessageId,
      content: input.content,
    });
  }

  createDeleteEnvelope(input: WebChatFactoryDeleteInput): AgentEventEnvelope {
    return this.build(input, {
      type: 'channel.delete',
      messageId: input.platformMessageId,
    });
  }

  createTypingEnvelope(input: WebChatFactoryTypingInput): AgentEventEnvelope {
    return this.build(input, {
      type: 'channel.typing',
      state: input.state,
      ...(input.status !== undefined ? { status: input.status } : {}),
    });
  }

  private build(input: WebChatFactoryBaseInput, event: AgentEvent): AgentEventEnvelope {
    return {
      version: AGENT_EVENT_PROTOCOL_VERSION,
      conversationId: input.conversationId,
      conversationIdentifier: input.conversationIdentifier,
      agentId: input.agentId,
      runId: input.runId ?? `web_${shortId(12)}`,
      turnId: input.turnId ?? `turn_${shortId(12)}`,
      sequence: input.sequence,
      timestamp: input.timestamp ?? new Date().toISOString(),
      event,
    };
  }
}
