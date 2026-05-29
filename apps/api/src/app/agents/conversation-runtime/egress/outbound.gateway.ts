import { Injectable } from '@nestjs/common';
import { ConversationChannel } from '@novu/dal';
import type { SentMessageInfo } from '@novu/framework';
import type { Thread } from 'chat';
import { AgentConversationService } from '../../services/agent-conversation.service';
import { ChatSdkService } from '../../services/chat-sdk.service';
import type { ReplyContentDto } from '../../shared/dtos/agent-reply-payload.dto';

export interface ConversationTarget {
  agentId: string;
  integrationIdentifier: string;
  platform: string;
  platformThreadId: string;
}

export interface OutboundPersistContext {
  conversationId: string;
  channel: ConversationChannel;
  agentIdentifier: string;
  agentName?: string;
  environmentId: string;
  organizationId: string;
}

export type OutboundMessage = ReplyContentDto;

@Injectable()
export class OutboundGateway {
  constructor(
    private readonly chat: ChatSdkService,
    private readonly conversation: AgentConversationService
  ) {}

  async deliver(
    target: ConversationTarget,
    msg: OutboundMessage,
    persist: OutboundPersistContext
  ): Promise<SentMessageInfo> {
    const sent = await this.chat.postToConversation(
      target.agentId,
      target.integrationIdentifier,
      target.platform,
      target.platformThreadId,
      msg
    );
    await this.persistDelivered(persist, sent, msg);

    return sent;
  }

  async edit(
    target: ConversationTarget,
    messageId: string,
    msg: OutboundMessage,
    persist: OutboundPersistContext
  ): Promise<SentMessageInfo> {
    const sent = await this.chat.editInConversation(
      target.agentId,
      target.integrationIdentifier,
      target.platform,
      target.platformThreadId,
      messageId,
      msg
    );
    await this.conversation.persistAgentEdit({
      conversationId: persist.conversationId,
      channel: persist.channel,
      platformThreadId: sent.platformThreadId || undefined,
      platformMessageId: sent.messageId,
      agentIdentifier: persist.agentIdentifier,
      agentName: persist.agentName,
      content: this.extractTextFallback(msg),
      richContent: msg.card || msg.files?.length ? (msg as Record<string, unknown>) : undefined,
      environmentId: persist.environmentId,
      organizationId: persist.organizationId,
    });

    return sent;
  }

  async replyOnThread(
    thread: Thread,
    msg: OutboundMessage,
    opts?: { failSoft?: boolean }
  ): Promise<SentMessageInfo | null> {
    try {
      const sent = await (thread as unknown as { post(arg: unknown): Promise<{ id: string; threadId: string }> }).post(
        this.toThreadPostArg(msg)
      );

      return { messageId: sent.id, platformThreadId: sent.threadId };
    } catch (err) {
      if (opts?.failSoft) {
        return null;
      }

      throw err;
    }
  }

  private async persistDelivered(
    persist: OutboundPersistContext,
    sent: SentMessageInfo,
    msg: OutboundMessage
  ): Promise<void> {
    await this.conversation.persistAgentMessage({
      conversationId: persist.conversationId,
      channel: persist.channel,
      platformThreadId: sent.platformThreadId || undefined,
      platformMessageId: sent.messageId,
      agentIdentifier: persist.agentIdentifier,
      agentName: persist.agentName,
      content: this.extractTextFallback(msg),
      richContent: msg.card || msg.files?.length ? (msg as Record<string, unknown>) : undefined,
      environmentId: persist.environmentId,
      organizationId: persist.organizationId,
    });
  }

  private extractTextFallback(msg: OutboundMessage): string {
    if (msg.markdown) {
      return msg.markdown;
    }
    if (msg.card) {
      const title = (msg.card as { title?: string }).title;

      return title ?? '[Card]';
    }

    return '';
  }

  private toThreadPostArg(msg: OutboundMessage): unknown {
    if (msg.markdown && !msg.card) {
      return msg.markdown;
    }

    return msg.card ?? msg;
  }
}
