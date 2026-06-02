import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ConversationChannel } from '@novu/dal';
import type { SentMessageInfo } from '@novu/framework';
import type { AdapterPostableMessage, EmojiValue, PlanModel, Thread } from 'chat';
import { AgentConfigResolver } from '../../channels/agent-config-resolver.service';
import type { ReplyContentDto } from '../../shared/dtos/agent-reply-payload.dto';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { esmImport } from '../../shared/util/esm-import';
import { AgentConversationService } from '../conversation/agent-conversation.service';
import { ChatInstanceRegistry } from '../ingress/chat-instance.registry';
import type { ChatSdkFile, ChatSdkReplyContent } from './file-materializer.service';
import { FileMaterializer } from './file-materializer.service';
import {
  editSlackNativeBlocks,
  getSlackApiErrorCode,
  postSlackNativeBlocks,
  type SlackNativeDelivery,
} from './slack-native-delivery';

export type { SlackNativeDelivery } from './slack-native-delivery';

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

export type OutboundDeliveryOptions = {
  slackNative?: SlackNativeDelivery;
};

/**
 * Persist context for a fallback reply posted on the live inbound thread.
 * Content is passed explicitly (not derived from the message) because fallbacks
 * persist human-readable text even when the posted payload is a card.
 */
export interface ThreadReplyPersistContext {
  conversationId: string;
  channel: ConversationChannel;
  agentIdentifier: string;
  content: string;
  richContent?: Record<string, unknown>;
  environmentId: string;
  organizationId: string;
}

function getErrorResponseBody(err: unknown): unknown {
  if (!err || typeof err !== 'object') {
    return undefined;
  }

  return (err as { response?: { body?: unknown } }).response?.body;
}

function getDeliveryErrorDetail(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const responseBody = body as { errors?: Array<{ message?: unknown }>; message?: unknown };
  const firstErrorMessage = responseBody.errors?.[0]?.message;
  if (typeof firstErrorMessage === 'string') {
    return firstErrorMessage;
  }

  return typeof responseBody.message === 'string' ? responseBody.message : undefined;
}

function toDeliveryError(err: unknown): never {
  const base = err instanceof Error ? err.message : String(err);
  const detail = getDeliveryErrorDetail(getErrorResponseBody(err));

  throw new BadGatewayException({
    error: 'delivery_failed',
    message: detail ? `${base}: ${detail}` : base,
  });
}

@Injectable()
export class OutboundGateway {
  constructor(
    private readonly registry: ChatInstanceRegistry,
    private readonly conversation: AgentConversationService,
    private readonly agentConfigResolver: AgentConfigResolver,
    private readonly fileMaterializer: FileMaterializer,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async deliver(
    target: ConversationTarget,
    msg: OutboundMessage,
    persist: OutboundPersistContext,
    options?: OutboundDeliveryOptions
  ): Promise<SentMessageInfo> {
    const sent = await this.postToConversation(
      target.agentId,
      target.integrationIdentifier,
      target.platform,
      target.platformThreadId,
      msg,
      options
    );
    await this.persistDelivered(persist, sent, msg);

    return sent;
  }

  async edit(
    target: ConversationTarget,
    messageId: string,
    msg: OutboundMessage,
    persist: OutboundPersistContext,
    options?: OutboundDeliveryOptions
  ): Promise<SentMessageInfo> {
    const sent = await this.editInConversation(
      target.agentId,
      target.integrationIdentifier,
      target.platform,
      target.platformThreadId,
      messageId,
      msg,
      options
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
    opts?: { failSoft?: boolean; persist?: ThreadReplyPersistContext }
  ): Promise<SentMessageInfo | null> {
    let sent: { id: string; threadId: string };
    try {
      sent = await (thread as unknown as { post(arg: unknown): Promise<{ id: string; threadId: string }> }).post(
        this.toThreadPostArg(msg)
      );
    } catch (err) {
      if (opts?.failSoft) {
        return null;
      }

      throw err;
    }

    if (opts?.persist) {
      await this.conversation.persistAgentMessage({
        conversationId: opts.persist.conversationId,
        channel: opts.persist.channel,
        platformMessageId: sent.id,
        agentIdentifier: opts.persist.agentIdentifier,
        content: opts.persist.content,
        richContent: opts.persist.richContent,
        environmentId: opts.persist.environmentId,
        organizationId: opts.persist.organizationId,
      });
    }

    return { messageId: sent.id, platformThreadId: sent.threadId };
  }

  async postToConversation(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    content: ReplyContentDto,
    options?: OutboundDeliveryOptions
  ): Promise<SentMessageInfo> {
    if (platform === AgentPlatformEnum.SLACK && options?.slackNative) {
      try {
        const botToken = await this.resolveSlackBotToken(agentId, integrationIdentifier);

        return await postSlackNativeBlocks({
          botToken,
          platformThreadId,
          slackNative: options.slackNative,
        });
      } catch (err) {
        if (getSlackApiErrorCode(err) !== 'invalid_blocks') {
          toDeliveryError(err);
        }

        this.logger.warn({ platformThreadId }, 'Slack rejected native blocks; falling back to portable card delivery');
      }
    }

    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);

    const thread = chat.thread(platformThreadId);
    const deliveryContent = await this.fileMaterializer.prepareContentForDelivery(content, platform, agentId);

    const postArg = this.buildAdapterPostableMessage(deliveryContent);

    const sent = await thread.post(postArg).catch(toDeliveryError);

    return { messageId: sent.id, platformThreadId: sent.threadId };
  }

  async startTypingInConversation(
    agentId: string,
    integrationIdentifier: string,
    platformThreadId: string,
    status = 'Thinking...'
  ): Promise<void> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);
    const thread = chat.thread(platformThreadId);

