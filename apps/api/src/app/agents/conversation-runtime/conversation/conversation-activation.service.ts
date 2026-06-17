import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AgentEntitlementsService, AnalyticsService, PinoLogger, throwPlanLimitExceeded } from '@novu/application-generic';
import {
  classifyActivationReason,
  CommunityOrganizationRepository,
  ConversationActivationReasonEnum,
  ConversationActivationRepository,
  ConversationEntity,
  ConversationRepository,
  ConversationThreadKindEnum,
} from '@novu/dal';
import { ApiServiceLevelEnum, UNLIMITED_VALUE } from '@novu/shared';
import {
  trackAgentActiveConversationCounted,
  trackAgentActiveConversationLimitReached,
} from '../../shared/analytics/agent-analytics';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * How long a resolved billing period is served from memory. Periods change at
 * most monthly, so a short TTL keeps the inbound hot path off the EE billing
 * use case (itself Redis-cached for 24h) while staying fresh near boundaries.
 * TODO: Move to Redis Cache when we have enough traffic on this service
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
  /** Period identity activations are counted against: `stripe:<ISO start>` for billed orgs, `YYYY-MM` (UTC) otherwise. */
  periodKey: string;
  /** Inclusive UTC start of the period (Stripe period start for billed orgs, month start otherwise). */
  periodStart: Date;
  /** Exclusive UTC end of the period. */
  periodEnd: Date;
}

export interface ConversationActivationUsage {
  current: number;
  /** `null` when the tier is unlimited. */
  included: number | null;
  periodStart: Date;
  periodEnd: Date;
}

/** Outcome of the Free-tier gate; carries the resolved limit so callers don't re-fetch it. */
interface FreeTierBlockDecision {
  blocked: boolean;
  limit?: number;
  apiServiceLevel?: ApiServiceLevelEnum;
}

interface EngagementContext {
  conversation: ConversationEntity;
  platform: AgentPlatformEnum;
  organizationId: string;
  environmentId: string;
  agentId: string;
  /**
   * DM flag for window classification: the live `thread.isDM` (inbound) or the
   * persisted `conversation.isDirectMessage` (outbound). When absent the window
   * defaults to DIRECT (undercount-safe).
   */
  isDirectMessage?: boolean;
  now?: Date;
}

interface LimitCheckContext {
  /**
   * The conversation being engaged, or `undefined` for a brand-new thread that
   * hasn't been persisted yet — the gate evaluates it as a NEW activation so the
   * caller can block before creating an orphaned conversation.
   */
  conversation?: ConversationEntity;
  platform: AgentPlatformEnum;
  organizationId: string;
  /** Used for analytics when there is no conversation yet; otherwise taken from the conversation. */
  environmentId?: string;
  agentId?: string;
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
 * Counting is per organization (summed across environments), anchored to the
 * org's Stripe billing period (calendar month for self-hosted/unbilled orgs).
 * Nothing is reported to Stripe — this is a usage meter and a Free-tier
 * short-circuit only.
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
    private readonly analyticsService: AnalyticsService,
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

  /** Month-anchored period key (YYYY-MM, UTC). Stable across a Stripe cycle and a calendar fallback in the same month. */
  private monthKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  /** UTC calendar-month period — the anchor for self-hosted and unbilled orgs. */
  resolveCalendarPeriod(now: Date = new Date()): BillingPeriod {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const periodStart = new Date(Date.UTC(year, month, 1));

    return {
      periodKey: this.monthKey(periodStart),
      periodStart,
      periodEnd: new Date(Date.UTC(year, month + 1, 1)),
    };
  }

