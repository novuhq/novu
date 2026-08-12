import { Injectable } from '@nestjs/common';
import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEvent, type AgentEventEnvelope } from '@novu/agent-event-protocol';
import { shortId } from '@novu/application-generic';

type AgentChatFactoryBaseInput = {
  conversationId: string;
  conversationIdentifier: string;
  agentId: string;
  sequence: number;
  runId?: string;
  turnId?: string;
  timestamp?: string;
};

export type AgentChatFactoryMessageInput = AgentChatFactoryBaseInput & {
  platformMessageId: string;
  content: { markdown: string };
};

export type AgentChatFactoryEditInput = AgentChatFactoryBaseInput & {
  platformMessageId: string;
  content: { markdown: string };
};

export type AgentChatFactoryDeleteInput = AgentChatFactoryBaseInput & {
  platformMessageId: string;
};

export type AgentChatFactoryTypingInput = AgentChatFactoryBaseInput & {
  state: 'on' | 'off';
  status?: string;
};

/**
 * Nest-owned factory for live agent-chat envelopes. Run/turn ids are synthetic
 * (`web_*` / `turn_*`) — clients correlate live vs history by
 * `messageId` + `sequence`, not by run identity.
 */
@Injectable()
export class AgentChatEventFactory {
  createMessageEnvelope(input: AgentChatFactoryMessageInput): AgentEventEnvelope {
    return this.build(input, {
      type: 'message',
      role: 'assistant',
      messageId: input.platformMessageId,
      content: input.content,
    });
  }

  createEditEnvelope(input: AgentChatFactoryEditInput): AgentEventEnvelope {
    return this.build(input, {
      type: 'channel.edit',
      messageId: input.platformMessageId,
      content: input.content,
    });
  }

  createDeleteEnvelope(input: AgentChatFactoryDeleteInput): AgentEventEnvelope {
    return this.build(input, {
      type: 'channel.delete',
      messageId: input.platformMessageId,
    });
  }

  createTypingEnvelope(input: AgentChatFactoryTypingInput): AgentEventEnvelope {
    return this.build(input, {
      type: 'channel.typing',
      state: input.state,
      ...(input.status !== undefined ? { status: input.status } : {}),
    });
  }

  private build(input: AgentChatFactoryBaseInput, event: AgentEvent): AgentEventEnvelope {
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
