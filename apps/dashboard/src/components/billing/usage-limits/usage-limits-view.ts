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
  state: WorkflowRunsUsageState;
  current: number;
  included: number;
  onDemandLimit: number | null;
  /** The usage limit, or the included runs when no limit is set. */
  max: number;
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

function getWorkflowRunsUsageState({ events }: SubscriptionUsage): WorkflowRunsUsageState {
  if (events.isPaused) {
    return 'paused';
  }

  if (events.included !== null && events.current > events.included) {
    return 'billed_on_demand';
  }

  return 'within_included';
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

/** Null until the subscription loads, and while the API reports usage limits as off for the organization. */
export function getUsageLimitsView(
  subscription: GetSubscriptionDto | undefined,
  canWriteBilling: boolean
): UsageLimitsView | null {
  const usageLimits = subscription?.usageLimits;

  if (!subscription || !usageLimits) {
    return null;
  }

  return {
    usage: {
      state: getWorkflowRunsUsageState(subscription),
      current: subscription.events.current,
      included: getIncludedWorkflowRuns(subscription),
      onDemandLimit: usageLimits.settings.workflowRuns.onDemandLimit,
      max: getWorkflowRunsMax(subscription),
      resetsAt: subscription.currentPeriodEnd,
      onDemandPricePer1k: usageLimits.onDemandPricePer1k,
    },
    settings: usageLimits.settings,
    isConfigurable: usageLimits.isConfigurable,
    canEdit: usageLimits.isConfigurable && canWriteBilling,
    pausedPlan: getPausedUsagePlan(subscription),
  };
}