  /**
   * Resolves the billing period an active conversation is counted against.
   *
   *   - Cloud + EE billing + the org has a Stripe customer → the Stripe metered
   *     subscription's `current_period_start/end`.
   *   - Self-hosted / community / unbilled orgs → UTC calendar month.
   *   - Transient Stripe failure for a billed org → the last known period
   *     (sticky) rather than the calendar key, so a hiccup never manufactures a
   *     spurious new cycle and double-counts the meter.
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
    if (stripePeriod) {
      this.setPeriodCache(organizationId, stripePeriod, now);

      return stripePeriod;
    }

    // Billed org but the Stripe lookup failed transiently. Reuse the last known
    // period (sticky) instead of flipping to a calendar key — flipping would be
    // a different periodKey and would be read as a new billing cycle.
    if (cached) {
      this.setPeriodCache(organizationId, cached.value, now);

      return cached.value;
    }

    // Cold start with no cached period (rare) — fall back to calendar without
    // caching, so the next engagement retries Stripe and adopts the real period.
    return calendar;
  }

  /**
   * Reads the current Stripe billing period via the optional EE billing use
   * case. Returns `null` (caller falls back per the sticky rules) when the
   * billing module is absent, the subscription has no period, or anything fails.
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

      const subscription = await getSubscription.execute(billing.GetSubscriptionCommand.create({ organizationId }));
      if (!subscription?.currentPeriodStart || !subscription?.currentPeriodEnd) {
        return null;
      }

      const periodStart = new Date(subscription.currentPeriodStart);
      const periodEnd = new Date(subscription.currentPeriodEnd);

      // Key on the Stripe period start so two periods starting in the same UTC month
      // (plan change, trial conversion, cycle reset, short custom cycle) never collide
      // and overcount. Transient-failure protection comes from the sticky cache fallback
      // in `resolveBillingPeriod`, not from month-anchoring this key.
      return { periodKey: `stripe:${periodStart.toISOString()}`, periodStart, periodEnd };
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), organizationId },
        'Failed to resolve Stripe billing period; falling back per sticky rules'
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

  /**
   * Classifies a thread as DM or group for window selection. Prefers the
   * authoritative `isDirectMessage` (live thread inbound, or persisted on the
   * conversation). When absent (legacy conversation on the outbound path),
   * defaults to DIRECT — the wider 30d window is undercount-safe.
   */
  deriveThreadKind(isDirectMessage?: boolean): ConversationThreadKindEnum {
    if (isDirectMessage === undefined) {
      return ConversationThreadKindEnum.DIRECT;
    }

    return isDirectMessage ? ConversationThreadKindEnum.DIRECT : ConversationThreadKindEnum.GROUP;
  }

