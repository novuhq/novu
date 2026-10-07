import {
  ApiServiceLevelEnum,
  FeatureNameEnum,
  type GetSubscriptionDto,
  getFeatureForTierAsNumber,
  type IOrganizationUsageLimits,
} from '@novu/shared';

export type WorkflowRunsUsageState = 'within_included' | 'billed_on_demand' | 'paused';

export type PausedUsagePlan = 'free' | 'paid';

export type WorkflowRunsUsage = {
  /** Measured against the usage-alert allowance override while it is set, like `max`. */
  state: WorkflowRunsUsageState;
  current: number;
  /** The plan's included runs, even under the allowance override, since pausing and billing still follow them. */
  included: number;
  onDemandLimit: number | null;
  /**
   * The usage limit, or the included runs when no limit is set. Under the usage-alert allowance override, the
   * override plus an on-demand limit above it, or the override alone.
   */
  max: number;
  /**
   * Staging stand-in from `USAGE_ALERTS_ALLOWANCE_OVERRIDE_NUMBER`, matching alert evaluation: it replaces the
   * included runs under an on-demand limit, and otherwise caps the meter from 0. Null keeps the plan allowance.
   * Unlimited plans ignore it.
   */
  allowanceOverride: number | null;
  resetsAt: string | null;
  onDemandPricePer1k: number | null;
};

export type UsageLimitsView = {
  usage: WorkflowRunsUsage;
  settings: IOrganizationUsageLimits;
  isConfigurable: boolean;
  canEdit: boolean;
  /** Which paused-usage experience applies; null while new workflow runs are not paused. */
  pausedPlan: PausedUsagePlan | null;
};

type SubscriptionUsage = Pick<GetSubscriptionDto, 'apiServiceLevel' | 'events'>;

/** Unmetered or still-loading subscriptions have no `included`, so fall back to the plan's tier allowance for display. */
export function getIncludedWorkflowRuns(subscription: SubscriptionUsage | undefined): number {
  return (
    subscription?.events.included ??
    getFeatureForTierAsNumber(
      FeatureNameEnum.PLATFORM_MONTHLY_EVENTS_INCLUDED,
      subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE,
      false
    )
  );
}

export function getWorkflowRunsMax(subscription: SubscriptionUsage): number {
  return subscription.events.limit ?? getIncludedWorkflowRuns(subscription);
}

type WorkflowRunsMeter = {
  /** Usage past it is billed on-demand; null when nothing is. */
  onDemandFrom: number | null;
  max: number;
};

/** Must match how usage-alert evaluation applies the allowance override, so the meter shows what the alerts measure. */
function getWorkflowRunsMeter(
  subscription: SubscriptionUsage,
  onDemandLimit: number | null,
  allowanceOverride: number | null
): WorkflowRunsMeter {
  if (allowanceOverride === null) {
    return { onDemandFrom: subscription.events.included, max: getWorkflowRunsMax(subscription) };
  }

  if (onDemandLimit !== null && onDemandLimit > 0) {
    return { onDemandFrom: allowanceOverride, max: allowanceOverride + onDemandLimit };
  }

  return { onDemandFrom: null, max: allowanceOverride };
}

function getWorkflowRunsUsageState({ events }: SubscriptionUsage, onDemandFrom: number | null): WorkflowRunsUsageState {
  if (events.isPaused) {
    return 'paused';
  }

  if (onDemandFrom !== null && events.current > onDemandFrom) {
    return 'billed_on_demand';
  }

  return 'within_included';
}

const OVERAGE_WARNING_RATIO = 0.9;

/** Paid plans that pause at the limit, once 90% of the on-demand allowance is used and usage is not paused yet. */
export function isNearingOverageLimit(view: Pick<UsageLimitsView, 'usage' | 'settings'>): boolean {
  const { usage, settings } = view;

  if (usage.state === 'paused' || !settings.pauseAtLimit) {
    return false;
  }

  const { onDemandLimit } = usage;

  if (onDemandLimit === null || onDemandLimit <= 0) {
    return false;
  }

  const overageStart = usage.allowanceOverride ?? usage.included;

  return usage.current - overageStart >= onDemandLimit * OVERAGE_WARNING_RATIO;
}

function getPausedUsagePlan({ apiServiceLevel, events }: SubscriptionUsage): PausedUsagePlan | null {
  if (!events.isPaused) {
    return null;
  }

  switch (apiServiceLevel) {
    case ApiServiceLevelEnum.FREE:
      return 'free';
    case ApiServiceLevelEnum.PRO:
    case ApiServiceLevelEnum.BUSINESS:
      return 'paid';
    case ApiServiceLevelEnum.ENTERPRISE:
    case ApiServiceLevelEnum.UNLIMITED:
      return null;
    default: {
      const exhaustiveCheck: never = apiServiceLevel;

      return exhaustiveCheck;
    }
  }
}

/**
 * Same rule as usage-alert evaluation: `0` and any non-positive value keep the plan allowance.
 * A positive value stands in for the included runs under an on-demand limit, and is the cap from 0 otherwise.
 */
export function resolveUsageAlertsAllowanceOverride(value: number): number | null {
  if (!Number.isFinite(value) || value < 1) {
    return null;
  }

  return Math.floor(value);
}

/** Null until the subscription loads, and while the API reports usage limits as off for the organization. */
export function getUsageLimitsView(
  subscription: GetSubscriptionDto | undefined,
  canWriteBilling: boolean,
  allowanceOverride: number | null = null
): UsageLimitsView | null {
  const usageLimits = subscription?.usageLimits;

  if (!subscription || !usageLimits) {
    return null;
  }

  const measuredOverride =
    subscription.apiServiceLevel === ApiServiceLevelEnum.UNLIMITED ||
    allowanceOverride === null ||
    allowanceOverride < 1
      ? null
      : Math.floor(allowanceOverride);
  const { onDemandLimit } = usageLimits.settings.workflowRuns;
  const meter = getWorkflowRunsMeter(subscription, onDemandLimit, measuredOverride);

  return {
    usage: {
      state: getWorkflowRunsUsageState(subscription, meter.onDemandFrom),
      current: subscription.events.current,
      included: getIncludedWorkflowRuns(subscription),
      onDemandLimit,
      max: meter.max,
      allowanceOverride: measuredOverride,
      resetsAt: subscription.currentPeriodEnd,
      onDemandPricePer1k: usageLimits.onDemandPricePer1k,
    },
    settings: usageLimits.settings,
    isConfigurable: usageLimits.isConfigurable,
    canEdit: usageLimits.isConfigurable && canWriteBilling,
    pausedPlan: getPausedUsagePlan(subscription),
  };
}
