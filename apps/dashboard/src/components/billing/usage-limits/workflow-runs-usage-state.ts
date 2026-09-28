import { ApiServiceLevelEnum, FeatureNameEnum, type GetSubscriptionDto, getFeatureForTierAsNumber } from '@novu/shared';

export type WorkflowRunsUsageState = 'within_included' | 'billed_on_demand' | 'limit_crossed' | 'paused';

type WorkflowRunsUsage = Pick<GetSubscriptionDto['events'], 'current' | 'included' | 'limit' | 'isPaused'>;

export function getWorkflowRunsUsageState(events: WorkflowRunsUsage): WorkflowRunsUsageState {
  if (events.isPaused) {
    return 'paused';
  }

  if (events.limit !== null && events.current >= events.limit) {
    return 'limit_crossed';
  }

  if (events.included !== null && events.current > events.included) {
    return 'billed_on_demand';
  }

  return 'within_included';
}

/** Unmetered or still-loading subscriptions have no `included`, so fall back to the plan's tier allowance for display. */
export function getIncludedWorkflowRuns(
  subscription: Pick<GetSubscriptionDto, 'apiServiceLevel' | 'events'> | undefined
): number {
  return (
    subscription?.events.included ??
    getFeatureForTierAsNumber(
      FeatureNameEnum.PLATFORM_MONTHLY_EVENTS_INCLUDED,
      subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE,
      false
    )
  );
}
