import { Injectable, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { AnalyticsService, PinoLogger } from '@novu/application-generic';
import {
  AgentRepository,
  ChannelEndpointRepository,
  ConversationActivityEntity,
  ConversationActivitySenderTypeEnum,
  ConversationEntity,
  ConversationParticipantTypeEnum,
  SubscriberRepository,
} from '@novu/dal';
import type { AgentAction } from '@novu/framework';
import { ENDPOINT_TYPES } from '@novu/shared';
import type { CardElement, EmojiValue, Message, Thread } from 'chat';
import { ConnectClaimTokenService } from '../../../connect/services/connect-claim-token.service';
import { parsePositiveIntEnv } from '../../../keyless/keyless-abuse.constants';
import { KeylessAbuseGuardService } from '../../../keyless/keyless-abuse-guard.service';
import { ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import { LinkTelegramChatToSubscriberCommand } from '../../channels/telegram-linking/link-telegram-chat-to-subscriber/link-telegram-chat-to-subscriber.command';
import { LinkTelegramChatToSubscriber } from '../../channels/telegram-linking/link-telegram-chat-to-subscriber/link-telegram-chat-to-subscriber.usecase';
import { TelegramStartCodeService } from '../../channels/telegram-linking/telegram-start-code.service';
import {
  trackAgentInboundAction,
  trackAgentInboundMessage,
  trackAgentInboundReaction,
} from '../../shared/analytics/agent-analytics';
import { AgentEventEnum } from '../../shared/enums/agent-event.enum';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { captureAgentException, captureAgentWarning } from '../../shared/errors/capture-agent-sentry';
import { type AutoProvisionPlatform, isAutoProvisionPlatform } from '../../shared/util/platform-endpoint-config';
import { InboundAckService } from '../ack/inbound-ack.service';
import { AgentAttachmentStorage, type StoredAttachment } from '../conversation/agent-attachment-storage.service';
import { AgentConversationService, getInboundActivityPreview } from '../conversation/agent-conversation.service';
import {
  AgentSubscriberResolver,
  BotAuthorSkippedError,
  ConnectOrgSubscriberCapExceededError,
} from '../conversation/agent-subscriber-resolver.service';
import { OutboundGateway } from '../egress/outbound.gateway';
import type { BridgeReaction } from '../runtime/bridge-executor.service';
import type { ConversationTurn } from '../runtime/conversation-turn';
import { RuntimeResolver } from '../runtime/runtime-resolver.service';
import { InboundDispatcher } from './inbound.dispatcher';

/**
 * `/start <payload>` is Telegram's deep-link mechanism. Telegram delivers it as
 * a regular message whose text is exactly `/start ` followed by the URL-decoded
 * payload (max 64 base64url characters per the API). We only treat the message
 * as a subscriber-link request when it has a non-empty payload.
 */
const TELEGRAM_START_COMMAND = /^\/start(?:@[\w_]+)?\s+(\S+)\s*$/;

function extractTelegramStartToken(text: string | undefined): string | null {
  if (!text) return null;
  const match = TELEGRAM_START_COMMAND.exec(text.trim());
  return match ? match[1] : null;
}

// Link buttons render with a `link-` prefixed action id. They open a URL client-side;
// the SDK still emits an inbound action for the click, but there is nothing to do
// server-side, so it is swallowed. Runtime-agnostic.
function isLinkButtonActionId(id: string | undefined): boolean {
  return typeof id === 'string' && id.startsWith('link-');
}

function extractTelegramChatId(thread: Thread): string | null {
  const raw = thread.channelId;
  if (!raw) return null;
  // chat-sdk Telegram adapter exposes `chat.id` as the bare numeric id (string).
  // For safety against an upstream change to a namespaced form, peel off any
  // `telegram:` prefix before persistence so the value we store matches what
  // `TelegramChatProvider.sendMessage` will POST to the bot API.
  return raw.startsWith('telegram:') ? raw.slice('telegram:'.length) : raw;
}

const SUBSCRIBER_LINK_SUCCESS_REPLY = "You're connected. Notifications from this agent will now reach you here.";
const SUBSCRIBER_LINK_DUPLICATE_REPLY =
  'This chat is already connected to your account — no changes needed. Send any message to try the agent out.';
const SUBSCRIBER_LINK_INVALID_REPLY =
  "This connection link isn't valid — open a fresh link from your Novu dashboard and try again.";
const SUBSCRIBER_LINK_EXPIRED_REPLY =
  'This connection link has expired. Open a new link from your Novu dashboard and try again.';
const SUBSCRIBER_LINK_WRONG_BOT_REPLY =
  "This connection link wasn't issued for this bot. Open the link from your Novu dashboard again (or request a new one) and make sure you're messaging the same bot you configured.";

const NOVU_PRICING_URL = 'https://novu.co/pricing';

const KEYLESS_DEMO_REPLY_CAP = parsePositiveIntEnv(process.env.KEYLESS_DEMO_REPLY_CAP, 5);

function resolveConnectClaimBaseUrl(): string {
  for (const candidate of [process.env.DASHBOARD_URL, process.env.FRONT_BASE_URL]) {
    const trimmed = candidate?.trim();

    if (!trimmed || trimmed.startsWith('^')) {
      continue;
    }

    return trimmed.replace(/\/$/, '');
  }

  return 'https://dashboard.novu.co';
}

function buildKeylessSignupCard(claimUrl: string): CardElement {
  return {
    type: 'card',
    children: [
      {
        type: 'text',
        content:
          "You've reached the limit of this free demo. Sign up for a free Novu account to keep this agent — your " +
          'conversation and setup carry over, and the agent picks up right where it left off.',
      },
      { type: 'divider' },
      {
        type: 'actions',
        children: [
          {
            type: 'link-button',
            label: 'Sign up & keep this agent',
            url: claimUrl,
            style: 'primary',
          },
        ],
      },
    ],
  };
}

/**
 * Workspace-label copy keyed by every platform in `AUTO_PROVISION_PLATFORMS`.
 * Adding a future auto-provision platform without a label here fails the
 * type check at the map literal — exactly where you want the reminder.
 */
const CAPACITY_PLATFORM_LABELS: Record<AutoProvisionPlatform, string> = {
  [AgentPlatformEnum.SLACK]: 'Slack workspace',
  [AgentPlatformEnum.TEAMS]: 'Teams workspace',
};

function buildCapacityReachedCard(platform: AutoProvisionPlatform): CardElement {
  return {
    type: 'card',
    children: [
      {
        type: 'text',
        content: `This ${CAPACITY_PLATFORM_LABELS[platform]} has reached the agent capacity included with your current Novu plan. Ask your workspace admin to invite you, or upgrade to a higher tier to keep this agent available to new teammates.`,
      },
      { type: 'divider' },
      {
        type: 'actions',
        children: [
          {
            type: 'link-button',
            label: 'View Novu pricing',
            url: NOVU_PRICING_URL,
            style: 'primary',
          },
        ],
      },
    ],
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function getMessageRawEvent(message: Message): Record<string, unknown> | undefined {
  const raw = asRecord(message.raw);

  return asRecord(raw?.event) ?? raw;
}

function resolveInboundFirstMessageText(platform: AgentPlatformEnum, message: Message): string {
  const preview = getInboundActivityPreview(message.text, {
    hasPlatformAttachments: Boolean(message.attachments?.length),
  });

  if (preview.trim().length > 0) {
    return preview;
  }

  if (platform === AgentPlatformEnum.EMAIL) {
    const raw = asRecord(message.raw);
    const subject = typeof raw?.subject === 'string' ? raw.subject.trim() : '';

    if (subject.length > 0) {
      return subject;
    }
  }

  return preview;
}

function getInboundPlatformThreadId(platform: AgentPlatformEnum, thread: Thread, message: Message): string {
  const rawEvent = getMessageRawEvent(message);
  const rawThreadTs = rawEvent?.thread_ts;
  const threadRoot = typeof rawThreadTs === 'string' && rawThreadTs.length > 0 ? rawThreadTs : message.id;

  if (platform !== AgentPlatformEnum.SLACK || !thread.isDM || !threadRoot || !thread.id.endsWith(':')) {
    return thread.id;
  }

  return `${thread.id}${threadRoot}`;
}

function mapStoredAttachmentsFromRichContent(richContent?: Record<string, unknown>): StoredAttachment[] {
  const rawAttachments = richContent?.attachments;

  if (!Array.isArray(rawAttachments)) {
    return [];
  }

  return rawAttachments.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const attachment = item as Record<string, unknown>;
    const storageKey = attachment.storageKey;

    if (typeof storageKey !== 'string' || storageKey.length === 0) {
      return [];
    }

    return [
      {
        type: typeof attachment.type === 'string' ? attachment.type : 'file',
        name: typeof attachment.name === 'string' ? attachment.name : undefined,
        mimeType: typeof attachment.mimeType === 'string' ? attachment.mimeType : undefined,
        size: typeof attachment.size === 'number' ? attachment.size : undefined,
        storageKey,
        url: typeof attachment.url === 'string' ? attachment.url : undefined,
      },
    ];
  });
}

function findSourceMessageStoredAttachments(
  history: ConversationActivityEntity[],
  messageIds: string[]
): StoredAttachment[] | undefined {
  const messageIdSet = new Set(messageIds);
  const sourceActivity = history.find(
    (activity) => activity.platformMessageId && messageIdSet.has(activity.platformMessageId)
  );

  if (!sourceActivity) {
    return undefined;
  }

  const storedAttachments = mapStoredAttachmentsFromRichContent(sourceActivity.richContent);

  if (!storedAttachments.length) {
    return undefined;
  }

  return storedAttachments;
}

export interface InboundReactionEvent {
  emoji: EmojiValue;
  added: boolean;
  messageId: string;
  message?: Message;
  thread?: Thread;
  user?: { userId: string; fullName?: string; userName?: string };
}

@Injectable()
export class AgentInboundHandler implements OnModuleInit {
  constructor(
    private readonly logger: PinoLogger,
    private readonly subscriberResolver: AgentSubscriberResolver,
    private readonly conversationService: AgentConversationService,
    private readonly runtimeResolver: RuntimeResolver,
    private readonly inboundDispatcher: InboundDispatcher,
    private readonly outboundGateway: OutboundGateway,
    private readonly agentRepository: AgentRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly analyticsService: AnalyticsService,
    private readonly attachmentStorage: AgentAttachmentStorage,
    private readonly startCodeService: TelegramStartCodeService,
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly linkTelegramChatToSubscriber: LinkTelegramChatToSubscriber,
    private readonly connectClaimTokenService: ConnectClaimTokenService,
    private readonly keylessAbuseGuard: KeylessAbuseGuardService,
    private readonly inboundAck: InboundAckService
  ) {
    this.logger.setContext(this.constructor.name);
  }

  onModuleInit() {
    this.inboundDispatcher.registerInboundCallbacks({
      onMessage: (agentId, config, thread, message) =>
        this.handle(agentId, config, thread, message, AgentEventEnum.ON_MESSAGE),
      onAction: (agentId, config, thread, action, userId) => this.handleAction(agentId, config, thread, action, userId),
      onReaction: (agentId, config, event) => this.handleReaction(agentId, config, event),
    });
  }

  async handle(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    message: Message,
    event: AgentEventEnum
  ): Promise<void> {
    if (await this.consumeTelegramStartLink(agentId, config, thread, message)) {
      return;
    }

    let subscriberId: string | null;
    try {
      subscriberId = isAutoProvisionPlatform(config.platform)
        ? await this.subscriberResolver.resolveOrProvision({
            environmentId: config.environmentId,
            organizationId: config.organizationId,
            platform: config.platform,
            platformUserId: message.author.userId,
            integrationIdentifier: config.integrationIdentifier,
            agentIdentifier: config.agentIdentifier,
            authorFullName: message.author.fullName,
            authorUserName: message.author.userName,
            // chat-sdk types isBot as `boolean | "unknown"`; treat anything except `true` as a non-bot author.
            authorIsBot: message.author.isBot === true,
          })
        : await this.resolveSubscriberId(agentId, config, message.author.userId, 'resolve-subscriber');
    } catch (err) {
      if (err instanceof BotAuthorSkippedError) {
        this.logger.debug(
          `[agent:${agentId}] Inbound from bot author ${config.platform}:${message.author.userId} skipped without dispatch`
        );

        return;
      }

      if (err instanceof ConnectOrgSubscriberCapExceededError) {
        this.logger.warn(
          { agentId, organizationId: config.organizationId, count: err.count, limit: err.limit },
          'Connect org at auto-provisioned subscriber cap — posting tier-upgrade card and skipping dispatch.'
        );
        await this.postCapacityReachedReply(agentId, config, thread, message);

        return;
      }

      /**
       * Only `resolveOrProvision` (SLACK / TEAMS) can reach here — the
       * `resolveSubscriberId` read path soft-fails to `null` internally and
       * never throws. For auto-provision platforms an unknown error means we
       * don't know the subscriber state, so we keep dispatch off and surface
       * the failure rather than silently degrading to a PLATFORM_USER
       * participant the removed-anonymous-state contract was meant to eliminate.
       */
      captureAgentWarning(err, { component: 'agent-inbound-handler', operation: 'resolve-subscriber', agentId });

      throw err;
    }

    const platformThreadId = getInboundPlatformThreadId(config.platform, thread, message);
    const conversation = await this.openConversation(agentId, config, message, subscriberId, platformThreadId);

    if (config.isKeyless) {
      const aiEnabled = await this.keylessAbuseGuard.isKeylessAgentAiEnabled(config.organizationId);

      if (!aiEnabled) {
        await this.postKeylessSignupCta(agentId, config, thread, conversation._id);

        return;
      }

      if (await this.connectClaimTokenService.isSignupCtaPosted(conversation._id)) {
        return;
      }

      if (await this.isKeylessDemoCapReached(config, conversation._id)) {
        await this.postKeylessSignupCta(agentId, config, thread, conversation._id);

        return;
      }
    }

    const storedAttachments = await this.storeInboundAttachments(config, conversation, message);
    const isFirstMessage = !this.conversationService.getPrimaryChannel(conversation).firstPlatformMessageId;

    await this.recordInboundMessage(agentId, config, conversation, message, {
      subscriberId,
      platformThreadId,
      storedAttachments,
      event,
      isFirstMessage,
    });

    const [subscriber, history, agent] = await Promise.all([
      subscriberId
        ? this.subscriberRepository.findBySubscriberId(config.environmentId, subscriberId)
        : Promise.resolve(null),
      this.conversationService.getHistory(config.environmentId, conversation._id),
      this.agentRepository.findOne({ _id: agentId, _environmentId: config.environmentId }, [
        '_id',
        'runtime',
        'managedRuntime',
      ]),
    ]);

    if (!config.isManaged) {
      await this.inboundAck.showWorkingSignal({
        agentId,
        config,
        platformThreadId,
        platformMessageId: message?.id,
        isFirstMessage,
      });
    }

    const runtime = this.runtimeResolver.resolve(agent);
    const turn: ConversationTurn = {
      agentId,
      agent: agent ?? { _id: agentId },
      config,
      conversation,
      subscriber,
      history,
      message,
      event,
      thread,
      platformThreadId,
      storedAttachments: message.attachments?.length ? storedAttachments : undefined,
    };

    await runtime.dispatch(turn);
  }

  /** Telegram `/start <code>` is control input; when present it is always consumed here. */
  private async consumeTelegramStartLink(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    message: Message
  ): Promise<boolean> {
    if (config.platform !== AgentPlatformEnum.TELEGRAM) {
      return false;
    }

    const startToken = extractTelegramStartToken(message.text);
    if (!startToken) {
      return false;
    }

    return this.handleTelegramSubscriberLink(agentId, config, thread, message, startToken);
  }

  private async openConversation(
    agentId: string,
    config: ResolvedAgentConfig,
    message: Message,
    subscriberId: string | null,
    platformThreadId: string
  ): Promise<ConversationEntity> {
    const participantId = subscriberId ?? `${config.platform}:${message.author.userId}`;
    const participantType = subscriberId
      ? ConversationParticipantTypeEnum.SUBSCRIBER
      : ConversationParticipantTypeEnum.PLATFORM_USER;

    return this.conversationService.createOrGetConversation({
      environmentId: config.environmentId,
      organizationId: config.organizationId,
      agentId,
      platform: config.platform,
      integrationId: config.integrationId,
      platformThreadId,
      participantId,
      participantType,
      platformUserId: message.author.userId,
      firstMessageText: resolveInboundFirstMessageText(config.platform, message),
    });
  }

  private async storeInboundAttachments(
    config: ResolvedAgentConfig,
    conversation: ConversationEntity,
    message: Message
  ): Promise<StoredAttachment[] | undefined> {
    if (!message.attachments?.length) {
      return undefined;
    }

    return this.attachmentStorage.storeInbound(message.attachments, {
      organizationId: config.organizationId,
      environmentId: config.environmentId,
      conversationId: String(conversation._id),
      platformMessageId: message.id ?? `unknown-${Date.now()}`,
      platform: config.platform,
    });
  }

  /** Persist the inbound activity, emit analytics, and capture the first platform message id. */
  private async recordInboundMessage(
    agentId: string,
    config: ResolvedAgentConfig,
    conversation: ConversationEntity,
    message: Message,
    context: {
      subscriberId: string | null;
      platformThreadId: string;
      storedAttachments?: StoredAttachment[];
      event: AgentEventEnum;
      isFirstMessage: boolean;
    }
  ): Promise<void> {
    const { subscriberId, platformThreadId, storedAttachments, event, isFirstMessage } = context;
    const senderType = subscriberId
      ? ConversationActivitySenderTypeEnum.SUBSCRIBER
      : ConversationActivitySenderTypeEnum.PLATFORM_USER;
    const richContent = storedAttachments?.length
      ? {
          attachments: storedAttachments.map(({ type, name, mimeType, size, storageKey }) => ({
            type,
            name,
            mimeType,
            size,
            storageKey,
          })),
        }
      : undefined;

    await this.conversationService.persistInboundMessage({
      conversationId: conversation._id,
      platform: config.platform,
      integrationId: config.integrationId,
      platformThreadId,
      senderType,
      senderId: subscriberId ?? `${config.platform}:${message.author.userId}`,
      senderName: message.author.fullName,
      content: message.text,
      richContent,
      hasPlatformAttachments: Boolean(message.attachments?.length),
      platformMessageId: message.id,
      environmentId: config.environmentId,
      organizationId: config.organizationId,
    });

    trackAgentInboundMessage(this.analyticsService, {
      organizationId: config.organizationId,
      environmentId: config.environmentId,
      agentId,
      agentIdentifier: config.agentIdentifier,
      integrationIdentifier: config.integrationIdentifier,
      platform: config.platform,
      conversationId: conversation._id,
      agentEvent: event,
      isFirstMessageInThread: isFirstMessage,
    });

    if (isFirstMessage && message.id) {
      /*
       * Reflect the first message id on the in-memory conversation immediately so
       * downstream context builders (e.g. platformContext.email.rootMessageId) read
       * a consistent value within this turn, even though the DB write below is
       * fire-and-forget.
       */
      this.conversationService.getPrimaryChannel(conversation).firstPlatformMessageId = message.id;

      this.conversationService
        .setFirstPlatformMessageId(
          config.environmentId,
          config.organizationId,
          conversation._id,
          platformThreadId,
          message.id
        )
        .catch((err) => {
          this.logger.warn(err, `[agent:${agentId}] Failed to store firstPlatformMessageId`);
          captureAgentWarning(err, {
            component: 'agent-inbound-handler',
            operation: 'store-first-platform-message-id',
            agentId,
          });
        });
    }
  }

  private async resolveSubscriberId(
    agentId: string,
    config: ResolvedAgentConfig,
    platformUserId: string,
    operation: string
  ): Promise<string | null> {
    return this.subscriberResolver
      .resolveOnly({
        environmentId: config.environmentId,
        organizationId: config.organizationId,
        platform: config.platform,
        platformUserId,
        integrationIdentifier: config.integrationIdentifier,
      })
      .catch((err) => {
        this.logger.warn(err, `[agent:${agentId}] Subscriber resolution failed (${operation}), continuing without it`);
        captureAgentWarning(err, { component: 'agent-inbound-handler', operation, agentId });

        return null;
      });
  }

  /**
   * Process a Telegram `/start <code>` deep-link payload as a subscriber-link
   * request. `/start <code>` is control input and is always consumed here —
   * the handler never falls through to normal bridge processing so the code
   * cannot be persisted or forwarded as regular content.
   */
  private async handleTelegramSubscriberLink(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    message: Message,
    code: string
  ): Promise<boolean> {
    const chatId = extractTelegramChatId(thread);
    if (!chatId) {
      this.logger.warn(
        `[agent:${agentId}] Telegram /start payload received but channelId is missing — dropping as invalid control input`
      );
      await this.safePostInboundReply(thread, SUBSCRIBER_LINK_INVALID_REPLY, agentId, message);

      return true;
    }

    const result = await this.startCodeService.consumeIfMatches(code, {
      environmentId: config.environmentId,
      organizationId: config.organizationId,
      integrationId: config.integrationId,
      agentIdentifier: config.agentIdentifier,
    });

    if (result.status === 'mismatch') {
      await this.safePostInboundReply(thread, SUBSCRIBER_LINK_WRONG_BOT_REPLY, agentId, message);

      return true;
    }

    if (result.status === 'consumed') {
      const { payload } = result;
      try {
        const linkResult = await this.linkTelegramChatToSubscriber.execute(
          LinkTelegramChatToSubscriberCommand.create({
            environmentId: payload._environmentId,
            organizationId: payload._organizationId,
            agentIdentifier: payload.agentIdentifier,
            integrationId: payload._integrationId,
            subscriberId: payload.subscriberId,
            chatId,
          })
        );

        const reply = linkResult.created ? SUBSCRIBER_LINK_SUCCESS_REPLY : SUBSCRIBER_LINK_DUPLICATE_REPLY;
        await this.safePostInboundReply(thread, reply, agentId, message);
      } catch (err) {
        if (err instanceof NotFoundException) {
          await this.safePostInboundReply(thread, SUBSCRIBER_LINK_INVALID_REPLY, agentId, message);
        } else {
          this.logger.error(err, `[agent:${agentId}] Unexpected failure linking Telegram chat to subscriber`);
          captureAgentException(err, {
            component: 'agent-inbound-handler',
            operation: 'link-telegram-subscriber',
            agentId,
          });
          await this.safePostInboundReply(thread, SUBSCRIBER_LINK_INVALID_REPLY, agentId, message);
        }
      }

      return true;
    }

    const existing = await this.channelEndpointRepository.findByPlatformIdentity({
      _environmentId: config.environmentId,
      _organizationId: config.organizationId,
      integrationIdentifier: config.integrationIdentifier,
      type: ENDPOINT_TYPES.TELEGRAM_CHAT,
      endpointField: 'chatId',
      endpointValue: chatId,
    });

    const reply = existing ? SUBSCRIBER_LINK_DUPLICATE_REPLY : SUBSCRIBER_LINK_EXPIRED_REPLY;
    await this.safePostInboundReply(thread, reply, agentId, message);

    return true;
  }

  private async safePostInboundReply(thread: Thread, text: string, agentId: string, message: Message): Promise<void> {
    try {
      await this.outboundGateway.replyOnThread(thread, { markdown: text });
    } catch (err) {
      this.logger.warn(
        err,
        `[agent:${agentId}] Failed to post Telegram subscriber-link reply for inbound message ${message.id ?? '<unknown>'}`
      );
      captureAgentWarning(err, {
        component: 'agent-inbound-handler',
        operation: 'post-telegram-subscriber-link-reply',
        agentId,
      });
    }
  }

  /**
   * Surface the tier-upgrade prompt when the Connect-org auto-provisioned
   * subscriber cap is hit. Posted on the live inbound thread via the outbound
   * gateway (mirrors `safePostInboundReply`). Errors are logged but swallowed —
   * failing to post the capacity card should not crash the inbound webhook.
   */
  private async postCapacityReachedReply(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    message: Message
  ): Promise<void> {
    /**
     * `ConnectOrgSubscriberCapExceededError` is only thrown by
     * `resolveOrProvision`, which itself only runs for `AUTO_PROVISION_PLATFORMS`.
     * The cast narrows `config.platform` to the union the card builder accepts
     * and keeps the exhaustive-record check honest.
     */
    const platform = config.platform as AutoProvisionPlatform;

    try {
      await this.outboundGateway.replyOnThread(thread, {
        card: buildCapacityReachedCard(platform) as unknown as Record<string, unknown>,
      });
    } catch (err) {
      this.logger.warn(
        err,
        `[agent:${agentId}] Failed to post auto-provision capacity-reached card for inbound message ${message.id ?? '<unknown>'}`
      );
      captureAgentWarning(err, {
        component: 'agent-inbound-handler',
        operation: 'post-capacity-reached-card',
        agentId,
        platform: config.platform,
      });
    }
  }

  private async isKeylessDemoCapReached(config: ResolvedAgentConfig, conversationId: string): Promise<boolean> {
    const agentReplies = await this.conversationService.countAgentMessages(config.environmentId, conversationId);

    return agentReplies >= KEYLESS_DEMO_REPLY_CAP;
  }

  private async postKeylessSignupCta(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    conversationId: string
  ): Promise<void> {
    try {
      if (await this.connectClaimTokenService.isSignupCtaPosted(conversationId)) {
        return;
      }

      const { token } = await this.connectClaimTokenService.issueOrGetForEnvironment({
        env: config.environmentId,
        org: config.organizationId,
      });
      const claimUrl = `${resolveConnectClaimBaseUrl()}/connect/claim?token=${encodeURIComponent(token)}`;

      await this.outboundGateway.replyOnThread(thread, {
        card: buildKeylessSignupCard(claimUrl) as unknown as Record<string, unknown>,
      });

      await this.connectClaimTokenService.tryMarkSignupCtaPosted(conversationId);
    } catch (err) {
      this.logger.warn(err, `[agent:${agentId}] Failed to post keyless signup CTA`);
      captureAgentWarning(err, {
        component: 'agent-inbound-handler',
        operation: 'post-keyless-signup-cta',
        agentId,
      });
    }
  }

  async handleReaction(agentId: string, config: ResolvedAgentConfig, event: InboundReactionEvent): Promise<void> {
    const threadId = event.thread?.id;
    if (!threadId) {
      this.logger.warn(`[agent:${agentId}] Reaction received without thread context, skipping`);

      return;
    }

    const conversation = await this.conversationService.findByPlatformThread(
      config.environmentId,
      config.organizationId,
      config.agentId,
      config.integrationId,
      threadId
    );

    if (!conversation) {
      return;
    }

    trackAgentInboundReaction(this.analyticsService, {
      organizationId: config.organizationId,
      environmentId: config.environmentId,
      agentId,
      agentIdentifier: config.agentIdentifier,
      integrationIdentifier: config.integrationIdentifier,
      platform: config.platform,
      conversationId: conversation._id,
    });

    const platformUserId = event.user?.userId;

    const subscriberId = platformUserId
      ? await this.resolveSubscriberId(agentId, config, platformUserId, 'resolve-subscriber-reaction')
      : null;

    const [subscriber, history] = await Promise.all([
      subscriberId
        ? this.subscriberRepository.findBySubscriberId(config.environmentId, subscriberId)
        : Promise.resolve(null),
      this.conversationService.getHistory(config.environmentId, conversation._id),
    ]);

    const sourceMessageIds = [event.messageId, event.message?.id].filter((id): id is string => Boolean(id));
    let sourceMessageStoredAttachments = findSourceMessageStoredAttachments(history, sourceMessageIds);

    if (!sourceMessageStoredAttachments && event.message?.attachments?.length) {
      sourceMessageStoredAttachments = await this.attachmentStorage.storeInbound(event.message.attachments, {
        organizationId: config.organizationId,
        environmentId: config.environmentId,
        conversationId: String(conversation._id),
        platformMessageId: event.message.id ?? event.messageId ?? `unknown-${Date.now()}`,
        platform: config.platform,
      });
    }

    const reactionPayload: BridgeReaction = {
      emoji: event.emoji.name,
      added: event.added,
      messageId: event.messageId,
      sourceMessage: event.message,
      sourceMessageStoredAttachments: sourceMessageStoredAttachments?.length
        ? sourceMessageStoredAttachments
        : undefined,
    };

    const runtime = this.runtimeResolver.resolve(null);
    const turn: ConversationTurn = {
      agentId,
      agent: { _id: agentId },
      config,
      conversation,
      subscriber,
      history,
      message: null,
      event: AgentEventEnum.ON_REACTION,
      thread: event.thread ?? ({ id: threadId, channelId: '', isDM: false } as Thread),
      platformThreadId: threadId,
      reaction: reactionPayload,
    };

    await runtime.dispatch(turn);
  }

  async handleAction(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    action: AgentAction,
    userId: string
  ): Promise<void> {
    const subscriberId = await this.resolveSubscriberId(agentId, config, userId, 'resolve-subscriber-action');

    const participantId = subscriberId ?? `${config.platform}:${userId}`;
    const participantType = subscriberId
      ? ConversationParticipantTypeEnum.SUBSCRIBER
      : ConversationParticipantTypeEnum.PLATFORM_USER;

    const conversation = await this.conversationService.createOrGetConversation({
      environmentId: config.environmentId,
      organizationId: config.organizationId,
      agentId,
      platform: config.platform,
      integrationId: config.integrationId,
      platformThreadId: thread.id,
      participantId,
      participantType,
      platformUserId: userId,
      firstMessageText: `[action:${action.id}]`,
    });

    trackAgentInboundAction(this.analyticsService, {
      organizationId: config.organizationId,
      environmentId: config.environmentId,
      agentId,
      agentIdentifier: config.agentIdentifier,
      integrationIdentifier: config.integrationIdentifier,
      platform: config.platform,
      conversationId: conversation._id,
      actionId: action.id,
    });

    // Link buttons open a URL client-side; the SDK still emits an action for the
    // click but there is nothing to handle server-side. Swallow it for every runtime.
    if (isLinkButtonActionId(action.id)) {
      return;
    }

    // Everything else (incl. mcp-approval:* for managed) routes through the runtime,
    // which owns its own action semantics.
    const [subscriber, history, agent] = await Promise.all([
      subscriberId
        ? this.subscriberRepository.findBySubscriberId(config.environmentId, subscriberId)
        : Promise.resolve(null),
      this.conversationService.getHistory(config.environmentId, conversation._id),
      this.agentRepository.findOne({ _id: agentId, _environmentId: config.environmentId }, [
        '_id',
        'runtime',
        'managedRuntime',
      ]),
    ]);

    const runtime = this.runtimeResolver.resolve(agent);
    const turn: ConversationTurn = {
      agentId,
      agent: agent ?? { _id: agentId },
      config,
      conversation,
      subscriber,
      history,
      message: null,
      event: AgentEventEnum.ON_ACTION,
      thread,
      platformThreadId: thread.id,
      action,
    };

    await runtime.dispatch(turn);
  }
}
