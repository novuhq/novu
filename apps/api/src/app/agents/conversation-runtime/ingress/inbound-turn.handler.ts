import { Injectable, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { AnalyticsService, PinoLogger } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  ChannelEndpointRepository,
  ConversationActivityEntity,
  ConversationActivitySenderTypeEnum,
  ConversationEntity,
  ConversationParticipantTypeEnum,
  MessageEntity,
  MessageRepository,
  NotificationRepository,
  SubscriberRepository,
} from '@novu/dal';
import type { AgentAction } from '@novu/framework';
import { parseApprovalActionId } from '@novu/framework/internal';
import { ENDPOINT_TYPES } from '@novu/shared';
import type { CardElement, EmojiValue, Message, Thread } from 'chat';
import { ConnectClaimTokenService } from '../../../connect/services/connect-claim-token.service';
import { parsePositiveIntEnv } from '../../../keyless/keyless-abuse.constants';
import { KeylessAbuseGuardService } from '../../../keyless/keyless-abuse-guard.service';
import { buildConnectClaimUrl, buildKeylessSignupCard } from '../../../keyless/keyless-signup.helpers';
import { LinkTelegramChatToSubscriberCommand } from '../../../telegram-linking/link-telegram-chat-to-subscriber/link-telegram-chat-to-subscriber.command';
import { LinkTelegramChatToSubscriber } from '../../../telegram-linking/link-telegram-chat-to-subscriber/link-telegram-chat-to-subscriber.usecase';
import { agentTelegramLinkScope } from '../../../telegram-linking/telegram-link-scope';
import { TelegramStartCodeService } from '../../../telegram-linking/telegram-start-code.service';
import { ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import {
  trackAgentInboundAction,
  trackAgentInboundMessage,
  trackAgentInboundReaction,
  trackAgentIntegrationFirstWebhook,
} from '../../shared/analytics/agent-analytics';
import { AgentEventEnum } from '../../shared/enums/agent-event.enum';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { captureAgentException, captureAgentWarning } from '../../shared/errors/capture-agent-sentry';
import { parseToolApprovalActionId } from '../../shared/tool-approval/action-id';
import { getResolvedSubscriberId, type SubscriberResolution } from '../../shared/types/subscriber-resolution';
import { agentLinkAwaitingInboundConnectionFilter } from '../../shared/util/agent-inbound-connection';
import { extractMsTeamsTenantId } from '../../shared/util/msteams-activity';
import { type AutoProvisionPlatform, shouldAutoProvisionInbound } from '../../shared/util/platform-endpoint-config';
import { extractWorkspaceId } from '../../shared/util/workspace-id';
import { InboundAckService } from '../ack/inbound-ack.service';
import { AgentAttachmentStorage, type StoredAttachment } from '../conversation/agent-attachment-storage.service';
import {
  AgentConversationService,
  type CreateOrGetConversationParams,
  getInboundActivityPreview,
} from '../conversation/agent-conversation.service';
import {
  AgentSubscriberResolver,
  BotAuthorSkippedError,
  ConnectOrgSubscriberCapExceededError,
} from '../conversation/agent-subscriber-resolver.service';
import { OutboundGateway } from '../egress/outbound.gateway';
import { maybeReplyUnresolvedSubscriberAccess } from '../reply/maybe-reply-unresolved-subscriber-access';
import type { BridgeReaction } from '../runtime/bridge-executor.service';
import type { ConversationTurn } from '../runtime/conversation-turn';
import { RuntimeResolver } from '../runtime/runtime-resolver.service';
import { InboundDispatcher } from './inbound.dispatcher';
import { InboundConnectionContextResolver } from './inbound-connection-context.resolver';
import { isLinkButtonActionId, PlanLimitGateService } from './plan-limit-gate.service';
import { ReplyApprovalInterceptor } from './reply-approval-interceptor.service';

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

function extractTelegramChatId(thread: Thread): string | null {
  const raw = thread.channelId;
  if (!raw) return null;
  // chat-sdk Telegram adapter exposes `chat.id` as the bare numeric id (string).
  // For safety against an upstream change to a namespaced form, peel off any
  // `telegram:` prefix before persistence so the value we store matches what
  // `TelegramChatProvider.sendMessage` will POST to the bot API.
  return raw.startsWith('telegram:') ? raw.slice('telegram:'.length) : raw;
}

const WORKFLOW_ORIGIN_CONTENT_MAX_CHARS = 2_000;

function buildWorkflowOriginSummary(
  workflowIdentifier: string,
  messageContent: string,
  payload: Record<string, unknown>
): string {
  const message =
    messageContent.length > 0 ? messageContent : `A notification was sent by the ${workflowIdentifier} workflow.`;
  const additionalData =
    Object.keys(payload).length > 0 ? `\n\nAdditional data for this message:\n${JSON.stringify(payload, null, 2)}` : '';

  return `${message}${additionalData}`.slice(0, WORKFLOW_ORIGIN_CONTENT_MAX_CHARS);
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

const KEYLESS_DEMO_REPLY_CAP = parsePositiveIntEnv(process.env.KEYLESS_DEMO_REPLY_CAP, 3);

/**
 * Workspace-label copy keyed by every platform in `AUTO_PROVISION_PLATFORMS`.
 * Adding a future auto-provision platform without a label here fails the
 * type check at the map literal — exactly where you want the reminder.
 */
const CAPACITY_PLATFORM_LABELS: Record<AutoProvisionPlatform, string> = {
  [AgentPlatformEnum.SLACK]: 'Slack workspace',
  [AgentPlatformEnum.TEAMS]: 'Teams workspace',
  [AgentPlatformEnum.TELEGRAM]: 'Telegram chat',
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

/**
 * An inbound email's sender identity is taken from the `From` header, which is
 * trivially spoofable. The upstream inbound-mail service verifies DKIM and SPF
 * and forwards the verdicts on the webhook payload (surfaced on `message.raw`).
 * The sender is only trusted when both verdicts are `'pass'`; anything else —
 * including a missing verdict on an older payload — is treated as unverified so
 * the resolver never maps a spoofed `From` onto a registered subscriber. Fails
 * closed by design.
 */
function isInboundEmailSenderVerified(raw: Record<string, unknown> | undefined): boolean {
  return raw?.dkim === 'pass' && raw?.spf === 'pass';
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

/** Conversation uses `slack:{channel}:{ts}`; Message.identifier stores bare `{channel}:{ts}`. */
function toProviderMessageLookupKey(platformThreadId: string): string {
  return platformThreadId.startsWith('slack:') ? platformThreadId.slice('slack:'.length) : platformThreadId;
}

/** Slack provider id is `{channel}:{ts}` — channel ids never contain `:`. */
function platformMessageIdFromProviderIdentifier(identifier: string): string | undefined {
  const colon = identifier.indexOf(':');
  if (colon <= 0 || colon === identifier.length - 1) {
    return undefined;
  }

  return identifier.slice(colon + 1);
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

function extractStoredAttachments(sourceActivity: ConversationActivityEntity | null): StoredAttachment[] | undefined {
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
  /** Raw platform payload, used to resolve the connect-time context (e.g. Slack `team_id`). */
  raw?: unknown;
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
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly analyticsService: AnalyticsService,
    private readonly attachmentStorage: AgentAttachmentStorage,
    private readonly startCodeService: TelegramStartCodeService,
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly linkTelegramChatToSubscriber: LinkTelegramChatToSubscriber,
    private readonly connectClaimTokenService: ConnectClaimTokenService,
    private readonly keylessAbuseGuard: KeylessAbuseGuardService,
    private readonly planLimitGate: PlanLimitGateService,
    private readonly inboundAck: InboundAckService,
    private readonly connectionContextResolver: InboundConnectionContextResolver,
    private readonly replyApprovalInterceptor: ReplyApprovalInterceptor,
    private readonly notificationRepository: NotificationRepository,
    private readonly messageRepository: MessageRepository
  ) {
    this.logger.setContext(this.constructor.name);
  }

  onModuleInit() {
    this.inboundDispatcher.registerInboundCallbacks({
      onMessage: (agentId, config, thread, message) =>
        this.handle(agentId, config, thread, message, AgentEventEnum.ON_MESSAGE),
      onAction: (agentId, config, thread, action, userId, rawEvent) =>
        this.handleAction(agentId, config, thread, action, userId, rawEvent),
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

    if (await this.planLimitGate.maybeBlock(agentId, config, thread)) {
      return;
    }

    const emailAuthRaw = config.platform === AgentPlatformEnum.EMAIL ? asRecord(message.raw) : undefined;
    const isVerifiedEmailSender =
      config.platform !== AgentPlatformEnum.EMAIL || isInboundEmailSenderVerified(emailAuthRaw);

    // Open-access agents may lookup-or-provision; restricted stay lookup-only.
    // Keyless email demos stay lookup-only until tool approval.
    const telegramChatId = config.platform === AgentPlatformEnum.TELEGRAM ? extractTelegramChatId(thread) : undefined;
    const canAutoProvision = shouldAutoProvisionInbound({
      platform: config.platform,
      subscriberAccess: config.subscriberAccess,
      isManaged: config.isManaged,
      isKeyless: config.isKeyless,
      isTelegramDm: telegramChatId != null && telegramChatId === message.author.userId,
    });

    let resolution: SubscriberResolution;
    try {
      if (!isVerifiedEmailSender) {
        this.logger.warn(
          {
            agentId,
            organizationId: config.organizationId,
            environmentId: config.environmentId,
            fromAddress: message.author.userId,
            dkim: emailAuthRaw?.dkim,
            spf: emailAuthRaw?.spf,
            messageId: message.id,
            subscriberAccess: config.subscriberAccess,
            isKeyless: config.isKeyless,
            canAutoProvision,
          },
          'Inbound email sender failed DKIM/SPF verification — skipping subscriber resolution so a spoofed From cannot assume an existing identity.'
        );
        resolution = { outcome: 'not_found' };
      } else if (canAutoProvision) {
        resolution = await this.subscriberResolver.resolveOrProvision({
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
          // Teams multi-tenant: capture the user's tenant from the inbound activity so the endpoint
          // records which (possibly external customer) tenant the user belongs to.
          platformTenantId:
            config.platform === AgentPlatformEnum.TEAMS ? extractMsTeamsTenantId(message.raw) : undefined,
        });
      } else {
        resolution = await this.resolveSubscriber({
          agentId,
          config,
          platformUserId: message.author.userId,
          operation: 'resolve-subscriber',
          authorIsBot: message.author.isBot === true,
        });
      }
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
       * Only `resolveOrProvision` on open-access Slack / Teams / Telegram /
       * email / WhatsApp / Sendblue can reach here - the `resolveSubscriber` read path
       * maps its own failures to an `error` outcome internally and never throws.
       * For auto-provision platforms an unknown error means we don't know the
       * subscriber state, so we keep dispatch off and surface the failure rather
       * than silently degrading to a PLATFORM_USER participant the
       * removed-anonymous-state contract was meant to eliminate.
       */
      captureAgentWarning(err, { component: 'agent-inbound-handler', operation: 'resolve-subscriber', agentId });

      throw err;
    }

    const subscriberId = getResolvedSubscriberId(resolution);

    // A genuine, non-bot user has messaged the agent (bot-authored echoes threw
    // `BotAuthorSkippedError` above). This — not the raw webhook POST — is what
    // marks the agent–integration link connected and completes onboarding.
    await this.markIntegrationConnectedOnFirstMessage(agentId, config);

    const platformThreadId = getInboundPlatformThreadId(config.platform, thread, message);

    // Resolve whether this thread already has a conversation *before* creating
    // one. The free-tier active-conversations gate must run before persistence
    // so a blocked brand-new thread never leaves an orphaned Conversation and
    // participants. Existing threads pass their entity so reopen / new-cycle
    // activations are still gated (and they carry no orphan risk).
    const existingConversation = await this.conversationService.findByPlatformThread(
      config.environmentId,
      config.organizationId,
      agentId,
      config.integrationId,
      platformThreadId
    );

    // Free-tier active-conversations short-circuit: block engagements that would
    // start a *new* active conversation once the included limit is reached.
    // Existing (already-counted) conversations keep working.
    if (await this.planLimitGate.maybeBlockConversation(agentId, config, thread, existingConversation ?? undefined)) {
      return;
    }

    // Persist only after the gate. For an existing thread this reconciles
    // participants and reopens a RESOLVED conversation; for a brand-new one it
    // creates the Conversation that the gate just cleared and hydrates any
    // workflow-origin Message that seeded the thread.
    const conversation = await this.openConversationAndMaybeHydrateOrigin(
      agentId,
      config,
      existingConversation,
      platformThreadId,
      subscriberId,
      {
        environmentId: config.environmentId,
        organizationId: config.organizationId,
        agentId,
        platform: config.platform,
        integrationId: config.integrationId,
        platformThreadId,
        participantId: subscriberId ?? `${config.platform}:${message.author.userId}`,
        participantType: subscriberId
          ? ConversationParticipantTypeEnum.SUBSCRIBER
          : ConversationParticipantTypeEnum.PLATFORM_USER,
        platformUserId: message.author.userId,
        firstMessageText: resolveInboundFirstMessageText(config.platform, message),
        isDirectMessage: thread.isDM,
        workspaceId: extractWorkspaceId(config.platform, message.raw) ?? undefined,
        identifier: this.webChatConversationIdentifier(config.platform, platformThreadId),
      }
    );

    if (config.isKeyless) {
      const aiEnabled = await this.keylessAbuseGuard.isKeylessAgentAiEnabled(config.organizationId);

      if (!aiEnabled) {
        await this.postKeylessSignupCta(agentId, config, thread, conversation);

        return;
      }

      if (await this.connectClaimTokenService.isSignupCtaPosted(conversation._id)) {
        return;
      }

      if (await this.isKeylessDemoCapReached(config, conversation._id)) {
        await this.postKeylessSignupCta(agentId, config, thread, conversation);

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

    const [subscriber, agent] = await Promise.all([
      subscriberId
        ? this.subscriberRepository.findBySubscriberId(config.environmentId, subscriberId)
        : Promise.resolve(null),
      this.agentRepository.findOne({ _id: agentId, _environmentId: config.environmentId }, [
        '_id',
        'runtime',
        'managedRuntime',
      ]),
    ]);

    // An id that resolved but whose Subscriber record cannot be loaded is an
    // internal inconsistency, not a sender problem — reclassify so downstream
    // gates reply with the transient copy instead of rejecting the sender.
    if (resolution.outcome === 'resolved' && !subscriber) {
      resolution = {
        outcome: 'error',
        err: new Error(`Subscriber record ${resolution.subscriberId} not found after resolution`),
      };
    }

    const context = await this.connectionContextResolver.resolve(config, message.raw, message.author?.userId);

    const runtime = this.runtimeResolver.resolve(agent);
    const turn: ConversationTurn = {
      agentId,
      agent: agent ?? { _id: agentId },
      config,
      conversation,
      subscriber,
      context,
      subscriberResolution: resolution,
      message,
      event,
      thread,
      platformThreadId,
      storedAttachments: message.attachments?.length ? storedAttachments : undefined,
    };

    // On buttonless platforms (iMessage/SMS) a pending tool approval is
    // answered by texting back YES / NO — consume before the subscriber-access
    // gate so an unresolved/restricted sender can still settle a pending approval.
    if (
      event === AgentEventEnum.ON_MESSAGE &&
      (await this.replyApprovalInterceptor.tryHandleAsApprovalReply(turn, runtime))
    ) {
      return;
    }

    if (
      await maybeReplyUnresolvedSubscriberAccess({
        turn,
        logger: this.logger,
        outboundGateway: this.outboundGateway,
        conversationService: this.conversationService,
        emailSenderUnverified: !isVerifiedEmailSender,
      })
    ) {
      return;
    }

    if (!config.isManaged) {
      await this.inboundAck.showWorkingSignal({
        agentId,
        config,
        platformThreadId,
        platformMessageId: message?.id,
        isFirstMessage,
      });
    }

    await runtime.dispatch(turn);
  }

  /**
   * Record `connectedAt` the first time a real user messages the agent on this
   * integration. Gated on a genuine inbound message (the caller has already
   * filtered bot-authored events via `BotAuthorSkippedError`) so the agent's own
   * proactive messages — e.g. the post-install welcome DM, which Slack echoes
   * back to our webhook — never mark the integration connected. The conditional
   * `connectedAt: null` filter makes the write idempotent and fires the
   * analytics event exactly once. Placeholder epoch timestamps are treated as
   * unconnected so they can be self-healed on the next genuine inbound message.
   * Fail-soft: connection bookkeeping must never crash the inbound webhook.
   */
  private async markIntegrationConnectedOnFirstMessage(agentId: string, config: ResolvedAgentConfig): Promise<void> {
    try {
      const connectedAt = new Date();
      const { modified } = await this.agentIntegrationRepository.updateOne(
        {
          _environmentId: config.environmentId,
          _organizationId: config.organizationId,
          _agentId: agentId,
          _integrationId: config.integrationId,
          ...agentLinkAwaitingInboundConnectionFilter(),
        },
        { $set: { connectedAt } }
      );

      if (modified === 0) {
        return;
      }

      trackAgentIntegrationFirstWebhook(this.analyticsService, {
        organizationId: config.organizationId,
        environmentId: config.environmentId,
        agentId,
        agentIdentifier: config.agentIdentifier,
        integrationIdentifier: config.integrationIdentifier,
        platform: config.platform,
      });
    } catch (err) {
      this.logger.warn(err, `[agent:${agentId}] Failed to mark integration connected on first user message`);
      captureAgentWarning(err, {
        component: 'agent-inbound-handler',
        operation: 'mark-integration-connected',
        agentId,
      });
    }
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

  /**
   * Public conversation identifier is bare `conv_*`; chat-sdk thread ids are
   * `web_chat:conv_*` so the registry can resolve the adapter by prefix.
   */
  private webChatConversationIdentifier(platform: AgentPlatformEnum, platformThreadId: string): string | undefined {
    if (platform !== AgentPlatformEnum.WEB_CHAT) {
      return undefined;
    }

    return platformThreadId.startsWith('web_chat:') ? platformThreadId.slice('web_chat:'.length) : platformThreadId;
  }

  /** Create/reopen the conversation, then hydrate workflow-origin history if this turn opened a seeded thread. */
  private async openConversationAndMaybeHydrateOrigin(
    agentId: string,
    config: ResolvedAgentConfig,
    existingConversation: ConversationEntity | null,
    platformThreadId: string,
    subscriberId: string | null,
    createParams: Omit<CreateOrGetConversationParams, 'notificationId'>
  ): Promise<ConversationEntity> {
    const seededMessage = existingConversation
      ? null
      : await this.findWorkflowOriginMessage(agentId, config, platformThreadId, subscriberId);

    const conversation = await this.conversationService.createOrGetConversation({
      ...createParams,
      notificationId: seededMessage?._notificationId,
    });

    if (seededMessage) {
      await this.hydrateWorkflowOrigin(agentId, config, conversation, platformThreadId, seededMessage);
    }

    return conversation;
  }

  /** Outbound workflow Message that opened this thread, if any. Fail-soft — enrichment must not block the turn. */
  private async findWorkflowOriginMessage(
    agentId: string,
    config: ResolvedAgentConfig,
    platformThreadId: string,
    subscriberId: string | null
  ): Promise<MessageEntity | null> {
    if (!subscriberId) {
      return null;
    }

    try {
      const subscriber = await this.subscriberRepository.findBySubscriberId(config.environmentId, subscriberId);
      if (!subscriber) {
        return null;
      }

      const identifier = toProviderMessageLookupKey(platformThreadId);

      return await this.messageRepository.findByAgentIdentifier(
        config.environmentId,
        agentId,
        identifier,
        subscriber._id
      );
    } catch (err) {
      captureAgentWarning(err, {
        component: 'agent-inbound-handler',
        operation: 'lookup-workflow-origin-message',
        agentId,
      });
      this.logger.warn(
        { err, agentId, platformThreadId },
        'Failed to look up workflow origin message before conversation create'
      );

      return null;
    }
  }

  /** Write workflow-origin message + signal into conversation history. Fail-soft. */
  private async hydrateWorkflowOrigin(
    agentId: string,
    config: ResolvedAgentConfig,
    conversation: ConversationEntity,
    platformThreadId: string,
    originMessage: MessageEntity
  ): Promise<void> {
    if (!originMessage._notificationId || !originMessage.identifier) {
      return;
    }

    const platformMessageId = platformMessageIdFromProviderIdentifier(originMessage.identifier);
    if (!platformMessageId) {
      return;
    }

    try {
      const { content, originPayload } = await this.buildWorkflowOriginHydration(
        originMessage,
        conversation,
        config.environmentId,
        config.organizationId
      );

      await this.conversationService.persistWorkflowOriginHydration({
        conversationId: conversation._id,
        channel: this.conversationService.getPrimaryChannel(conversation),
        agentIdentifier: config.agentIdentifier,
        environmentId: config.environmentId,
        organizationId: config.organizationId,
        platformMessageId,
        platformThreadId,
        content,
        originPayload,
      });
    } catch (err) {
      captureAgentWarning(err, {
        component: 'agent-inbound-handler',
        operation: 'hydrate-workflow-origin',
        agentId,
      });
      this.logger.warn(
        { err, agentId, platformThreadId, messageId: originMessage._id, notificationId: originMessage._notificationId },
        'Failed to hydrate workflow origin into conversation history'
      );
    }
  }

  private async buildWorkflowOriginHydration(
    originMessage: MessageEntity,
    conversation: ConversationEntity,
    environmentId: string,
    organizationId: string
  ): Promise<{
    content: string;
    originPayload: Record<string, unknown>;
  }> {
    const notification = await this.notificationRepository.findOne(
      {
        _id: originMessage._notificationId,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      'payload'
    );

    const payload =
      notification?.payload && typeof notification.payload === 'object' && !Array.isArray(notification.payload)
        ? (notification.payload as Record<string, unknown>)
        : {};

    const storedContent = typeof originMessage.content === 'string' ? originMessage.content.trim() : '';
    const workflowIdentifier = originMessage.templateIdentifier || 'unknown';
    const content = buildWorkflowOriginSummary(workflowIdentifier, storedContent, payload);

    const subscriberId = conversation.participants.find(
      (p) => p.type === ConversationParticipantTypeEnum.SUBSCRIBER
    )?.id;

    return {
      content,
      originPayload: {
        notificationId: originMessage._notificationId,
        jobId: originMessage._jobId,
        messageId: originMessage._id,
        transactionId: originMessage.transactionId,
        workflowIdentifier,
        stepId: originMessage.stepId,
        subscriberId,
        payload,
      },
    };
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
      identifier: config.platform === AgentPlatformEnum.WEB_CHAT ? message.id : undefined,
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

  /**
   * Read-path resolution that never throws: lookup failures are mapped to an
   * `error` outcome instead of being flattened to `null`, so downstream gates
   * (and their logs) can tell "no such subscriber" apart from "resolution broke".
   */
  private async resolveSubscriber({
    agentId,
    config,
    platformUserId,
    operation,
    authorIsBot,
  }: {
    agentId: string;
    config: ResolvedAgentConfig;
    platformUserId: string;
    operation: string;
    authorIsBot: boolean;
  }): Promise<SubscriberResolution> {
    if (authorIsBot) {
      this.analyticsService.track('[Agent Platform] - Bot author inbound skipped', config.organizationId, {
        _organization: config.organizationId,
        environmentId: config.environmentId,
        platform: config.platform,
        agentIdentifier: config.agentIdentifier,
      });

      throw new BotAuthorSkippedError(config.platform, platformUserId);
    }

    try {
      return await this.subscriberResolver.resolveSubscriber({
        environmentId: config.environmentId,
        organizationId: config.organizationId,
        platform: config.platform,
        platformUserId,
        integrationIdentifier: config.integrationIdentifier,
      });
    } catch (err) {
      this.logger.warn(err, `[agent:${agentId}] Subscriber resolution failed (${operation}), continuing without it`);
      captureAgentWarning(err, { component: 'agent-inbound-handler', operation, agentId });

      return { outcome: 'error', err };
    }
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
      linkScope: agentTelegramLinkScope(config.agentIdentifier),
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
            linkScope: payload.linkScope,
            integrationId: payload._integrationId,
            subscriberId: payload.subscriberId,
            chatId,
            context: payload.context,
            contextKeys: payload.contextKeys,
          })
        );

        // `/start` only links the chat to the subscriber; Layer-1 onboarding completes on
        // the next genuine inbound message (handled in `handle()`), matching Slack's
        // "install ≠ connected" split and the dashboard "Send a test message" step.

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
     * `ConnectOrgSubscriberCapExceededError` is only thrown by the ChannelEndpoint
     * branch of `resolveOrProvision` (`AUTO_PROVISION_PLATFORMS`). Open-access
     * email/WhatsApp/Sendblue soft-fail instead. The cast narrows `config.platform` to
     * the union the card builder accepts and keeps the exhaustive-record check
     * honest.
     */
    const platform = config.platform as AutoProvisionPlatform;

    try {
      await this.outboundGateway.replyOnThreadWithCard(thread, buildCapacityReachedCard(platform));
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
    conversation: ConversationEntity
  ): Promise<void> {
    try {
      if (await this.connectClaimTokenService.isSignupCtaPosted(conversation._id)) {
        return;
      }

      const { token } = await this.connectClaimTokenService.issueOrGetForEnvironment({
        env: config.environmentId,
        org: config.organizationId,
      });
      const claimUrl = buildConnectClaimUrl(token);
      const channel = this.conversationService.getPrimaryChannel(conversation);
      const card = buildKeylessSignupCard(claimUrl);

      await this.outboundGateway.replyOnThreadWithCard(thread, card, {
        persist: {
          conversationId: conversation._id,
          channel,
          agentIdentifier: config.agentIdentifier,
          content: card.title ?? '[Card]',
          richContent: { card },
          environmentId: config.environmentId,
          organizationId: config.organizationId,
        },
      });

      await this.connectClaimTokenService.tryMarkSignupCtaPosted(conversation._id);
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

    const reactionResolution = platformUserId
      ? await this.resolveSubscriber({
          agentId,
          config,
          platformUserId,
          operation: 'resolve-subscriber-reaction',
          authorIsBot: false,
        })
      : undefined;
    const subscriberId = getResolvedSubscriberId(reactionResolution);

    const [subscriber, sourceActivity, agent] = await Promise.all([
      subscriberId
        ? this.subscriberRepository.findBySubscriberId(config.environmentId, subscriberId)
        : Promise.resolve(null),
      this.conversationService.findSourceActivity(config.environmentId, conversation._id, event.messageId),
      this.agentRepository.findOne({ _id: agentId, _environmentId: config.environmentId }, [
        '_id',
        'runtime',
        'managedRuntime',
      ]),
    ]);

    let sourceMessageStoredAttachments = extractStoredAttachments(sourceActivity);

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

    const context = await this.connectionContextResolver.resolve(config, event.raw, platformUserId);
    const runtime = this.runtimeResolver.resolve(agent);
    const turn: ConversationTurn = {
      agentId,
      agent: agent ?? { _id: agentId },
      config,
      conversation,
      subscriber,
      context,
      subscriberResolution: reactionResolution,
      message: null,
      event: AgentEventEnum.ON_REACTION,
      thread: event.thread ?? ({ id: threadId, channelId: '', isDM: false } as Thread),
      platformThreadId: threadId,
      reaction: reactionPayload,
    };

    // On buttonless platforms (iMessage/SMS) a pending tool approval can be
    // answered with a 👍 / 👎 reaction on the approval-request card — a matching
    // reaction is consumed as the verdict instead of forwarding as ON_REACTION.
    if (await this.replyApprovalInterceptor.tryHandleAsApprovalReaction(turn, runtime)) {
      return;
    }

    await runtime.dispatch(turn);
  }

  async handleAction(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    action: AgentAction,
    userId: string,
    rawEvent?: unknown
  ): Promise<void> {
    // The gate suppresses its reply for link-button actions (e.g. the upgrade
    // card's own CTA) so a blocked click can never spawn another card.
    if (await this.planLimitGate.maybeBlock(agentId, config, thread, action)) {
      return;
    }

    const actionResolution = await this.resolveSubscriber({
      agentId,
      config,
      platformUserId: userId,
      operation: 'resolve-subscriber-action',
      authorIsBot: false,
    });
    const subscriberId = getResolvedSubscriberId(actionResolution);

    const participantId = subscriberId ?? `${config.platform}:${userId}`;
    const participantType = subscriberId
      ? ConversationParticipantTypeEnum.SUBSCRIBER
      : ConversationParticipantTypeEnum.PLATFORM_USER;

    const existingConversation = await this.conversationService.findByPlatformThread(
      config.environmentId,
      config.organizationId,
      agentId,
      config.integrationId,
      thread.id
    );

    const conversation = await this.openConversationAndMaybeHydrateOrigin(
      agentId,
      config,
      existingConversation,
      thread.id,
      subscriberId,
      {
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
        isDirectMessage: thread.isDM,
        workspaceId: extractWorkspaceId(config.platform, rawEvent) ?? undefined,
      }
    );

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

    const actorType =
      participantType === ConversationParticipantTypeEnum.SUBSCRIBER
        ? ConversationActivitySenderTypeEnum.SUBSCRIBER
        : ConversationActivitySenderTypeEnum.PLATFORM_USER;
    await this.recordApprovalVerdict(conversation, config, action, actorType, participantId);

    // Everything else (incl. mcp-approval:* for managed) routes through the runtime,
    // which owns its own action semantics.
    const [subscriber, agent] = await Promise.all([
      subscriberId
        ? this.subscriberRepository.findBySubscriberId(config.environmentId, subscriberId)
        : Promise.resolve(null),
      this.agentRepository.findOne({ _id: agentId, _environmentId: config.environmentId }, [
        '_id',
        'runtime',
        'managedRuntime',
      ]),
    ]);

    const context = await this.connectionContextResolver.resolve(config, rawEvent, userId);

    const runtime = this.runtimeResolver.resolve(agent);
    const turn: ConversationTurn = {
      agentId,
      agent: agent ?? { _id: agentId },
      config,
      conversation,
      subscriber,
      context,
      subscriberResolution: actionResolution,
      message: null,
      event: AgentEventEnum.ON_ACTION,
      thread,
      platformThreadId: thread.id,
      action,
    };

    await runtime.dispatch(turn);
  }

  /**
   * Normalise an approval-card click into a verdict. Self-hosted and managed
   * cards use distinct action-id grammars (`tool-approval:*` vs
   * `mcp-approval:*` / `direct-approval:*`), so they never collide; non-approval
   * actions return `null` and are skipped.
   */
  private parseApprovalVerdict(
    actionId: string | undefined
  ): { approvalId: string; approved: boolean; toolName?: string } | null {
    const selfHosted = parseApprovalActionId(actionId);
    if (selfHosted) {
      return { approvalId: selfHosted.approvalId, approved: selfHosted.approved };
    }

    const managed = parseToolApprovalActionId(actionId);
    if (managed) {
      const toolName = managed.trust?.scope === 'tool' ? managed.trust.toolName : undefined;

      return { approvalId: managed.toolUseId, approved: managed.approved, toolName };
    }

    return null;
  }

  private async recordApprovalVerdict(
    conversation: ConversationEntity,
    config: ResolvedAgentConfig,
    action: AgentAction,
    actorType: ConversationActivitySenderTypeEnum.SUBSCRIBER | ConversationActivitySenderTypeEnum.PLATFORM_USER,
    actorId: string
  ): Promise<void> {
    const verdict = this.parseApprovalVerdict(action.id);
    if (!verdict) {
      return;
    }

    try {
      await this.conversationService.persistToolApprovalDecision({
        conversationId: conversation._id,
        channel: this.conversationService.getPrimaryChannel(conversation),
        agentIdentifier: config.agentIdentifier,
        approvalId: verdict.approvalId,
        approved: verdict.approved,
        toolName: verdict.toolName,
        actorType,
        actorId,
        environmentId: config.environmentId,
        organizationId: config.organizationId,
      });
    } catch (err) {
      // A failed transcript write must never drop the click — the runtime still
      // receives onAction and can resolve the card.
      this.logger.warn(err, `[agent:${config.agentIdentifier}] Failed to persist tool-approval decision`);
      captureAgentWarning(err, {
        component: 'inbound-turn-handler',
        operation: 'persist-tool-approval-decision',
        agentIdentifier: config.agentIdentifier,
      });
    }
  }
}