  resolveWindowMs(platform: AgentPlatformEnum, threadKind: ConversationThreadKindEnum): number {
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
        return this.unhandledPlatformWindow(platform);
    }
  }

  /**
   * Compile-time exhaustiveness guard: adding an `AgentPlatformEnum` member
   * without a window mapping fails the build here. Defensive at runtime
   * (returns the safe 30d default) in case a non-enum value is ever cast in.
   */
  private unhandledPlatformWindow(platform: never): number {
    this.logger.warn({ platform }, 'Unhandled agent platform for activation window; defaulting to 30 days');

    return ACTIVATION_WINDOW_MS.MONTH_30;
  }

  /**
   * Read-only: whether an agent engagement on this conversation right now would
   * start a new activation (and which reason), evaluated against the supplied
   * billing period. Returns `null` when it would fall inside the current
   * activation. Used by the Free-tier gate before dispatch — never mutates.
   * Delegates the decision to the shared `classifyActivationReason` rules.
   */
  classifyActivation(
    conversation: ConversationEntity | undefined,
    platform: AgentPlatformEnum,
    periodKey: string,
    options: { isDirectMessage?: boolean; now?: Date } = {}
  ): ConversationActivationReasonEnum | null {
    const now = options.now ?? new Date();
    const isDirectMessage = this.resolveIsDirectMessage(conversation, options.isDirectMessage);
    const windowMs = this.resolveWindowMs(platform, this.deriveThreadKind(isDirectMessage));
    const windowThresholdIso = new Date(now.getTime() - windowMs).toISOString();

    // No conversation yet → no billing state → the shared rules classify it as NEW.
    return classifyActivationReason(conversation?.billing, { periodKey, windowThresholdIso });
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
    const isDirectMessage = this.resolveIsDirectMessage(context.conversation, context.isDirectMessage);
    const threadKind = this.deriveThreadKind(isDirectMessage);
    const windowMs = this.resolveWindowMs(context.platform, threadKind);
    const nowIso = now.toISOString();
    const windowThresholdIso = new Date(now.getTime() - windowMs).toISOString();

    const reason = classifyActivationReason(context.conversation.billing, { periodKey, windowThresholdIso });

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

    await this.emitCountedAnalytics(context, threadKind, reason, periodKey);

    return true;
  }

  /**
   * Fire-and-forget analytics for a counted activation. Always emits the
   * "counted" event; additionally emits "limit reached" (blocked=false) for
   * finite tiers once usage is at/over the included limit, so paid overage is
   * measured per extra conversation. Fully isolated — analytics must never
   * affect counting.
   */
  private async emitCountedAnalytics(
    context: EngagementContext,
    threadKind: ConversationThreadKindEnum,
    reason: ConversationActivationReasonEnum,
    periodKey: string
  ): Promise<void> {
    try {
      const apiServiceLevel = await this.agentEntitlements.getApiServiceLevel(context.organizationId);

      trackAgentActiveConversationCounted(this.analyticsService, {
        organizationId: context.organizationId,
        environmentId: context.environmentId,
        agentId: context.agentId,
        conversationId: context.conversation._id,
        platform: context.platform,
        threadKind,
        reason,
        periodKey,
        apiServiceLevel,
      });

      const limit = await this.agentEntitlements.getActiveConversationsLimit(context.organizationId, apiServiceLevel);
      if (limit >= UNLIMITED_VALUE) {
        return;
      }

      const currentCount = await this.activationRepository.countForOrganizationPeriod(context.organizationId, periodKey);
      if (currentCount >= limit) {
        trackAgentActiveConversationLimitReached(this.analyticsService, {
          organizationId: context.organizationId,
          environmentId: context.environmentId,
          agentId: context.agentId,
          conversationId: context.conversation._id,
          platform: context.platform,
          apiServiceLevel,
          limit,
          currentCount,
          overage: Math.max(0, currentCount - limit),
          blocked: false,
        });
      }
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), organizationId: context.organizationId },
        'Failed to emit active-conversation analytics'
      );
    }
  }

  /**
   * Whether a Free-tier organization (not on trial) must be blocked from
   * starting a *new* activation because it has reached its included limit.
   * Existing activations within their window/period keep working — only new
   * conversations are short-circuited. Paid tiers and trials are never blocked
   * (counting only). Fails open on any error so a transient failure never
   * silently disables a customer's agent. Returns the resolved limit/level so
   * callers (e.g. the outbound 402) don't re-fetch them.
   */
  async shouldBlockFreeTier(context: LimitCheckContext): Promise<FreeTierBlockDecision> {
    try {
      const organization = await this.organizationRepository.findById(
        context.organizationId,
        '_id apiServiceLevel isTrial'
      );

      const apiServiceLevel = organization?.apiServiceLevel ?? ApiServiceLevelEnum.FREE;
      const isBlockableFreeTier = apiServiceLevel === ApiServiceLevelEnum.FREE && !organization?.isTrial;
      if (!isBlockableFreeTier) {
        return { blocked: false, apiServiceLevel };
      }

      const now = context.now ?? new Date();
      const { periodKey } = await this.resolveBillingPeriod(context.organizationId, now);

      const reason = this.classifyActivation(context.conversation, context.platform, periodKey, {
        isDirectMessage: context.isDirectMessage,
        now,
      });
      if (!reason) {
        return { blocked: false, apiServiceLevel };
      }

      const limit = await this.agentEntitlements.getActiveConversationsLimit(context.organizationId, apiServiceLevel);
      if (limit >= UNLIMITED_VALUE) {
        return { blocked: false, limit, apiServiceLevel };
      }

      const current = await this.activationRepository.countForOrganizationPeriod(
        context.organizationId,
        periodKey,
        limit + 1
      );
      const willBlock = current >= limit;

      if (willBlock) {
        // Isolated so an analytics failure can never flip the block decision.
        try {
          trackAgentActiveConversationLimitReached(this.analyticsService, {
            organizationId: context.organizationId,
            environmentId: context.conversation?._environmentId ?? context.environmentId ?? '',
            agentId: context.conversation?._agentId ?? context.agentId ?? '',
            conversationId: context.conversation?._id ?? '',
            platform: context.platform,
            apiServiceLevel,
            limit,
            currentCount: current,
            overage: Math.max(0, current - limit),
            blocked: true,
          });
        } catch {
          // Swallow — never let analytics affect gating.
        }
      }

      return { blocked: willBlock, limit, apiServiceLevel };
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), organizationId: context.organizationId },
        'Failed to evaluate active-conversation limit; failing open (not blocking)'
      );

      return { blocked: false };
    }
  }

  /**
   * Hard-stops an agent-initiated (outbound) message that would start a new
   * active conversation for a Free-tier organization at its limit, throwing the
   * shared 402 plan-limit error. Existing conversations and paid tiers pass
   * through untouched. Reuses the limit resolved by the gate.
   */
  async assertOutboundWithinLimit(context: LimitCheckContext): Promise<void> {
    const decision = await this.shouldBlockFreeTier(context);
    if (!decision.blocked) {
      return;
    }

    const limit = decision.limit ?? (await this.agentEntitlements.getActiveConversationsLimit(context.organizationId));

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

  /** Live hint takes precedence; otherwise the value persisted on the conversation (if any). */
  private resolveIsDirectMessage(conversation: ConversationEntity | undefined, hint?: boolean): boolean | undefined {
    return hint ?? conversation?.isDirectMessage;
  }
}
