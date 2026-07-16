import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ConversationChannel } from '@novu/dal';
import type { SentMessageInfo } from '@novu/framework/internal';
import type { AdapterPostableMessage, CardElement, Chat, EmojiValue, PlanModel, Thread } from 'chat';
import { AgentConfigResolver, ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import type { ReplyContentDto } from '../../shared/dtos/agent-reply-payload.dto';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { esmImport } from '../../shared/util/esm-import';
import { buildBrandedMarkdownReply, contentHasPoweredByWatermark } from '../../shared/util/novu-powered-by-watermark';
import { type AgentActionTokenBinding, AgentActionTokenService } from '../action-token/agent-action-token.service';
import { AgentConversationService } from '../conversation/agent-conversation.service';
import { ChatInstanceRegistry } from '../ingress/chat-instance.registry';
import type { ChatSdkFile, ChatSdkReplyContent } from './file-materializer.service';
import { FileMaterializer } from './file-materializer.service';
import { resolvePlanDeliveryMode } from './plan-live-delivery';
import { renderPlanModelAsMarkdown } from './plan-model-to-markdown';
import type { PlanPhase } from './plan-phase';
import {
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
    private readonly actionTokenService: AgentActionTokenService,
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
      options,
      target.workspaceId
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
      options,
      target.workspaceId
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
      environmentId: persist.environmentId,
      organizationId: persist.organizationId,
    });

    return sent;
  }

  /**
   * Internal reply surface for server-built cards (capacity, plan-limit,
   * keyless CTA). `OutboundMessage.card` is typed as the request-DTO validation
   * shape (`Record<string, unknown>`), so the single DTO-boundary cast lives
   * here instead of at every call site.
   */
  async replyOnThreadWithCard(
    thread: Thread,
    card: CardElement,
    opts?: {
      failSoft?: boolean;
      persist?: ThreadReplyPersistContext;
      actionTokenBinding?: AgentActionTokenBinding;
    }
  ): Promise<SentMessageInfo | null> {
    return this.replyOnThread(thread, { card: card as unknown as Record<string, unknown> }, opts);
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
    try {
      const postArg = await this.buildThreadPostArg(msg, opts?.actionTokenBinding);
      sent = await (thread as unknown as { post(arg: unknown): Promise<{ id: string; threadId: string }> }).post(
        postArg
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
    options?: OutboundDeliveryOptions,
    workspaceId?: string
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

    const postArg = this.buildAdapterPostableMessage(tokenizedContent, config);

    const sent = await this.runWithPlatformToken(chat, config, agentId, platformThreadId, workspaceId, () =>
      thread.post(postArg)
    ).catch(toDeliveryError);

    return { messageId: sent.id, platformThreadId: sent.threadId };
  }

  async startTypingInConversation(
    agentId: string,
    integrationIdentifier: string,
    platformThreadId: string,
    status = 'Thinking...',
    workspaceId?: string
  ): Promise<void> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);
    const thread = chat.thread(platformThreadId);

    if (typeof thread.startTyping !== 'function') {
      return;
    }

    await this.runWithPlatformToken(chat, config, agentId, platformThreadId, workspaceId, () =>
      thread.startTyping(status)
    ).catch(toDeliveryError);
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

    const dmThread = await chat.openDM(platformUserId);
    const deliveryContent = await this.fileMaterializer.prepareContentForDelivery(content, config.platform, agentId);
    const tokenizedContent = await this.applyActionTokensForDelivery(
      deliveryContent,
      this.toActionTokenBinding(agentId, config)
    );

    const postArg = this.buildAdapterPostableMessage(tokenizedContent, config);

    const sent = await this.runWithPlatformToken(chat, config, agentId, platformUserId, workspaceId, () =>
      dmThread.post(postArg)
    ).catch(toDeliveryError);

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

    const adapter = chat.getAdapter(platform);
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

    const editCardPayload = tokenizedContent.card
      ? (tokenizedContent.card as unknown as AdapterPostableMessage)
      : editPayload;

    const edited = await this.runWithPlatformToken(chat, config, agentId, platformThreadId, workspaceId, () =>
      adapter.editMessage(platformThreadId, platformMessageId, editCardPayload)
    ).catch(toDeliveryError);

    return { messageId: edited.id, platformThreadId: edited.threadId };
  }

  async deleteInConversation(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    platformMessageId: string,
    workspaceId?: string
  ): Promise<void> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter = chat.getAdapter(platform);
    if (typeof adapter.deleteMessage !== 'function') {
      return;
    }

    await this.runWithPlatformToken(chat, config, agentId, platformThreadId, workspaceId, () =>
      adapter.deleteMessage(platformThreadId, platformMessageId)
    ).catch(toDeliveryError);
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
    const { chat, config, adapter } = await this.resolvePlanAdapter(agentId, integrationIdentifier, platform);
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
    const { chat, config, adapter } = await this.resolvePlanAdapter(agentId, integrationIdentifier, platform);
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

  private async resolvePlanAdapter(agentId: string, integrationIdentifier: string, platform: string) {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);

    return { chat, config, adapter: chat.getAdapter(platform) };
  }

  async reactToMessage(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    platformMessageId: string,
    emojiName: string,
    workspaceId?: string
  ): Promise<void> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter = chat.getAdapter(platform);
    const resolved = await this.resolveEmoji(emojiName);
    await this.runWithPlatformToken(chat, config, agentId, platformThreadId, workspaceId, () =>
      adapter.addReaction(platformThreadId, platformMessageId, resolved)
    );
  }

  async removeReaction(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    platformMessageId: string,
    emojiName: string,
    workspaceId?: string
  ): Promise<void> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter = chat.getAdapter(platform);
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
    chat: Chat,
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

    const adapter = chat.getAdapter(AgentPlatformEnum.SLACK) as unknown as {
      withBotToken?<R>(token: string, fn: () => Promise<R>): Promise<R>;
    };

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

  private async resolveEmoji(name: string): Promise<EmojiValue> {
    const { getEmoji } = await esmImport('chat');
    const resolved = getEmoji(name);
    if (!resolved) {
      throw new Error(`Unknown emoji name: "${name}". Use GET /agents/emoji to list supported options.`);
    }

    return resolved;
  }

  /**
   * Wraps outbound markdown replies with a muted "Powered by Novu" footnote for
   * organizations that have not removed Novu branding (free plan). Pro and above
   * can disable it via the existing `removeNovuBranding` org setting, resolved
   * once per delivery by `AgentConfigResolver`.
   *
   * Only plain markdown replies are branded — cards/action messages are left
   * untouched.
   */
  private applyOutboundBranding(content: ChatSdkReplyContent, branding: OutboundBrandingContext): ChatSdkReplyContent {
    if (content.card || !content.markdown || contentHasPoweredByWatermark(content.markdown)) {
      return content;
    }

    if (branding.removeNovuBranding) {
      return content;
    }

    const card = buildBrandedMarkdownReply(content.markdown, branding.agentIdentifier, branding.platform);

    return { ...content, card: card as unknown as Record<string, unknown>, markdown: undefined };
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
      richContent: extractReplyRichContent(msg),
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
