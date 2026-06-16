import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AgentEntitlementsService, PinoLogger, throwPlanLimitExceeded } from '@novu/application-generic';
import {
  CommunityOrganizationRepository,
  ConversationActivationReasonEnum,
  ConversationActivationRepository,
  ConversationEntity,
  ConversationRepository,
  ConversationThreadKindEnum,
} from '@novu/dal';
import { ApiServiceLevelEnum, UNLIMITED_VALUE } from '@novu/shared';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * How long a resolved billing period is served from memory. Periods change at
 * most monthly, so a short TTL keeps the inbound hot path off the EE billing
 * use case (itself Redis-cached for 24h) while staying fresh near boundaries.
 */
const PERIOD_CACHE_TTL_MS = 60_000;
const PERIOD_CACHE_MAX_ENTRIES = 10_000;

/** Rolling inactivity windows per channel kind (see plan counting model). */
export const ACTIVATION_WINDOW_MS = {
  /** WhatsApp / Telegram — a fresh reply after 24h of silence is a new conversation. */
  DAY: DAY_MS,
  /** Slack / Teams group threads — every new 7-day stretch of activity counts again. */
  WEEK: 7 * DAY_MS,
  /** Slack / Teams DMs and email threads. */
  MONTH_30: 30 * DAY_MS,
} as const;

export interface BillingPeriod {
  /** YYYY-MM (UTC) — the key activations are counted against. */
  periodKey: string;
  /** Inclusive UTC start of the period. */
  periodStart: Date;
  /** Exclusive UTC end of the period (start of next month). */
  periodEnd: Date;
}

export interface ConversationActivationUsage {
  current: number;
  /** `null` when the tier is unlimited. */
  included: number | null;
  periodStart: Date;
  periodEnd: Date;
}

interface EngagementContext {
  conversation: ConversationEntity;
  platform: string;
  organizationId: string;
  environmentId: string;
  agentId: string;
  /** Authoritative DM flag from the live thread when available (inbound path). */
  isDirectMessage?: boolean;
  now?: Date;
}

/**
 * Owns the "active conversation / month" counting model. An active conversation
 * is counted once per activation episode: the first agent engagement on a
 * (re)opened thread, again once a channel's rolling inactivity window lapses,
 * and again whenever a new billing period begins. Closing a thread ends the
 * activation; reopening it starts a new one.
 *
 * Counting is per organization (summed across environments) and anchored to the
 * UTC calendar month. Nothing is reported to Stripe — this is a usage meter and
 * a Free-tier short-circuit only.
 */
@Injectable()
export class ConversationActivationService {
  private readonly periodCache = new Map<string, { value: BillingPeriod; expiresAt: number }>();

  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly activationRepository: ConversationActivationRepository,
    private readonly organizationRepository: CommunityOrganizationRepository,
    private readonly agentEntitlements: AgentEntitlementsService,
    private readonly moduleRef: ModuleRef,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  private get isSelfHosted(): boolean {
    return process.env.IS_SELF_HOSTED === 'true';
  }

  private get isEnterpriseBillingEnabled(): boolean {
    return process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';
  }

  /** UTC calendar-month period — the anchor for community, self-hosted, and unbilled orgs. */
  resolveCalendarPeriod(now: Date = new Date()): BillingPeriod {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();

    return {
      periodKey: `${year}-${String(month + 1).padStart(2, '0')}`,
      periodStart: new Date(Date.UTC(year, month, 1)),
      periodEnd: new Date(Date.UTC(year, month + 1, 1)),
    };
  }

