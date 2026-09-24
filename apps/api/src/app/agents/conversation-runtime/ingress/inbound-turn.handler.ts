import { Injectable, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { AnalyticsService, PinoLogger } from '@novu/application-generic';
import { isValidActionIdempotencyKey, type WebChatRawMessage } from '@novu/chat-adapter-web-chat';
import {
  AgentIntegrationRepository,
  AgentRepository,
  ChannelEndpointRepository,
  ConversationActivityEntity,
  ConversationActivitySenderTypeEnum,
  ConversationEntity,
  type ConversationParticipant,
  ConversationParticipantTypeEnum,
  SubscriberRepository,
} from '@novu/dal';
import type { AgentAction } from '@novu/framework';
import { parseApprovalActionId } from '@novu/framework/internal';
import {
  AGENT_REPLY_METADATA_KEYS,
  AgentReplyPolicyEnum,
  ENDPOINT_TYPES,
  isDashboardWebChatSubscriberId,
} from '@novu/shared';
import type { CardElement, EmojiValue, Message, MessageContext, MessageDeletedEvent, Thread } from 'chat';
import { ConnectClaimTokenService } from '../../../connect/services/connect-claim-token.service';
import { parsePositiveIntEnv } from '../../../keyless/keyless-abuse.constants';
import { KeylessAbuseGuardService } from '../../../keyless/keyless-abuse-guard.service';
import { buildConnectClaimUrl, buildKeylessSignupCard } from '../../../keyless/keyless-signup.helpers';
import { LinkTelegramChatToSubscriberCommand } from '../../../telegram-linking/link-telegram-chat-to-subscriber/link-telegram-chat-to-subscriber.command';
import { LinkTelegramChatToSubscriber } from '../../../telegram-linking/link-telegram-chat-to-subscriber/link-telegram-chat-to-subscriber.usecase';
import { agentTelegramLinkScope } from '../../../telegram-linking/telegram-link-scope';
import { TelegramStartCodeService } from '../../../telegram-linking/telegram-start-code.service';
import { AgentConfigResolver, ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import { HumanConversationInboundInterceptor } from '../../human-relay/human-conversation-inbound.interceptor';
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
import { parseApprovalReplyVerdict } from '../../shared/tool-approval/reply-based-approval';
import { getResolvedSubscriberId, type SubscriberResolution } from '../../shared/types/subscriber-resolution';
import { agentLinkAwaitingInboundConnectionFilter } from '../../shared/util/agent-inbound-connection';
import { buildMentionRequiredNoticeReply } from '../../shared/util/agent-inbound-replies';
import { extractMsTeamsTenantId } from '../../shared/util/msteams-activity';
import { type AutoProvisionPlatform, shouldAutoProvisionInbound } from '../../shared/util/platform-endpoint-config';
import { asRecord } from '../../shared/util/raw-record';
import { extractWorkspaceId } from '../../shared/util/workspace-id';
import { InboundAckService } from '../ack/inbound-ack.service';
import { AgentAttachmentStorage, type StoredAttachment } from '../conversation/agent-attachment-storage.service';
import { AgentConversationService, getInboundActivityPreview } from '../conversation/agent-conversation.service';
import {
  AgentSubscriberResolver,
  BotAuthorSkippedError,
  ConnectOrgSubscriberCapExceededError,
} from '../conversation/agent-subscriber-resolver.service';
import { OutboundGateway } from '../egress/outbound.gateway';
import { maybeReplyUnresolvedSubscriberAccess } from '../reply/maybe-reply-unresolved-subscriber-access';
import type { BridgeReaction } from '../runtime/bridge-executor.service';
import type { ConversationTurn } from '../runtime/conversation-turn';
import { applyPlatformThreadIdToThread } from '../runtime/platform-thread.util';
import { RuntimeResolver } from '../runtime/runtime-resolver.service';
import { InboundDispatcher } from './inbound.dispatcher';
import { InboundConnectionContextResolver } from './inbound-connection-context.resolver';
import { isLinkButtonActionId, PlanLimitGateService } from './plan-limit-gate.service';
import { getActionPlatformThreadId, getInboundPlatformThreadId, isNestedSharedThread } from './platform-thread-id';
import { ReplyApprovalInterceptor } from './reply-approval-interceptor.service';
import {
  conversationHasSmartMentionRequired,
  countHumanParticipants,
  countOtherAgentParticipants,
  detectSmartExclusiveThreadEnded,
  type ExplicitMentionContext,
  followsNestedThreadWithoutMention,
  messageContainsUserMention,
  messageMentionsAgent,
  requiresExplicitMention,
} from './requires-explicit-mention';
import { seedSlackThreadHistory } from './seed-slack-thread-history';
import { WorkflowOriginService } from './workflow-origin.service';

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

/**
 * Chat SDK burst locks are scoped to the thread/channel, not the author (see
 * `getLockKey`), so a burst can hold messages from different senders — multiple
 * participants in a subscribed Slack/Teams thread, or anyone in a Telegram/WhatsApp
 * group (channel-scoped lock by default). Subscriber resolution, tool-approval actor
 * identity, and persistence all key off the latest message's author, so a different
 * author's text/attachments must never be folded in — that would let one participant's
 * message run under another's identity and permissions.
 *
 * A lone whole-message reply verdict (e.g. "yes") is also kept as-is rather than
 * folded: `parseApprovalReplyVerdict` only recognizes an exact match, so combining it
 * with adjacent text would silently drop a pending tool approval.
 */
function foldInboundBurst(message: Message, messageContext?: MessageContext): void {
  if (!messageContext?.skipped?.length) {
    return;
  }

  const sameAuthor = messageContext.skipped.filter((item) => item.author.userId === message.author.userId);
  if (sameAuthor.length === 0) {
    return;
  }

  const burst = [...sameAuthor, message];
  const verdict = burst.find((item) => parseApprovalReplyVerdict(item.text) !== null);
  if (verdict) {
    message.text = verdict.text;

    return;
  }

  message.text = burst
    .map((item) => item.text ?? '')
    .filter((text) => text.trim().length > 0)
    .join('\n\n');
  message.attachments = burst.flatMap((item) => item.attachments ?? []);
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
    private readonly workflowOriginService: WorkflowOriginService,
    private readonly humanConversationInbound: HumanConversationInboundInterceptor,
    private readonly agentConfigResolver: AgentConfigResolver
  ) {
    this.logger.setContext(this.constructor.name);
  }

  onModuleInit() {
    this.inboundDispatcher.registerInboundCallbacks({
      onMessage: (agentId, config, thread, message, messageContext) =>
        this.handle(agentId, config, thread, message, AgentEventEnum.ON_MESSAGE, messageContext),
      onAction: (agentId, config, thread, action, userId, rawEvent) =>
        this.handleAction(agentId, config, thread, action, userId, rawEvent),
      onReaction: (agentId, config, event) => this.handleReaction(agentId, config, event),
      onMessageUpdated: (agentId, config, thread, message, previousMessage) =>
        this.handleMessageUpdated(agentId, config, thread, message, previousMessage),
      onMessageDeleted: (agentId, config, event) => this.handleMessageDeleted(agentId, config, event),
    });
  }

  async handle(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    message: Message,
    event: AgentEventEnum,
    messageContext?: MessageContext
  ): Promise<void> {
    if (await this.consumeTelegramStartLink(agentId, config, thread, message, messageContext)) {
      return;
    }

    // Fold before mention detection so a mention that arrived in an earlier
    // message of the same burst still gates this turn.
    foldInboundBurst(message, messageContext);
    const mentionBotUserId = await this.restoreMissingMentionFlag(config, thread, message);

    const platformThreadId = getInboundPlatformThreadId(config.platform, thread, message);

    // Resolve whether this thread already has a conversation *before* creating
    // one. The mention gate and the free-tier active-conversations gate both run
    // before persistence, so a gated brand-new thread never leaves an orphaned
    // Conversation and participants.
    const existingConversation = await this.conversationService.findByPlatformThread(
      config.environmentId,
      config.organizationId,
      agentId,
      config.integrationId,
      platformThreadId
    );
    const participantsSnapshot = existingConversation ? [...existingConversation.participants] : [];
    const mentionContext = await this.buildMentionContext(
      agentId,
      config,
      thread,
      platformThreadId,
      existingConversation
    );
    if (
      await this.applyPrePersistenceMentionGate({
        agentId,
        config,
        thread,
        message,
        platformThreadId,
        existingConversation,
        mentionContext,
      })
    ) {
      return;
    }

    if (await this.planLimitGate.maybeBlock(agentId, config, thread)) {
      return;
    }

    const inboundSubscriber = await this.resolveInboundSubscriber(agentId, config, thread, message);
    if (!inboundSubscriber) {
      return;
    }

    const { resolution, isVerifiedEmailSender } = inboundSubscriber;
    const subscriberId = getResolvedSubscriberId(resolution);
    const isDashboardTester = isDashboardWebChatSubscriberId(subscriberId);

    // A genuine, non-bot user has messaged the agent (bot-authored echoes threw
    // `BotAuthorSkippedError` above). This — not the raw webhook POST — is what
    // marks the agent–integration link connected and completes onboarding.
    // The dashboard Web Chat tester uses a reserved subscriber the install
    // prompt never copies, so those turns must not stamp Connected.
    if (!isDashboardTester) {
      await this.markIntegrationConnectedOnFirstMessage(agentId, config);
    }

    // Free-tier active-conversations short-circuit: block engagements that would
    // start a *new* active conversation once the included limit is reached.
    // Existing (already-counted) conversations keep working.
    if (await this.planLimitGate.maybeBlockConversation(agentId, config, thread, existingConversation ?? undefined)) {
      return;
    }

    const workflowOriginResolution = await this.workflowOriginService.resolve({
      agentId,
      config,
      platformThreadId,
      subscriberId,
      message,
      existingConversation,
      isDirectMessage: thread.isDM,
    });

    const conversation = await this.conversationService.createOrGetConversation({
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
      notificationId: workflowOriginResolution?.notificationId,
      contextKeys:
        config.platform === AgentPlatformEnum.WEB_CHAT
          ? ((message.raw as WebChatRawMessage | undefined)?.contextKeys ?? [])
          : undefined,
    });

    const workflowOrigin = await this.workflowOriginService.resolveForTurn({
      agentId,
      config,
      conversation,
      platformThreadId,
      subscriberId,
      resolution: workflowOriginResolution,
    });

    if (await this.maybeStopKeylessInbound(agentId, config, thread, conversation)) {
      return;
    }

    await this.dispatchInboundTurn({
      agentId,
      config,
      thread,
      message,
      event,
      conversation,
      platformThreadId,
      subscriberId,
      resolution,
      isVerifiedEmailSender,
      workflowOrigin,
      mentionContext,
      mentionBotUserId,
      participantsSnapshot,
    });
  }

  private async buildMentionContext(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    platformThreadId: string,
    conversation: ConversationEntity | null
  ): Promise<ExplicitMentionContext> {
    const replyPolicy = config.replyPolicy ?? AgentReplyPolicyEnum.AUTO_REPLY;
    const otherAgentsOnThread =
      replyPolicy === AgentReplyPolicyEnum.SMART && isNestedSharedThread(config.platform, thread, platformThreadId)
        ? await this.conversationService.countOtherAgentsOnPlatformThread(
            config.environmentId,
            config.organizationId,
            platformThreadId,
            agentId
          )
        : 0;

    return {
      replyPolicy,
      platform: config.platform,
      conversationExists: conversation != null,
      platformThreadId,
      humanParticipantCount: countHumanParticipants(conversation),
      otherAgentCount: countOtherAgentParticipants(conversation, agentId) + otherAgentsOnThread,
      smartMentionRequired: conversationHasSmartMentionRequired(conversation),
    };
  }

  /**
   * Mention gating that runs before any conversation is persisted, so an
   * unmentioned message in a shared room never creates a conversation. A thread
   * with a pending ask is exempt — that reply is the answer we are waiting for.
   * Also subscribes to threads this agent is allowed to follow unmentioned.
   * Returns true when the message must be dropped.
   */
  private async applyPrePersistenceMentionGate(args: {
    agentId: string;
    config: ResolvedAgentConfig;
    thread: Thread;
    message: Message;
    platformThreadId: string;
    existingConversation: ConversationEntity | null;
    mentionContext: ExplicitMentionContext;
  }): Promise<boolean> {
    const { agentId, config, thread, message, platformThreadId, existingConversation, mentionContext } = args;

    const requiresMention = requiresExplicitMention(thread, message, mentionContext);
    const pendingAsk =
      requiresMention &&
      existingConversation != null &&
      (await this.humanConversationInbound.hasPendingAsk(config.environmentId, existingConversation._id));

    if (requiresMention && !pendingAsk) {
      if (
        mentionContext.replyPolicy === AgentReplyPolicyEnum.SMART &&
        (mentionContext.humanParticipantCount >= 2 || (mentionContext.otherAgentCount ?? 0) > 0) &&
        isNestedSharedThread(config.platform, thread, platformThreadId)
      ) {
        await this.announceMentionRequired({
          agentId,
          config,
          thread,
          platformThreadId,
          conversation: existingConversation,
          triggeringUserId: message.author.userId,
        });
      }

      await thread.unsubscribe();

      return true;
    }

    if (
      followsNestedThreadWithoutMention(mentionContext) &&
      isNestedSharedThread(config.platform, thread, platformThreadId)
    ) {
      await thread.subscribe();
    }

    return false;
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

  private async resolveInboundSubscriber(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    message: Message
  ): Promise<{ resolution: SubscriberResolution; isVerifiedEmailSender: boolean } | null> {
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

        return { resolution: { outcome: 'not_found' }, isVerifiedEmailSender };
      }

      if (canAutoProvision) {
        return {
          resolution: await this.subscriberResolver.resolveOrProvision({
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
          }),
          isVerifiedEmailSender,
        };
      }

      return {
        resolution: await this.resolveSubscriber({
          agentId,
          config,
          platformUserId: message.author.userId,
          operation: 'resolve-subscriber',
          authorIsBot: message.author.isBot === true,
        }),
        isVerifiedEmailSender,
      };
    } catch (err) {
      if (err instanceof BotAuthorSkippedError) {
        this.logger.debug(
          `[agent:${agentId}] Inbound from bot author ${config.platform}:${message.author.userId} skipped without dispatch`
        );

        return null;
      }

      if (err instanceof ConnectOrgSubscriberCapExceededError) {
        this.logger.warn(
          { agentId, organizationId: config.organizationId, count: err.count, limit: err.limit },
          'Connect org at auto-provisioned subscriber cap — posting tier-upgrade card and skipping dispatch.'
        );
        await this.postCapacityReachedReply(agentId, config, thread, message);

        return null;
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
  }

  private async dispatchInboundTurn(args: {
    agentId: string;
    config: ResolvedAgentConfig;
    thread: Thread;
    message: Message;
    event: AgentEventEnum;
    conversation: ConversationEntity;
    platformThreadId: string;
    subscriberId: string | null;
    resolution: SubscriberResolution;
    isVerifiedEmailSender: boolean;
    workflowOrigin: Awaited<ReturnType<WorkflowOriginService['resolveForTurn']>>;
    mentionContext: ExplicitMentionContext;
    /** This agent's bot user id, when the mention-flag repair already resolved it. */
    mentionBotUserId?: string;
    /**
     * Participants as they were *before* `createOrGetConversation` added this
     * sender, so smart-policy join detection can still tell a newcomer from the
     * thread's incumbent human.
     */
    participantsSnapshot: ConversationParticipant[];
  }): Promise<void> {
    const {
      agentId,
      config,
      thread,
      message,
      event,
      conversation,
      platformThreadId,
      subscriberId,
      isVerifiedEmailSender,
      workflowOrigin,
      mentionContext,
      mentionBotUserId,
      participantsSnapshot,
    } = args;
    let { resolution } = args;
    const storedAttachments = await this.storeInboundAttachments(config, conversation, message);
    const isFirstMessage = !this.conversationService.getPrimaryChannel(conversation).firstPlatformMessageId;

    const unseenThreadMessages = await seedSlackThreadHistory({
      agentId,
      config,
      conversation,
      thread,
      message,
      platformThreadId,
      workflowOrigin,
      conversationService: this.conversationService,
      logger: this.logger,
    });

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

    const { context, bridgeUrl: bridgeUrlOverride } = await this.connectionContextResolver.resolve(
      config,
      message.raw,
      message.author?.userId
    );

    const runtime = this.runtimeResolver.resolve(agent);
    const turn: ConversationTurn = {
      agentId,
      agent: agent ?? { _id: agentId },
      config,
      conversation,
      subscriber,
      context,
      bridgeUrlOverride,
      subscriberResolution: resolution,
      message,
      event,
      thread,
      platformThreadId,
      platformUserId: message.author.userId,
      storedAttachments: message.attachments?.length ? storedAttachments : undefined,
      workflowOrigin: workflowOrigin ?? undefined,
      unseenThreadMessages,
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

    if (event === AgentEventEnum.ON_MESSAGE && (await this.humanConversationInbound.tryHandleMessage(turn))) {
      return;
    }

    if (
      await this.maybeStopOnMentionGate({
        agentId,
        config,
        thread,
        message,
        event,
        conversation,
        platformThreadId,
        subscriberId,
        mentionContext,
        mentionBotUserId,
        participantsSnapshot,
      })
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
   * Mention gating that has to run *after* the HITL interceptor, so an
   * unmentioned reply can still settle a pending ask. Under the SMART policy it
   * also detects the moment an agent's exclusive thread stops being exclusive —
   * a teammate joins, another agent is already in the thread, or the incumbent
   * mentions someone else — and steps back out of the thread. Returns true when
   * the turn must stop here.
   */
  private async maybeStopOnMentionGate(args: {
    agentId: string;
    config: ResolvedAgentConfig;
    thread: Thread;
    message: Message;
    event: AgentEventEnum;
    conversation: ConversationEntity;
    platformThreadId: string;
    subscriberId: string | null;
    mentionContext: ExplicitMentionContext;
    mentionBotUserId?: string;
    participantsSnapshot: ConversationParticipant[];
  }): Promise<boolean> {
    const {
      agentId,
      config,
      thread,
      message,
      event,
      conversation,
      platformThreadId,
      subscriberId,
      mentionContext,
      participantsSnapshot,
    } = args;

    if (event !== AgentEventEnum.ON_MESSAGE) {
      return false;
    }

    if (requiresExplicitMention(thread, message, mentionContext)) {
      return true;
    }

    const botUserId =
      args.mentionBotUserId ??
      (mentionContext.replyPolicy === AgentReplyPolicyEnum.SMART &&
      mentionContext.humanParticipantCount === 1 &&
      (mentionContext.otherAgentCount ?? 0) === 0 &&
      messageContainsUserMention(message, config.platform)
        ? await this.resolveMentionBotUserId(config, message)
        : undefined);

    const exclusiveThreadEnd = detectSmartExclusiveThreadEnded({
      replyPolicy: mentionContext.replyPolicy,
      participantsSnapshot,
      subscriberId,
      platform: config.platform,
      platformUserId: message.author?.userId,
      botUserId,
      message,
      otherAgentCount: mentionContext.otherAgentCount,
    });

    if (exclusiveThreadEnd == null || !isNestedSharedThread(config.platform, thread, platformThreadId)) {
      return false;
    }

    const announced = await this.announceMentionRequired({
      agentId,
      config,
      thread,
      platformThreadId,
      conversation,
      triggeringUserId: message.author.userId,
      joinerName: exclusiveThreadEnd === 'join' ? message.author?.fullName : undefined,
    });

    if (!announced) {
      // The transition was not recorded, so a later mention would resubscribe
      // and auto-follow again. Keep following until it can be saved.
      return false;
    }

    await thread.unsubscribe();

    // A message that did mention the agent still gets answered — the notice
    // above just tells the room the agent now needs mentioning.
    return message.isMention !== true;
  }

  private async maybeStopKeylessInbound(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    conversation: ConversationEntity
  ): Promise<boolean> {
    if (!config.isKeyless) {
      return false;
    }

    const aiEnabled = await this.keylessAbuseGuard.isKeylessAgentAiEnabled(config.organizationId);

    if (!aiEnabled) {
      await this.postKeylessSignupCta(agentId, config, thread, conversation);

      return true;
    }

    if (await this.connectClaimTokenService.isSignupCtaPosted(conversation._id)) {
      return true;
    }

    if (await this.isKeylessDemoCapReached(config, conversation._id)) {
      await this.postKeylessSignupCta(agentId, config, thread, conversation);

      return true;
    }

    return false;
  }

  /** Telegram `/start <code>` is control input; when present it is always consumed here. */
  private async consumeTelegramStartLink(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    message: Message,
    messageContext?: MessageContext
  ): Promise<boolean> {
    if (config.platform !== AgentPlatformEnum.TELEGRAM) {
      return false;
    }

    for (const inbound of [...(messageContext?.skipped ?? []), message]) {
      const startToken = extractTelegramStartToken(inbound.text);
      if (startToken) {
        return this.handleTelegramSubscriberLink(agentId, config, thread, inbound, startToken);
      }
    }

    return false;
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

  private async storeInboundAttachments(
    config: ResolvedAgentConfig,
    conversation: ConversationEntity,
    message: Message
  ): Promise<StoredAttachment[] | undefined> {
    if (!message.attachments?.length) {
      return undefined;
    }

    const stored = await this.attachmentStorage.storeInbound(message.attachments, {
      organizationId: config.organizationId,
      environmentId: config.environmentId,
      conversationId: String(conversation._id),
      platformMessageId: message.id ?? `unknown-${Date.now()}`,
      platform: config.platform,
    });

    if (!stored.length) {
      this.logger.warn(
        { platform: config.platform, messageId: message.id, inboundCount: message.attachments.length },
        'Inbound attachments were present but none could be stored'
      );
    }

    return stored;
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
   * Privately tells the triggering user the agent now needs @-mentioning.
   * Announced once per
   * conversation — the thread keeps producing the same "no longer exclusive"
   * verdict on every later message, and repeating the notice each time (even
   * on messages that did mention the agent) is noise. The flag is saved only
   * after the ephemeral notice posts, so a Slack/Teams reject stays retryable.
   * Returns false when the notice could not be posted or
   * the transition could not be saved.
   */
  private async announceMentionRequired(args: {
    agentId: string;
    config: ResolvedAgentConfig;
    thread: Thread;
    platformThreadId: string;
    conversation: ConversationEntity | null;
    triggeringUserId: string;
    joinerName?: string;
  }): Promise<boolean> {
    const { agentId, config, thread, platformThreadId, conversation, triggeringUserId, joinerName } = args;

    if (conversationHasSmartMentionRequired(conversation)) {
      return true;
    }

    const posted = await this.postMentionRequiredNotice(
      agentId,
      config,
      thread,
      platformThreadId,
      triggeringUserId,
      joinerName
    );

    if (!posted) {
      return false;
    }

    if (conversation && !(await this.markSmartMentionRequired(config, conversation))) {
      return false;
    }

    return true;
  }

  private async markSmartMentionRequired(
    config: ResolvedAgentConfig,
    conversation: ConversationEntity
  ): Promise<boolean> {
    if (conversationHasSmartMentionRequired(conversation)) {
      return true;
    }

    try {
      await this.conversationService.updateMetadata({
        conversationId: conversation._id,
        channel: this.conversationService.getPrimaryChannel(conversation),
        agentIdentifier: config.agentIdentifier,
        environmentId: config.environmentId,
        organizationId: config.organizationId,
        currentMetadata: conversation.metadata ?? {},
        ops: [{ action: 'set', key: AGENT_REPLY_METADATA_KEYS.smartMentionRequired, value: true }],
      });

      return true;
    } catch (err) {
      this.logger.warn(err, `[agent:${config.agentId}] Failed to persist smart reply-policy mention-required flag`);
      captureAgentWarning(err, {
        component: 'agent-inbound-handler',
        operation: 'mark-smart-mention-required',
        agentId: config.agentId,
        platform: config.platform,
      });

      return false;
    }
  }

  /**
   * The chat SDK only flags a Slack mention when the agent's bot user id is on
   * the adapter's per-event request context. A multi-workspace app resolves that
   * id per event, so a miss makes a message that did @-mention the agent look
   * unmentioned — the reply-policy gate then answers with the "@-mention me"
   * notice and drops the turn instead of replying. Resolve the id directly
   * (outside the adapter's request scope) and re-check the raw payload before
   * any gate reads the flag. Returns the bot user id when it was looked up, so
   * the later teammate-mention check can reuse it.
   */
  private async restoreMissingMentionFlag(
    config: ResolvedAgentConfig,
    thread: Thread,
    message: Message
  ): Promise<string | undefined> {
    const mentionGatedPolicy =
      config.replyPolicy === AgentReplyPolicyEnum.SMART || config.replyPolicy === AgentReplyPolicyEnum.MENTION_ONLY;

    if (
      message.isMention === true ||
      thread.isDM ||
      !mentionGatedPolicy ||
      !messageContainsUserMention(message, config.platform)
    ) {
      return undefined;
    }

    const botUserId = await this.resolveMentionBotUserId(config, message);

    if (messageMentionsAgent(message, config.platform, botUserId)) {
      message.isMention = true;
      this.logger.debug(
        `[agent:${config.agentId}] Inbound message ${message.id ?? '<unknown>'} @-mentions this agent but arrived without the mention flag; treating it as a mention`
      );
    }

    return botUserId;
  }

  private async resolveMentionBotUserId(config: ResolvedAgentConfig, message: Message): Promise<string | undefined> {
    switch (config.platform) {
      case AgentPlatformEnum.SLACK: {
        try {
          const workspaceId = extractWorkspaceId(config.platform, message.raw) ?? undefined;
          const installation = await this.agentConfigResolver.resolveSlackInstallation(
            config.environmentId,
            config.organizationId,
            config.integrationIdentifier,
            workspaceId
          );

          return installation?.botUserId;
        } catch (err) {
          this.logger.warn(
            { err, agentId: config.agentId },
            'Failed to resolve Slack bot user id for teammate-mention detection'
          );

          return undefined;
        }
      }
      case AgentPlatformEnum.TEAMS:
        return config.credentials.clientId;
      case AgentPlatformEnum.WHATSAPP:
      case AgentPlatformEnum.EMAIL:
      case AgentPlatformEnum.TELEGRAM:
      case AgentPlatformEnum.SENDBLUE:
      case AgentPlatformEnum.PHOTON_IMESSAGE:
      case AgentPlatformEnum.WEB_CHAT:
        return undefined;
      default: {
        const exhaustiveCheck: never = config.platform;

        return exhaustiveCheck;
      }
    }
  }

  private async postMentionRequiredNotice(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    platformThreadId: string,
    triggeringUserId: string,
    joinerName?: string
  ): Promise<boolean> {
    const markdown = buildMentionRequiredNoticeReply({ joinerName, agentName: config.agentName });

    try {
      applyPlatformThreadIdToThread(thread, platformThreadId);
      const sent = await thread.postEphemeral(triggeringUserId, { markdown }, { fallbackToDM: false });

      return sent !== null;
    } catch (err) {
      this.logger.warn(err, `[agent:${agentId}] Failed to post ephemeral smart reply-policy mention notice`);
      captureAgentWarning(err, {
        component: 'agent-inbound-handler',
        operation: 'post-mention-required-notice',
        agentId,
        platform: config.platform,
      });

      return false;
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

  async handleMessageUpdated(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    message: Message,
    previousMessage?: Message
  ): Promise<void> {
    const conversation = await this.conversationService.findByPlatformThread(
      config.environmentId,
      config.organizationId,
      config.agentId,
      config.integrationId,
      thread.id
    );
    if (!conversation) {
      return;
    }

    const storedAttachments = await this.storeInboundAttachments(config, conversation, message);
    const richContent = Array.isArray(message.attachments)
      ? {
          attachments: (storedAttachments ?? []).map(({ type, name, mimeType, size, storageKey }) => ({
            type,
            name,
            mimeType,
            size,
            storageKey,
          })),
        }
      : undefined;
    const editedAt = readPlatformEditedAt(message) ?? new Date().toISOString();

    if (message.id) {
      await this.conversationService.updateInboundMessage({
        conversationId: conversation._id,
        platformMessageId: message.id,
        content: message.text,
        richContent,
        hasPlatformAttachments: Boolean(message.attachments?.length),
        editedAt,
        environmentId: config.environmentId,
        organizationId: config.organizationId,
      });
    }

    trackAgentInboundMessage(this.analyticsService, {
      organizationId: config.organizationId,
      environmentId: config.environmentId,
      agentId,
      agentIdentifier: config.agentIdentifier,
      integrationIdentifier: config.integrationIdentifier,
      platform: config.platform,
      conversationId: conversation._id,
      agentEvent: AgentEventEnum.ON_MESSAGE_UPDATED,
      isFirstMessageInThread: false,
    });

    await this.dispatchExistingConversationTurn({
      agentId,
      config,
      conversation,
      thread,
      platformThreadId: thread.id,
      message,
      previousMessage: previousMessage ?? null,
      event: AgentEventEnum.ON_MESSAGE_UPDATED,
      operation: 'resolve-subscriber-message-updated',
      platformUserId: message.author?.userId,
      authorIsBot: message.author?.isBot === true,
      raw: message.raw,
      storedAttachments,
      deliveryRevision: editedAt,
    });
  }

  async handleMessageDeleted(agentId: string, config: ResolvedAgentConfig, event: MessageDeletedEvent): Promise<void> {
    const threadId = event.threadId;
    if (!threadId) {
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

    const current = event.messageId
      ? await this.conversationService.resolveCurrentMessage(config.environmentId, conversation._id, event.messageId)
      : null;
    const existing = event.messageId
      ? await this.conversationService.deleteInboundMessage({
          conversationId: conversation._id,
          platformMessageId: event.messageId,
          content: event.previousMessage?.text ?? current?.content,
          environmentId: config.environmentId,
          organizationId: config.organizationId,
        })
      : null;

    const message = stubDeletedMessage(event, current ?? existing);

    trackAgentInboundMessage(this.analyticsService, {
      organizationId: config.organizationId,
      environmentId: config.environmentId,
      agentId,
      agentIdentifier: config.agentIdentifier,
      integrationIdentifier: config.integrationIdentifier,
      platform: config.platform,
      conversationId: conversation._id,
      agentEvent: AgentEventEnum.ON_MESSAGE_DELETED,
      isFirstMessageInThread: false,
    });

    await this.dispatchExistingConversationTurn({
      agentId,
      config,
      conversation,
      thread: eventToThread(event, conversation),
      platformThreadId: threadId,
      message,
      previousMessage: null,
      event: AgentEventEnum.ON_MESSAGE_DELETED,
      operation: 'resolve-subscriber-message-deleted',
      platformUserId: event.previousMessage?.author?.userId ?? existing?.senderId,
      authorIsBot: event.previousMessage?.author?.isBot === true,
      raw: event.raw,
      deliveryRevision: 'deleted',
    });
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

    const sourceActivity = await this.conversationService.findSourceActivity(
      config.environmentId,
      conversation._id,
      event.messageId
    );

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

    await this.dispatchExistingConversationTurn({
      agentId,
      config,
      conversation,
      thread: event.thread ?? ({ id: threadId, channelId: '', isDM: false } as Thread),
      platformThreadId: threadId,
      message: event.message ?? null,
      turnMessage: null,
      event: AgentEventEnum.ON_REACTION,
      operation: 'resolve-subscriber-reaction',
      platformUserId: event.user?.userId,
      raw: event.raw,
      reaction: {
        emoji: event.emoji.name,
        added: event.added,
        messageId: event.messageId,
        sourceMessage: event.message,
        sourceMessageStoredAttachments: sourceMessageStoredAttachments?.length
          ? sourceMessageStoredAttachments
          : undefined,
      },
    });
  }

  private async dispatchExistingConversationTurn(params: {
    agentId: string;
    config: ResolvedAgentConfig;
    conversation: ConversationEntity;
    thread: Thread;
    platformThreadId: string;
    message: Message | null;
    turnMessage?: Message | null;
    previousMessage?: Message | null;
    event: AgentEventEnum;
    operation: string;
    platformUserId?: string;
    authorIsBot?: boolean;
    raw?: unknown;
    storedAttachments?: StoredAttachment[];
    deliveryRevision?: string;
    reaction?: BridgeReaction;
  }): Promise<void> {
    const { agentId, config, conversation, thread, platformThreadId, message, event } = params;

    if (
      (event === AgentEventEnum.ON_MESSAGE_UPDATED || event === AgentEventEnum.ON_MESSAGE_DELETED) &&
      (await this.shouldSkipRevisionDispatch(params))
    ) {
      return;
    }

    const resolution = params.platformUserId
      ? await this.resolveSubscriber({
          agentId,
          config,
          platformUserId: params.platformUserId,
          operation: params.operation,
          authorIsBot: params.authorIsBot === true,
        })
      : undefined;
    const subscriberId = getResolvedSubscriberId(resolution);

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

    const { context, bridgeUrl: bridgeUrlOverride } = await this.connectionContextResolver.resolve(
      config,
      params.raw,
      params.platformUserId
    );
    const runtime = this.runtimeResolver.resolve(agent);
    const workflowOriginResolution = await this.workflowOriginService.resolve({
      agentId,
      config,
      platformThreadId,
      subscriberId,
      message,
      existingConversation: conversation,
      isDirectMessage: thread.isDM,
    });
    const workflowOrigin = await this.workflowOriginService.resolveForTurn({
      agentId,
      config,
      conversation,
      platformThreadId,
      subscriberId,
      resolution: workflowOriginResolution,
    });

    const turn: ConversationTurn = {
      agentId,
      agent: agent ?? { _id: agentId },
      config,
      conversation,
      subscriber,
      context,
      bridgeUrlOverride,
      subscriberResolution: resolution,
      message: params.turnMessage !== undefined ? params.turnMessage : message,
      previousMessage: params.previousMessage,
      event,
      thread,
      platformThreadId,
      platformUserId: params.platformUserId,
      storedAttachments: params.storedAttachments,
      deliveryRevision: params.deliveryRevision,
      reaction: params.reaction,
      workflowOrigin: workflowOrigin ?? undefined,
    };

    if (
      event === AgentEventEnum.ON_REACTION &&
      (await this.replyApprovalInterceptor.tryHandleAsApprovalReaction(turn, runtime))
    ) {
      return;
    }

    if (
      event === AgentEventEnum.ON_MESSAGE_UPDATED &&
      (await maybeReplyUnresolvedSubscriberAccess({
        turn,
        logger: this.logger,
        outboundGateway: this.outboundGateway,
        conversationService: this.conversationService,
        emailSenderUnverified: false,
      }))
    ) {
      return;
    }

    await runtime.dispatch(turn);
  }

  /**
   * Edits and deletes reach the agent only when a new message in the same
   * thread would. The caller has already written the ledger revision.
   */
  private async shouldSkipRevisionDispatch(params: {
    agentId: string;
    config: ResolvedAgentConfig;
    conversation: ConversationEntity;
    thread: Thread;
    platformThreadId: string;
    message: Message | null;
    authorIsBot?: boolean;
  }): Promise<boolean> {
    const { agentId, config, conversation, thread, platformThreadId, message } = params;

    if (params.authorIsBot) {
      return true;
    }

    if (message) {
      await this.restoreMissingMentionFlag(config, thread, message);
      const mentionContext = await this.buildMentionContext(agentId, config, thread, platformThreadId, conversation);

      if (requiresExplicitMention(thread, message, mentionContext)) {
        return true;
      }
    }

    if (await this.planLimitGate.maybeBlock(agentId, config, thread)) {
      return true;
    }

    return this.maybeStopKeylessInbound(agentId, config, thread, conversation);
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
    const platformThreadId = getActionPlatformThreadId(config.platform, thread, action);

    const existingConversation = await this.conversationService.findByPlatformThread(
      config.environmentId,
      config.organizationId,
      agentId,
      config.integrationId,
      platformThreadId
    );

    const workflowOriginResolution = await this.workflowOriginService.resolve({
      agentId,
      config,
      platformThreadId,
      subscriberId,
      message: null,
      existingConversation,
      isDirectMessage: thread.isDM,
    });

    const conversation = await this.conversationService.createOrGetConversation({
      environmentId: config.environmentId,
      organizationId: config.organizationId,
      agentId,
      platform: config.platform,
      integrationId: config.integrationId,
      platformThreadId,
      participantId,
      participantType,
      platformUserId: userId,
      firstMessageText: `[action:${action.id}]`,
      isDirectMessage: thread.isDM,
      workspaceId: extractWorkspaceId(config.platform, rawEvent) ?? undefined,
      notificationId: workflowOriginResolution?.notificationId,
      contextKeys:
        config.platform === AgentPlatformEnum.WEB_CHAT
          ? ((rawEvent as WebChatRawMessage | undefined)?.contextKeys ?? [])
          : undefined,
    });

    const workflowOrigin = await this.workflowOriginService.resolveForTurn({
      agentId,
      config,
      conversation,
      platformThreadId,
      subscriberId,
      resolution: workflowOriginResolution,
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

    const actorType =
      participantType === ConversationParticipantTypeEnum.SUBSCRIBER
        ? ConversationActivitySenderTypeEnum.SUBSCRIBER
        : ConversationActivitySenderTypeEnum.PLATFORM_USER;
    const identifier = this.readActionIdempotencyKey(rawEvent);
    await this.recordNonApprovalActionAccept(conversation, config, action, identifier);

    // Everything else (incl. mcp-approval:* for managed) routes through the runtime,
    // which owns its own action semantics.
    const { context, bridgeUrl: bridgeUrlOverride } = await this.connectionContextResolver.resolve(
      config,
      rawEvent,
      userId
    );

    const runtime = this.runtimeResolver.resolve(agent);
    const turn: ConversationTurn = {
      agentId,
      agent: agent ?? { _id: agentId },
      config,
      conversation,
      subscriber,
      context,
      bridgeUrlOverride,
      subscriberResolution: actionResolution,
      message: null,
      event: AgentEventEnum.ON_ACTION,
      thread,
      platformThreadId,
      platformUserId: userId,
      action,
      workflowOrigin: workflowOrigin ?? undefined,
    };

    if (await this.humanConversationInbound.tryHandleAction(turn)) {
      return;
    }

    // Record the tool-approval verdict on the transcript, but only when the HITL
    // path did not already settle a `HumanInteraction` for this click — a settled
    // row persists the decision through its resume chain, so writing here too
    // would double-record the verdict.
    if (!turn.toolApprovalSettledByHitl) {
      await this.recordApprovalVerdict(
        conversation,
        config,
        action,
        actorType,
        participantId,
        subscriber?.firstName?.trim() || subscriber?.subscriberId || participantId,
        identifier
      );
    }

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

  private readActionIdempotencyKey(rawEvent: unknown): string | undefined {
    if (!rawEvent || typeof rawEvent !== 'object' || Array.isArray(rawEvent)) {
      return undefined;
    }

    const key = (rawEvent as { idempotencyKey?: unknown }).idempotencyKey;
    if (typeof key !== 'string') {
      return undefined;
    }

    const trimmed = key.trim();

    return isValidActionIdempotencyKey(trimmed) ? trimmed : undefined;
  }

  private async recordNonApprovalActionAccept(
    conversation: ConversationEntity,
    config: ResolvedAgentConfig,
    action: AgentAction,
    identifier?: string
  ): Promise<void> {
    if (!identifier || this.parseApprovalVerdict(action.id)) {
      return;
    }

    try {
      await this.conversationService.persistInboundActionAccept({
        conversationId: conversation._id,
        channel: this.conversationService.getPrimaryChannel(conversation),
        agentIdentifier: config.agentIdentifier,
        environmentId: config.environmentId,
        organizationId: config.organizationId,
        identifier,
        actionId: action.id,
      });
    } catch (err) {
      this.logger.warn(err, `[agent:${config.agentIdentifier}] Failed to persist inbound action accept`);
      captureAgentWarning(err, {
        component: 'inbound-turn-handler',
        operation: 'persist-inbound-action-accept',
        agentIdentifier: config.agentIdentifier,
      });
    }
  }

  private async recordApprovalVerdict(
    conversation: ConversationEntity,
    config: ResolvedAgentConfig,
    action: AgentAction,
    actorType: ConversationActivitySenderTypeEnum.SUBSCRIBER | ConversationActivitySenderTypeEnum.PLATFORM_USER,
    actorId: string,
    actorName: string,
    identifier?: string
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
        actorName,
        environmentId: config.environmentId,
        organizationId: config.organizationId,
        ...(identifier ? { identifier } : {}),
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

function readPlatformEditedAt(message: Message): string | undefined {
  const raw = message.raw;
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const editedTs = (raw as { edited?: { ts?: unknown } }).edited?.ts;

  return typeof editedTs === 'string' && editedTs.length > 0 ? editedTs : undefined;
}

function eventToThread(event: MessageDeletedEvent, conversation: ConversationEntity): Thread {
  // Conversations created before `isDirectMessage` was recorded count as DMs so the reply-policy gate fails open.
  return { id: event.threadId, channelId: event.channelId, isDM: conversation.isDirectMessage !== false } as Thread;
}

function stubDeletedMessage(event: MessageDeletedEvent, existing: ConversationActivityEntity | null): Message {
  if (event.previousMessage) {
    return event.previousMessage;
  }

  return {
    id: event.messageId,
    text: existing?.content ?? '',
    author: {
      userId: existing?.senderId ?? '',
      fullName: existing?.senderName ?? '',
      userName: existing?.senderName ?? '',
      isBot: false,
    },
    metadata: { dateSent: existing?.createdAt ? new Date(existing.createdAt) : (event.deletedAt ?? new Date()) },
  } as Message;
}
