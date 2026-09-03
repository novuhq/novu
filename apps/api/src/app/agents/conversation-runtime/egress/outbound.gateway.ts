import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ConversationChannel } from '@novu/dal';
import type { SentMessageInfo } from '@novu/framework/internal';
import type { SlackAgentSuggestedPrompt } from '@novu/shared';
import type { Adapter, AdapterPostableMessage, CardElement, EmojiValue, PlanModel, Thread } from 'chat';
import { AgentConfigResolver, ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import type { ReplyContentDto } from '../../shared/dtos/agent-reply-payload.dto';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { extractCardPlainText } from '../../shared/util/card-plain-text.util';
import { toDeliveryError } from '../../shared/util/delivery-error.util';
import { esmImport } from '../../shared/util/esm-import';
import { appendPoweredByWatermark, contentHasPoweredByWatermark } from '../../shared/util/novu-powered-by-watermark';
import { SLACK_MARKDOWN_TEXT_LIMIT, splitOversizedSlackText } from '../../shared/util/slack-section-limits';
import { type AgentActionTokenBinding, AgentActionTokenService } from '../action-token/agent-action-token.service';
import { AgentConversationService } from '../conversation/agent-conversation.service';
import {
  ChatInstanceRegistry,
  type ChatWithAdapters,
  type PlatformAdapters,
  platformAdapterKey,
} from '../ingress/chat-instance.registry';
import type { ChatSdkReplyContent } from './file-materializer.service';
import { FileMaterializer } from './file-materializer.service';
import { OutboundDeliveryInfo } from './outbound-delivery-info.service';
import { resolvePlanDeliveryMode } from './plan-live-delivery';
import { renderPlanModelAsMarkdown } from './plan-model-to-markdown';
import type { PlanPhase } from './plan-phase';
import {
  decodeSlackPlatformThreadId,
  editSlackNativeBlocks,
  getSlackApiErrorCode,
  postSlackNativeBlocks,
  type SlackNativeDelivery,
} from './slack-native-delivery';

export type { SlackNativeDelivery } from './slack-native-delivery';

/** The subset of the resolved config that drives outbound watermarking. */
type OutboundBrandingContext = Pick<ResolvedAgentConfig, 'removeNovuBranding' | 'agentIdentifier' | 'platform'>;

export interface ConversationTarget {
  agentId: string;
  integrationIdentifier: string;
  platform: string;
  platformThreadId: string;
  /**
   * Slack workspace/team id for this thread, when the caller already has it (e.g. from the
   * conversation channel). Lets multi-workspace outbound delivery bind the right bot token without
   * an extra conversation lookup. Falls back to a lookup, then to the first installed workspace.
   */
  workspaceId?: string;
}

export interface OutboundPersistContext {
  conversationId: string;
  channel: ConversationChannel;
  agentIdentifier: string;
  agentName?: string;
  /** Caller-supplied activity identifier for idempotent message persist */
  activityIdentifier?: string;
  /** Conversation event sequence reported by in-process delivery (web) */
  sequence?: number;
  environmentId: string;
  organizationId: string;
}

export type OutboundMessage = ReplyContentDto;

function extractReplyRichContent(content: OutboundMessage): Record<string, unknown> | undefined {
  if (!content.card && !content.files?.length) {
    return undefined;
  }

  return {
    ...(content.markdown !== undefined && { markdown: content.markdown }),
    ...(content.card !== undefined && { card: content.card }),
    ...(content.files !== undefined && { files: content.files }),
  };
}

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

@Injectable()
export class OutboundGateway {
  constructor(
    @Inject(forwardRef(() => ChatInstanceRegistry))
    private readonly registry: ChatInstanceRegistry,
    private readonly conversation: AgentConversationService,
    private readonly agentConfigResolver: AgentConfigResolver,
    private readonly fileMaterializer: FileMaterializer,
    private readonly actionTokenService: AgentActionTokenService,
    private readonly deliveryInfo: OutboundDeliveryInfo,
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
    // Gate replies and other server posts without a runtime message id:
    // post first, then persist with the delivered message id.
    if (!persist.activityIdentifier) {
      const { result: sent, info } = await this.deliveryInfo.collect(() =>
        this.postToConversation(
          target.agentId,
          target.integrationIdentifier,
          target.platform,
          target.platformThreadId,
          msg,
          options,
          target.workspaceId,
          persist.activityIdentifier
        )
      );

      // In-process deliveries (web) report the authoritative message id so the
      // durable activity, live envelope, and platform message id stay one
      // identity. External platforms never report — the caller's id stands.
      await this.persistDelivered(
        { ...persist, activityIdentifier: info.messageId ?? persist.activityIdentifier, sequence: info.sequence },
        sent,
        msg
      );

      return sent;
    }

    // Runtime messages carry an idempotent identifier: persist first so the
    // timeline exists even when the platform is down. The unique index on the
    // activity identifier is the concurrent-delivery claim — only the creator
    // posts to the platform.
    const { activity, created } = await this.conversation.persistAgentMessage({
      conversationId: persist.conversationId,
      channel: persist.channel,
      agentIdentifier: persist.agentIdentifier,
      agentName: persist.agentName,
      identifier: persist.activityIdentifier,
      content: this.extractTextFallback(msg),
      richContent: extractReplyRichContent(msg),
      environmentId: persist.environmentId,
      organizationId: persist.organizationId,
    });

    if (!created) {
      return {
        messageId: activity.platformMessageId ?? activity.identifier,
        platformThreadId: activity.platformThreadId ?? target.platformThreadId,
      };
    }

    try {
      const { result: sent, info } = await this.deliveryInfo.collect(() =>
        this.postToConversation(
          target.agentId,
          target.integrationIdentifier,
          target.platform,
          target.platformThreadId,
          msg,
          options,
          target.workspaceId,
          persist.activityIdentifier
        )
      );
      const platformMessageId = info.messageId ?? sent.messageId;

      await this.conversation.setAgentMessagePlatformMessageId({
        environmentId: persist.environmentId,
        organizationId: persist.organizationId,
        conversationId: persist.conversationId,
        activityId: activity._id,
        platformMessageId,
      });

      return sent;
    } catch (err) {
      // Compensating delete so a retry can re-claim the identifier.
      await this.conversation.deleteAgentMessage({
        environmentId: persist.environmentId,
        organizationId: persist.organizationId,
        conversationId: persist.conversationId,
        activityId: activity._id,
      });

      throw err;
    }
  }

  async edit(
    target: ConversationTarget,
    messageId: string,
    msg: OutboundMessage,
    persist: OutboundPersistContext,
    options?: OutboundDeliveryOptions
  ): Promise<SentMessageInfo> {
    const { result: sent, info } = await this.deliveryInfo.collect(() =>
      this.editInConversation(
        target.agentId,
        target.integrationIdentifier,
        target.platform,
        target.platformThreadId,
        messageId,
        msg,
        options,
        target.workspaceId
      )
    );
    await this.conversation.persistAgentEdit({
      conversationId: persist.conversationId,
      channel: persist.channel,
      platformThreadId: sent.platformThreadId || undefined,
      platformMessageId: sent.messageId,
      agentIdentifier: persist.agentIdentifier,
      agentName: persist.agentName,
      content: this.extractTextFallback(msg),
      richContent: extractReplyRichContent(msg),
      sequence: info.sequence,
      environmentId: persist.environmentId,
      organizationId: persist.organizationId,
    });

    return sent;
  }

  /** Internal reply surface for server-built cards (capacity, plan-limit, keyless CTA). */
  async replyOnThreadWithCard(
    thread: Thread,
    card: CardElement,
    opts?: {
      failSoft?: boolean;
      persist?: ThreadReplyPersistContext;
      actionTokenBinding?: AgentActionTokenBinding;
    }
  ): Promise<SentMessageInfo | null> {
    return this.replyOnThread(thread, { card }, opts);
  }

  async replyOnThread(
    thread: Thread,
    msg: OutboundMessage,
    opts?: {
      failSoft?: boolean;
      persist?: ThreadReplyPersistContext;
      actionTokenBinding?: AgentActionTokenBinding;
    }
  ): Promise<SentMessageInfo | null> {
    let sent: { id: string; threadId: string };
    let sequence: number | undefined;
    try {
      const postArg = await this.buildThreadPostArg(msg, opts?.actionTokenBinding);
      const collected = await this.deliveryInfo.collect(() =>
        (thread as unknown as { post(arg: unknown): Promise<{ id: string; threadId: string }> }).post(postArg)
      );
      sent = collected.result;
      sequence = collected.info.sequence;
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
        identifier: sent.id,
        agentIdentifier: opts.persist.agentIdentifier,
        content: opts.persist.content,
        richContent: opts.persist.richContent,
        sequence,
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
    options?: OutboundDeliveryOptions,
    workspaceId?: string,
    preferredMessageId?: string
  ): Promise<SentMessageInfo> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);

    if (platform === AgentPlatformEnum.SLACK && options?.slackNative) {
      try {
        const botToken = await this.requireSlackBotToken(config, agentId, platformThreadId, workspaceId);

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

    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);

    const thread = chat.thread(platformThreadId);
    const deliveryContent = await this.fileMaterializer.prepareContentForDelivery(content, platform, agentId);
    const tokenizedContent = await this.applyActionTokensForDelivery(
      deliveryContent,
      this.toActionTokenBinding(agentId, config)
    );

    const postArg = this.withPreferredMessageId(
      this.buildAdapterPostableMessage(tokenizedContent, config),
      chat.getAdapter(platformAdapterKey(config.platform)),
      preferredMessageId
    );

    const sent = await this.runWithPlatformToken(chat, config, agentId, platformThreadId, workspaceId, () =>
      thread.post(postArg)
    ).catch(toDeliveryError);

    return { messageId: sent.id, platformThreadId: sent.threadId };
  }

  /**
   * Adapters that declare `supportsClientMessageIds` accept a caller-supplied
   * idempotent message id embedded in the postable message (a capability, not
   * a platform branch). All other adapters never see the field.
   */
  private withPreferredMessageId(
    postArg: AdapterPostableMessage,
    adapter: PlatformAdapters[keyof PlatformAdapters],
    preferredMessageId?: string
  ): AdapterPostableMessage {
    const supportsClientMessageIds = 'supportsClientMessageIds' in adapter && adapter.supportsClientMessageIds;
    if (!preferredMessageId || !supportsClientMessageIds) {
      return postArg;
    }

    return {
      ...(postArg as unknown as Record<string, unknown>),
      messageId: preferredMessageId,
    } as unknown as AdapterPostableMessage;
  }

  async startTypingInConversation(
    agentId: string,
    integrationIdentifier: string,
    platformThreadId: string,
    status = 'Thinking...',
    workspaceId?: string
  ): Promise<void> {
    if (!status.trim()) {
      await this.stopTypingInConversation(agentId, integrationIdentifier, platformThreadId, workspaceId);

      return;
    }

    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);
    const thread = chat.thread(platformThreadId);

    if (typeof thread.startTyping !== 'function') {
      return;
    }

    await this.runWithPlatformToken(chat, config, agentId, platformThreadId, workspaceId, () =>
      thread.startTyping(status)
    ).catch((err) => {
      this.logger.warn(
        { err, platformThreadId, agentId, integrationIdentifier },
        'Failed to start typing in conversation'
      );
    });
  }

  async stopTypingInConversation(
    agentId: string,
    integrationIdentifier: string,
    platformThreadId: string,
    workspaceId?: string
  ): Promise<void> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);

    if (config.platform === AgentPlatformEnum.SLACK) {
      await this.clearSlackAssistantStatus(agentId, integrationIdentifier, platformThreadId, workspaceId);

      return;
    }

    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);
    const adapter = chat.getAdapter(platformAdapterKey(config.platform));

    // Most platforms have no explicit stop API — indicators expire or clear on
    // post. Adapters with in-process delivery (web) expose `stopTyping`.
    if (!('stopTyping' in adapter)) {
      return;
    }

    await adapter.stopTyping(platformThreadId).catch((err) => {
      this.logger.warn(
        { err, platformThreadId, agentId, integrationIdentifier },
        'Failed to stop typing in conversation'
      );
    });
  }

  private async clearSlackAssistantStatus(
    agentId: string,
    integrationIdentifier: string,
    platformThreadId: string,
    workspaceId?: string
  ): Promise<void> {
    const { channel, threadTs } = decodeSlackPlatformThreadId(platformThreadId);
    if (!threadTs) {
      this.logger.warn(
        { platformThreadId, agentId, integrationIdentifier },
        'Skipping Slack typing stop because thread timestamp is missing'
      );

      return;
    }

    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);
    const adapter = chat.getAdapter(AgentPlatformEnum.SLACK);
    const setAssistantStatus = adapter.setAssistantStatus?.bind(adapter);

    if (typeof setAssistantStatus !== 'function') {
      return;
    }

    await this.runWithPlatformToken(chat, config, agentId, platformThreadId, workspaceId, () =>
      setAssistantStatus(channel, threadTs, '')
    ).catch((err) => {
      this.logger.warn(
        { err, platformThreadId, agentId, integrationIdentifier },
        'Failed to clear Slack assistant status'
      );
    });
  }

  async sendDirectMessage(
    agentId: string,
    integrationIdentifier: string,
    platformUserId: string,
    content: ReplyContentDto,
    workspaceId?: string
  ): Promise<SentMessageInfo> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);
    const deliveryContent = await this.fileMaterializer.prepareContentForDelivery(content, config.platform, agentId);
    const tokenizedContent = await this.applyActionTokensForDelivery(
      deliveryContent,
      this.toActionTokenBinding(agentId, config)
    );

    const postArg = this.buildAdapterPostableMessage(tokenizedContent, config);

    // openDM must run inside the token binding: Slack multi-workspace adapters have no default
    // bot token, and conversations.open fails with AuthenticationError outside withBotToken().
    const sent = await this.runWithPlatformToken(chat, config, agentId, platformUserId, workspaceId, async () => {
      const dmThread = await this.openDirectMessageThread(chat, config.platform, platformUserId);

      return dmThread.post(postArg);
    }).catch(toDeliveryError);

    const platformThreadId = sent.threadId.endsWith(':') ? `${sent.threadId}${sent.id}` : sent.threadId;

    return { messageId: sent.id, platformThreadId };
  }

  async setSlackSuggestedPrompts(
    agentId: string,
    integrationIdentifier: string,
    platformThreadId: string,
    prompts: SlackAgentSuggestedPrompt[],
    title?: string,
    workspaceId?: string
  ): Promise<void> {
    const { channel, threadTs } = decodeSlackPlatformThreadId(platformThreadId);
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);
    const adapter = chat.getAdapter(AgentPlatformEnum.SLACK);
    const setSuggestedPrompts = adapter.setSuggestedPrompts?.bind(adapter);

    if (typeof setSuggestedPrompts !== 'function') {
      return;
    }

    const resolvedThreadTs = threadTs ?? platformThreadId.split(':').slice(2).join(':');
    if (!resolvedThreadTs) {
      this.logger.warn(
        { platformThreadId, agentId, integrationIdentifier },
        'Skipping Slack suggested prompts because thread timestamp is missing'
      );

      return;
    }

    await this.runWithPlatformToken(chat, config, agentId, platformThreadId, workspaceId, () =>
      setSuggestedPrompts(channel, resolvedThreadTs, prompts, title)
    ).catch((err) => {
      this.logger.warn(
        { err, platformThreadId, agentId, integrationIdentifier },
        'Failed to set Slack suggested prompts'
      );
    });
  }

  async editInConversation(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    platformMessageId: string,
    content: ReplyContentDto,
    options?: OutboundDeliveryOptions,
    workspaceId?: string
  ): Promise<SentMessageInfo> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);

    if (platform === AgentPlatformEnum.SLACK && options?.slackNative) {
      try {
        const botToken = await this.requireSlackBotToken(config, agentId, platformThreadId, workspaceId);

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

    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter: Adapter = chat.getAdapter(platformAdapterKey(config.platform));
    if (typeof adapter.editMessage !== 'function') {
      throw new BadRequestException(`Platform ${platform} does not support editing messages`);
    }

    const deliveryContent = await this.fileMaterializer.prepareContentForDelivery(content, platform, agentId);
    const tokenizedContent = await this.applyActionTokensForDelivery(
      deliveryContent,
      this.toActionTokenBinding(agentId, config)
    );

    // Edits re-brand so a post-then-edit delivery never strips the watermark.
    const editPayload = this.buildAdapterPostableMessage(tokenizedContent, config);

    const edited = await this.runWithPlatformToken(chat, config, agentId, platformThreadId, workspaceId, () =>
      adapter.editMessage(platformThreadId, platformMessageId, editPayload)
    ).catch(toDeliveryError);

    return { messageId: edited.id, platformThreadId: edited.threadId };
  }

  async deleteInConversation(
    agentId: string,
    integrationIdentifier: string,
    platformThreadId: string,
    platformMessageId: string,
    workspaceId?: string,
    persist?: OutboundPersistContext
  ): Promise<void> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter: Adapter = chat.getAdapter(platformAdapterKey(config.platform));
    if (typeof adapter.deleteMessage !== 'function') {
      return;
    }

    const { info } = await this.deliveryInfo.collect(() =>
      this.runWithPlatformToken(chat, config, agentId, platformThreadId, workspaceId, () =>
        adapter.deleteMessage(platformThreadId, platformMessageId)
      ).catch(toDeliveryError)
    );

    // Same as EDIT: append a durable tombstone for every channel when asked.
    if (persist) {
      await this.conversation.persistAgentDelete({
        conversationId: persist.conversationId,
        channel: persist.channel,
        platformThreadId,
        platformMessageId,
        agentIdentifier: persist.agentIdentifier,
        agentName: persist.agentName,
        content: '',
        sequence: info.sequence,
        environmentId: persist.environmentId,
        organizationId: persist.organizationId,
      });
    }
  }

  async postPlanObject(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    model: PlanModel,
    phase: PlanPhase,
    workspaceId?: string
  ): Promise<SentMessageInfo | null> {
    const { chat, config, adapter } = await this.resolvePlanAdapter(agentId, integrationIdentifier);
    const mode = resolvePlanDeliveryMode(platform, adapter);

    if (!mode) {
      return null;
    }

    if (mode === 'native') {
      const sent = await this.runWithPlatformToken(chat, config, agentId, platformThreadId, workspaceId, () =>
        adapter.postObject!(platformThreadId, 'plan', model)
      ).catch(toDeliveryError);

      return { messageId: sent.id, platformThreadId: sent.threadId };
    }

    const markdown = renderPlanModelAsMarkdown(model, phase);

    return this.postToConversation(
      agentId,
      integrationIdentifier,
      platform,
      platformThreadId,
      { markdown },
      undefined,
      workspaceId
    );
  }

  async editPlanObject(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    platformMessageId: string,
    model: PlanModel,
    phase: PlanPhase,
    workspaceId?: string
  ): Promise<void> {
    const { chat, config, adapter } = await this.resolvePlanAdapter(agentId, integrationIdentifier);
    const mode = resolvePlanDeliveryMode(platform, adapter);

    if (!mode) {
      return;
    }

    if (mode === 'native') {
      await this.runWithPlatformToken(chat, config, agentId, platformThreadId, workspaceId, () =>
        adapter.editObject!(platformThreadId, platformMessageId, 'plan', model)
      ).catch(toDeliveryError);

      return;
    }

    const markdown = renderPlanModelAsMarkdown(model, phase);

    await this.editInConversation(
      agentId,
      integrationIdentifier,
      platform,
      platformThreadId,
      platformMessageId,
      { markdown },
      undefined,
      workspaceId
    );
  }

  private async resolvePlanAdapter(agentId: string, integrationIdentifier: string) {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter: Adapter = chat.getAdapter(platformAdapterKey(config.platform));

    return { chat, config, adapter };
  }

  async reactToMessage(
    agentId: string,
    integrationIdentifier: string,
    platformThreadId: string,
    platformMessageId: string,
    emojiName: string,
    workspaceId?: string
  ): Promise<void> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter: Adapter = chat.getAdapter(platformAdapterKey(config.platform));
    const resolved = await this.resolveEmoji(emojiName);
    await this.runWithPlatformToken(chat, config, agentId, platformThreadId, workspaceId, () =>
      adapter.addReaction(platformThreadId, platformMessageId, resolved)
    );
  }

  async removeReaction(
    agentId: string,
    integrationIdentifier: string,
    platformThreadId: string,
    platformMessageId: string,
    emojiName: string,
    workspaceId?: string
  ): Promise<void> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter: Adapter = chat.getAdapter(platformAdapterKey(config.platform));
    const resolved = await this.resolveEmoji(emojiName);
    await this.runWithPlatformToken(chat, config, agentId, platformThreadId, workspaceId, () =>
      adapter.removeReaction(platformThreadId, platformMessageId, resolved)
    );
  }

  /**
   * Resolve the Slack workspace/team id a thread belongs to. Prefers a caller-supplied id (the
   * conversation channel already carries it on the reply path — zero extra reads); otherwise looks
   * it up from the conversation by thread id. Returns `undefined` for non-Slack platforms or when a
   * conversation predates multi-workspace capture, in which case token resolution falls back to the
   * integration's first installed workspace.
   */
  private async resolveSlackWorkspaceId(
    config: ResolvedAgentConfig,
    agentId: string,
    platformThreadId: string,
    workspaceId?: string
  ): Promise<string | undefined> {
    if (config.platform !== AgentPlatformEnum.SLACK) {
      return undefined;
    }

    if (workspaceId) {
      return workspaceId;
    }

    try {
      const conversation = await this.conversation.findByPlatformThread(
        config.environmentId,
        config.organizationId,
        agentId,
        config.integrationId,
        platformThreadId
      );
      const channel =
        conversation?.channels.find((c) => c.platformThreadId === platformThreadId) ?? conversation?.channels[0];

      return channel?.workspace?.id;
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), platformThreadId },
        'Failed to resolve Slack workspace id for outbound delivery; falling back to default workspace token'
      );

      return undefined;
    }
  }

  /**
   * Run an outbound adapter operation with the correct platform delivery token bound for its
   * duration. Wrapped around every outbound op (replies, edits, reactions, typing, plan cards) so
   * the token concern lives in one place regardless of platform.
   *
   * Only Slack needs per-call binding today: its adapter runs in multi-workspace mode (no baked-in
   * default token), so outbound calls made outside an inbound webhook must supply the token
   * explicitly. For Slack we resolve the token for the thread's workspace (falling back to the
   * integration's first installed workspace) and run the operation inside `adapter.withBotToken`,
   * which the SDK reads via request-scoped context. Every other platform — and any Slack call
   * without a resolvable token — runs the operation unchanged.
   */
  private async runWithPlatformToken<T>(
    chat: ChatWithAdapters,
    config: ResolvedAgentConfig,
    agentId: string,
    platformThreadId: string,
    workspaceId: string | undefined,
    fn: () => Promise<T>
  ): Promise<T> {
    if (config.platform !== AgentPlatformEnum.SLACK) {
      return fn();
    }

    const resolvedWorkspaceId = await this.resolveSlackWorkspaceId(config, agentId, platformThreadId, workspaceId);
    const token = await this.agentConfigResolver.resolveSlackBotToken(
      config.environmentId,
      config.organizationId,
      config.integrationIdentifier,
      resolvedWorkspaceId
    );

    const adapter = chat.getAdapter(AgentPlatformEnum.SLACK);

    if (!token || typeof adapter?.withBotToken !== 'function') {
      return fn();
    }

    return adapter.withBotToken(token, fn);
  }

  /**
   * Resolve the Slack bot token for a direct (non-adapter) API call — the native block-kit
   * delivery paths post via the Slack Web API directly rather than through the adapter, so they
   * need the token in hand. Team-aware with a first-installed-workspace fallback; throws when no
   * workspace token exists.
   */
  private async requireSlackBotToken(
    config: ResolvedAgentConfig,
    agentId: string,
    platformThreadId: string,
    workspaceId?: string
  ): Promise<string> {
    const resolvedWorkspaceId = await this.resolveSlackWorkspaceId(config, agentId, platformThreadId, workspaceId);
    const token = await this.agentConfigResolver.resolveSlackBotToken(
      config.environmentId,
      config.organizationId,
      config.integrationIdentifier,
      resolvedWorkspaceId
    );

    if (!token) {
      throw new BadRequestException('Slack integration missing bot token');
    }

    return token;
  }

  private async openDirectMessageThread(
    chat: ChatWithAdapters,
    platform: AgentPlatformEnum,
    platformUserId: string
  ): Promise<Thread> {
    const adapter: Adapter = chat.getAdapter(platformAdapterKey(platform));

    if (typeof adapter.openDM === 'function') {
      const threadId = await adapter.openDM(platformUserId);

      return chat.thread(threadId);
    }

    return chat.openDM(platformUserId);
  }

  private async resolveEmoji(name: string): Promise<EmojiValue> {
    const { getEmoji } = await esmImport('chat');
    const resolved = getEmoji(name);
    if (!resolved) {
      throw new Error(`Unknown emoji name: "${name}". Use GET /agents/emoji to list supported options.`);
    }

    return resolved;
  }

  /**
   * Appends a "Powered by Novu" markdown footer for orgs that have not removed
   * Novu branding. Pro and above can disable it via `removeNovuBranding`.
   * Cards and action messages are left untouched.
   */
  private applyOutboundBranding(content: ChatSdkReplyContent, branding: OutboundBrandingContext): ChatSdkReplyContent {
    if (content.card || !content.markdown || contentHasPoweredByWatermark(content.markdown)) {
      return content;
    }

    if (branding.removeNovuBranding) {
      return content;
    }

    return {
      ...content,
      markdown: appendPoweredByWatermark(content.markdown, branding.agentIdentifier, branding.platform),
    };
  }

  /**
   * Single payload-construction chokepoint for adapter deliveries (post, DM,
   * edit). Branding is applied here so no delivery path can miss the watermark.
   */
  private buildAdapterPostableMessage(
    content: ChatSdkReplyContent,
    branding: OutboundBrandingContext
  ): AdapterPostableMessage {
    const deliveryContent = this.applyOutboundBranding(content, branding);

    if (deliveryContent.card) {
      return {
        card:
          branding.platform === AgentPlatformEnum.SLACK
            ? splitOversizedSlackText(deliveryContent.card)
            : deliveryContent.card,
        ...(deliveryContent.files?.length ? { files: deliveryContent.files } : {}),
      } as AdapterPostableMessage;
    }

    const markdown = deliveryContent.markdown ?? '';

    if (branding.platform === AgentPlatformEnum.SLACK && markdown.length > SLACK_MARKDOWN_TEXT_LIMIT) {
      return {
        card: splitOversizedSlackText({
          type: 'card',
          children: [{ type: 'text', content: markdown }],
        }),
        ...(deliveryContent.files?.length ? { files: deliveryContent.files } : {}),
      } as AdapterPostableMessage;
    }

    return {
      markdown,
      files: deliveryContent.files,
    } as AdapterPostableMessage;
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
      identifier: persist.activityIdentifier,
      content: this.extractTextFallback(msg),
      richContent: extractReplyRichContent(msg),
      sequence: persist.sequence,
      environmentId: persist.environmentId,
      organizationId: persist.organizationId,
    });
  }

  private async buildThreadPostArg(
    msg: OutboundMessage,
    actionTokenBinding?: AgentActionTokenBinding
  ): Promise<unknown> {
    if (!msg.card || !actionTokenBinding) {
      return this.toThreadPostArg(msg);
    }

    const tokenized = await this.applyActionTokensForDelivery({ card: msg.card }, actionTokenBinding);

    return tokenized.card ?? this.toThreadPostArg(msg);
  }

  private toActionTokenBinding(
    agentId: string,
    config: { environmentId: string; organizationId: string; integrationIdentifier: string }
  ): AgentActionTokenBinding {
    return {
      agentId,
      integrationIdentifier: config.integrationIdentifier,
      environmentId: config.environmentId,
      organizationId: config.organizationId,
    };
  }

  private async applyActionTokensForDelivery(
    deliveryContent: ChatSdkReplyContent,
    binding: AgentActionTokenBinding
  ): Promise<ChatSdkReplyContent> {
    if (!deliveryContent.card) {
      return deliveryContent;
    }

    try {
      const tokenizedCard = await this.actionTokenService.tokenizeCardForDelivery(deliveryContent.card, binding);

      return { ...deliveryContent, card: tokenizedCard };
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), agentId: binding.agentId },
        'Failed to tokenize card actions; delivering with raw action ids'
      );

      return deliveryContent;
    }
  }

  private extractTextFallback(msg: OutboundMessage): string {
    if (msg.markdown) {
      return msg.markdown;
    }
    if (msg.card) {
      return extractCardPlainText(msg.card);
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