  /**
   * Resolves the billing period an active conversation is counted against.
   *
   *   - Cloud + EE billing + the org already has a Stripe customer → the Stripe
   *     metered subscription's `current_period_start/end` (aligns counting to the
   *     invoice cycle).
   *   - Self-hosted, community builds, unbilled/free orgs (no Stripe customer),
   *     or any resolution failure → UTC calendar month.
   *
   * Free/unbilled orgs deliberately never trigger the EE `GetSubscription` path:
   * it would create a Stripe customer as a side effect. Resolved periods are
   * cached briefly per organization.
   */
  async resolveBillingPeriod(organizationId: string, now: Date = new Date()): Promise<BillingPeriod> {
    const calendar = this.resolveCalendarPeriod(now);

    if (this.isSelfHosted || !this.isEnterpriseBillingEnabled) {
      return calendar;
    }

    const cached = this.periodCache.get(organizationId);
    if (cached && cached.expiresAt > now.getTime() && now < cached.value.periodEnd) {
      return cached.value;
    }

    // Only orgs that already have a Stripe customer are billed; resolving the
    // subscription for the rest would create a customer as a side effect.
    const organization = await this.organizationRepository.findById(organizationId, '_id stripeCustomerId');
    if (!organization?.stripeCustomerId) {
      this.setPeriodCache(organizationId, calendar, now);

      return calendar;
    }

    const stripePeriod = await this.fetchStripeBillingPeriod(organizationId);
    const value = stripePeriod ?? calendar;
    this.setPeriodCache(organizationId, value, now);

    return value;
  }