    if (typeof thread.startTyping !== 'function') {
      return;
    }

    await thread.startTyping(status).catch(toDeliveryError);
  }

  async sendDirectMessage(
    agentId: string,
    integrationIdentifier: string,
    platformUserId: string,
    content: ReplyContentDto
  ): Promise<SentMessageInfo> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);

    const dmThread = await chat.openDM(platformUserId);
    const deliveryContent = await this.fileMaterializer.prepareContentForDelivery(content, config.platform, agentId);

    const postArg = this.buildAdapterPostableMessage(deliveryContent);

    const sent = await dmThread.post(postArg).catch(toDeliveryError);

    const platformThreadId = sent.threadId.endsWith(':') ? `${sent.threadId}${sent.id}` : sent.threadId;

    return { messageId: sent.id, platformThreadId };
  }

  async editInConversation(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    platformMessageId: string,
    content: ReplyContentDto,
    options?: OutboundDeliveryOptions
  ): Promise<SentMessageInfo> {
    if (platform === AgentPlatformEnum.SLACK && options?.slackNative) {
      try {
        const botToken = await this.resolveSlackBotToken(agentId, integrationIdentifier);

        return await editSlackNativeBlocks({
          botToken,
          platformThreadId,
          platformMessageId,
          slackNative: options.slackNative,
        });
      } catch (err) {
        if (getSlackApiErrorCode(err) !== 'invalid_blocks') {
          toDeliveryError(err);
        }

        this.logger.warn(
          { platformThreadId, platformMessageId },
          'Slack rejected native blocks on edit; falling back to portable card delivery'
        );
      }
    }

    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter = chat.getAdapter(platform);
    if (typeof adapter.editMessage !== 'function') {
      throw new BadRequestException(`Platform ${platform} does not support editing messages`);
    }

    const deliveryContent = await this.fileMaterializer.prepareContentForDelivery(content, platform, agentId);

    const editPayload = this.buildAdapterPostableMessage(deliveryContent);

    let editPromise: Promise<{ id: string; threadId: string }>;
    if (deliveryContent.card) {
      editPromise = adapter.editMessage(
        platformThreadId,
        platformMessageId,
        deliveryContent.card as unknown as AdapterPostableMessage
      );
    } else {
      editPromise = adapter.editMessage(platformThreadId, platformMessageId, editPayload);
    }

    const edited = await editPromise.catch(toDeliveryError);

    return { messageId: edited.id, platformThreadId: edited.threadId };
  }

  async deleteInConversation(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    platformMessageId: string
  ): Promise<void> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter = chat.getAdapter(platform);
    if (typeof adapter.deleteMessage !== 'function') {
      return;
    }

    await adapter.deleteMessage(platformThreadId, platformMessageId).catch(toDeliveryError);
  }

  async postPlanObject(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    model: PlanModel
  ): Promise<SentMessageInfo | null> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter = chat.getAdapter(platform);
    if (typeof adapter.postObject !== 'function') {
      return null;
    }

    const sent = await adapter.postObject(platformThreadId, 'plan', model).catch(toDeliveryError);

    return { messageId: sent.id, platformThreadId: sent.threadId };
  }

  async editPlanObject(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    platformMessageId: string,
    model: PlanModel
  ): Promise<void> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter = chat.getAdapter(platform);
    if (typeof adapter.editObject !== 'function') {
      return;
    }

    await adapter.editObject(platformThreadId, platformMessageId, 'plan', model).catch(toDeliveryError);
  }

  async reactToMessage(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    platformMessageId: string,
    emojiName: string
  ): Promise<void> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter = chat.getAdapter(platform);
    const resolved = await this.resolveEmoji(emojiName);
    await adapter.addReaction(platformThreadId, platformMessageId, resolved);
  }

  async removeReaction(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    platformMessageId: string,
    emojiName: string
  ): Promise<void> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter = chat.getAdapter(platform);
    const resolved = await this.resolveEmoji(emojiName);
    await adapter.removeReaction(platformThreadId, platformMessageId, resolved);
  }

  private async resolveSlackBotToken(agentId: string, integrationIdentifier: string): Promise<string> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const token = config.connectionAccessToken;

    if (!token) {
      throw new BadRequestException('Slack integration missing bot token');
    }

    return token;
  }

  private async resolveEmoji(name: string): Promise<EmojiValue> {
    const { getEmoji } = await esmImport('chat');
    const resolved = getEmoji(name);
    if (!resolved) {
      throw new Error(`Unknown emoji name: "${name}". Use GET /agents/emoji to list supported options.`);
    }

    return resolved;
  }

  private buildAdapterPostableMessage(deliveryContent: ChatSdkReplyContent): AdapterPostableMessage {
    if (deliveryContent.card) {
      const payload: { card: unknown; files?: ChatSdkFile[] } = {
        card: deliveryContent.card,
      };

      if (deliveryContent.files?.length) {
        payload.files = deliveryContent.files;
      }

      return payload as unknown as AdapterPostableMessage;
    }

    return {
      markdown: deliveryContent.markdown ?? '',
      files: deliveryContent.files,
    } as unknown as AdapterPostableMessage;
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