  /**
   * Reads the current Stripe billing period via the optional EE billing use
   * case. Returns `null` (caller falls back to calendar month) when the billing
   * module is absent, the subscription has no period, or anything fails.
   * Isolated so it can be stubbed in tests with dummy period data.
   */
  protected async fetchStripeBillingPeriod(organizationId: string): Promise<BillingPeriod | null> {
    try {
      const billing = this.loadEeBilling();
      if (!billing?.GetSubscription || !billing?.GetSubscriptionCommand) {
        return null;
      }

      const getSubscription = this.moduleRef.get(billing.GetSubscription, { strict: false });
      if (!getSubscription) {
        return null;
      }

      const subscription = await getSubscription.execute(
        billing.GetSubscriptionCommand.create({ organizationId })
      );
      if (!subscription?.currentPeriodStart || !subscription?.currentPeriodEnd) {
        return null;
      }

      const periodStart = new Date(subscription.currentPeriodStart);
      const periodEnd = new Date(subscription.currentPeriodEnd);

      return { periodKey: `stripe:${periodStart.toISOString()}`, periodStart, periodEnd };
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), organizationId },
        'Failed to resolve Stripe billing period; falling back to calendar month'
      );

      return null;
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: optional EE module surface is untyped in OSS builds
  private loadEeBilling(): any {
    try {
      // biome-ignore lint/style/noCommonJs: dynamic require keeps @novu/ee-billing optional for OSS builds
      return require('@novu/ee-billing');
    } catch {
      return null;
    }
  }

  private setPeriodCache(organizationId: string, value: BillingPeriod, now: Date): void {
    if (this.periodCache.size >= PERIOD_CACHE_MAX_ENTRIES) {
      this.periodCache.clear();
    }

    this.periodCache.set(organizationId, { value, expiresAt: now.getTime() + PERIOD_CACHE_TTL_MS });
  }

  deriveThreadKind(platform: string, platformThreadId: string, isDirectMessageHint?: boolean): ConversationThreadKindEnum {
    if (isDirectMessageHint !== undefined) {
      return isDirectMessageHint ? ConversationThreadKindEnum.DIRECT : ConversationThreadKindEnum.GROUP;
    }

    // No live thread hint (outbound path): infer for Slack/Teams from the thread
    // id. Slack DM channel ids start with `D` (e.g. `slack:D08…`). Other
    // platforms are 1:1 and treated as direct (their window is DM-independent).
    if (platform === AgentPlatformEnum.SLACK || platform === AgentPlatformEnum.TEAMS) {
      return /:D[^:]/i.test(platformThreadId) ? ConversationThreadKindEnum.DIRECT : ConversationThreadKindEnum.GROUP;
    }

    return ConversationThreadKindEnum.DIRECT;
  }

  resolveWindowMs(platform: string, threadKind: ConversationThreadKindEnum): number {
    switch (platform) {
      case AgentPlatformEnum.WHATSAPP:
      case AgentPlatformEnum.TELEGRAM:
        return ACTIVATION_WINDOW_MS.DAY;
      case AgentPlatformEnum.SLACK:
      case AgentPlatformEnum.TEAMS:
        return threadKind === ConversationThreadKindEnum.DIRECT
          ? ACTIVATION_WINDOW_MS.MONTH_30
          : ACTIVATION_WINDOW_MS.WEEK;
      case AgentPlatformEnum.EMAIL:
        return ACTIVATION_WINDOW_MS.MONTH_30;
      default:
        return ACTIVATION_WINDOW_MS.MONTH_30;
    }
  }

  /**
   * Read-only: whether an agent engagement on this conversation right now would
   * start a new activation (and which reason), evaluated against the supplied
   * billing period. Returns `null` when it would fall inside the current
   * activation. Used by the Free-tier gate before dispatch — never mutates.
   */
  classifyActivation(
    conversation: ConversationEntity,
    platform: string,
    periodKey: string,
    options: { isDirectMessage?: boolean; now?: Date } = {}
  ): ConversationActivationReasonEnum | null {
    const now = options.now ?? new Date();
    const threadKind = this.deriveThreadKind(platform, this.primaryThreadId(conversation), options.isDirectMessage);
    const windowMs = this.resolveWindowMs(platform, threadKind);
    const windowThreshold = new Date(now.getTime() - windowMs);

    const billing = conversation.billing;

    if (!billing?.lastCountedPeriodKey) {
      return ConversationActivationReasonEnum.NEW;
    }

    if (billing.resolvedAt) {
      return ConversationActivationReasonEnum.REOPEN;
    }

    if (billing.lastCountedPeriodKey !== periodKey) {
      return ConversationActivationReasonEnum.NEW_CYCLE;
    }

    if (billing.lastEngagementAt && new Date(billing.lastEngagementAt) < windowThreshold) {
      return ConversationActivationReasonEnum.WINDOW_EXPIRED;
    }

    return null;
  }

  /**
   * Records an agent engagement on a conversation, counting a new active
   * conversation when warranted. Idempotent within an activation: engagements
   * inside the current window/period only slide the rolling window. Safe under
   * concurrency — only the caller that wins the atomic claim writes a count.
   * Returns whether a new activation was counted.
   */
  async registerEngagement(context: EngagementContext): Promise<boolean> {
    const now = context.now ?? new Date();
    const { periodKey } = await this.resolveBillingPeriod(context.organizationId, now);
    const threadKind = this.deriveThreadKind(
      context.platform,
      this.primaryThreadId(context.conversation),
      context.isDirectMessage
    );
    const windowMs = this.resolveWindowMs(context.platform, threadKind);
    const nowIso = now.toISOString();
    const windowThresholdIso = new Date(now.getTime() - windowMs).toISOString();

    const reason = this.classifyActivation(context.conversation, context.platform, periodKey, {
      isDirectMessage: context.isDirectMessage,
      now,
    });

    if (!reason) {
      await this.slideWindow(context, nowIso);

      return false;
    }

    const claimed = await this.conversationRepository.startActivationIfNeeded({
      environmentId: context.environmentId,
      organizationId: context.organizationId,
      conversationId: context.conversation._id,
      periodKey,
      windowThresholdIso,
      nowIso,
    });

    if (!claimed) {
      // Lost the race (another concurrent engagement counted first) — still
      // slide the window so the rolling clock reflects this engagement.
      await this.slideWindow(context, nowIso);

      return false;
    }

    await this.activationRepository.recordActivation({
      environmentId: context.environmentId,
      organizationId: context.organizationId,
      conversationId: context.conversation._id,
      agentId: context.agentId,
      platform: context.platform,
      threadKind,
      reason,
      periodKey,
    });

    return true;
  }

  /**
   * Whether a Free-tier organization (not on trial) must be blocked from
   * starting a *new* activation because it has reached its included limit.
   * Existing activations within their window/period keep working — only new
   * conversations are short-circuited. Paid tiers and trials are never blocked
   * (counting only). Fails open on any error so a transient failure never
   * silently disables a customer's agent.
   */
  async shouldBlockFreeTier(context: {
    conversation: ConversationEntity;
    platform: string;
    organizationId: string;
    isDirectMessage?: boolean;
    now?: Date;
  }): Promise<boolean> {
    try {
      const organization = await this.organizationRepository.findById(
        context.organizationId,
        '_id apiServiceLevel isTrial'
      );

      const apiServiceLevel = organization?.apiServiceLevel ?? ApiServiceLevelEnum.FREE;
      const isBlockableFreeTier = apiServiceLevel === ApiServiceLevelEnum.FREE && !organization?.isTrial;
      if (!isBlockableFreeTier) {
        return false;
      }

      const now = context.now ?? new Date();
      const { periodKey } = await this.resolveBillingPeriod(context.organizationId, now);

      const reason = this.classifyActivation(context.conversation, context.platform, periodKey, {
        isDirectMessage: context.isDirectMessage,
        now,
      });
      if (!reason) {
        return false;
      }

      const limit = await this.agentEntitlements.getActiveConversationsLimit(context.organizationId, apiServiceLevel);
      if (limit >= UNLIMITED_VALUE) {
        return false;
      }

      const current = await this.activationRepository.countForOrganizationPeriod(
        context.organizationId,
        periodKey,
        limit + 1
      );

      return current >= limit;
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), organizationId: context.organizationId },
        'Failed to evaluate active-conversation limit; failing open (not blocking)'
      );

      return false;
    }
  }

  /**
   * Hard-stops an agent-initiated (outbound) message that would start a new
   * active conversation for a Free-tier organization at its limit, throwing the
   * shared 402 plan-limit error. Existing conversations and paid tiers pass
   * through untouched.
   */
  async assertOutboundWithinLimit(context: {
    conversation: ConversationEntity;
    platform: string;
    organizationId: string;
    isDirectMessage?: boolean;
    now?: Date;
  }): Promise<void> {
    const blocked = await this.shouldBlockFreeTier(context);
    if (!blocked) {
      return;
    }

    const limit = await this.agentEntitlements.getActiveConversationsLimit(context.organizationId);

    throwPlanLimitExceeded({
      resource: 'active conversations',
      limitSource: 'plan',
      limit,
      currentCount: limit,
      planMessage:
        `You have reached the number of active conversations included in your plan (${limit}). ` +
        'Upgrade your plan to start new conversations.',
    });
  }

  async getUsage(organizationId: string): Promise<ConversationActivationUsage> {
    const { periodKey, periodStart, periodEnd } = await this.resolveBillingPeriod(organizationId);
    const [limit, current] = await Promise.all([
      this.agentEntitlements.getActiveConversationsLimit(organizationId),
      this.activationRepository.countForOrganizationPeriod(organizationId, periodKey),
    ]);

    return {
      current,
      included: limit >= UNLIMITED_VALUE ? null : limit,
      periodStart,
      periodEnd,
    };
  }

  private async slideWindow(context: EngagementContext, nowIso: string): Promise<void> {
    // Only meaningful once the conversation has been counted at least once;
    // before that there is no window to slide and the next engagement counts.
    if (!context.conversation.billing?.lastCountedPeriodKey) {
      return;
    }

    await this.conversationRepository.bumpLastEngagement(
      context.environmentId,
      context.organizationId,
      context.conversation._id,
      nowIso
    );
  }

  private primaryThreadId(conversation: ConversationEntity): string {
    return conversation.channels?.[0]?.platformThreadId ?? '';
  }
}
