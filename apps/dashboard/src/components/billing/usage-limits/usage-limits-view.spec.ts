import { ApiServiceLevelEnum, type GetSubscriptionDto, UsageAlertRecipientsEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { getUsageLimitsView } from './usage-limits-view';

type SubscriptionOverrides = {
  apiServiceLevel?: ApiServiceLevelEnum;
  events?: Partial<GetSubscriptionDto['events']>;
  usageLimits?: Partial<NonNullable<GetSubscriptionDto['usageLimits']>> | null;
};

function buildSubscription({
  apiServiceLevel = ApiServiceLevelEnum.PRO,
  events,
  usageLimits,
}: SubscriptionOverrides = {}): GetSubscriptionDto {
  return {
    apiServiceLevel,
    isActive: true,
    hasPaymentMethod: true,
    status: 'active',
    currentPeriodStart: '2026-10-01T00:00:00.000Z',
    currentPeriodEnd: '2026-10-31T00:00:00.000Z',
    billingInterval: 'month',
    events: { current: 1000, included: 30000, limit: null, isPaused: false, ...events },
    usageLimits:
      usageLimits === null
        ? null
        : {
            isConfigurable: true,
            onDemandPricePer1k: 1.2,
            settings: {
              workflowRuns: { onDemandLimit: null, pauseAtLimit: false },
              alerts: { enabled: true, sendTo: UsageAlertRecipientsEnum.ADMINS },
            },
            ...usageLimits,
          },
    trial: { isActive: false, start: null, end: null, daysTotal: 0 },
    cancelAt: null,
  };
}

describe('getUsageLimitsView', () => {
  it('is null until the subscription loads and while usage limits are off', () => {
    expect(getUsageLimitsView(undefined, true)).toBeNull();
    expect(getUsageLimitsView(buildSubscription({ usageLimits: null }), true)).toBeNull();
  });

  it('bills on-demand only once usage exceeds the included runs', () => {
    const atIncluded = getUsageLimitsView(buildSubscription({ events: { current: 30000 } }), true);
    const overIncluded = getUsageLimitsView(buildSubscription({ events: { current: 30001 } }), true);

    expect(atIncluded?.usage.state).toBe('within_included');
    expect(overIncluded?.usage.state).toBe('billed_on_demand');
  });

  it('never bills on-demand for unmetered subscriptions', () => {
    const view = getUsageLimitsView(buildSubscription({ events: { current: 10_000_000, included: null } }), true);

    expect(view?.usage.state).toBe('within_included');
  });

  it('reports paused usage over every other state', () => {
    const view = getUsageLimitsView(
      buildSubscription({ events: { current: 40000, limit: 35000, isPaused: true } }),
      true
    );

    expect(view?.usage.state).toBe('paused');
  });

  it('measures usage against the limit, or the included runs without one', () => {
    expect(getUsageLimitsView(buildSubscription({ events: { limit: 35000 } }), true)?.usage.max).toBe(35000);
    expect(getUsageLimitsView(buildSubscription(), true)?.usage.max).toBe(30000);
  });

  it('allows editing only on configurable plans with billing write', () => {
    const notConfigurable = buildSubscription({ usageLimits: { isConfigurable: false } });

    expect(getUsageLimitsView(buildSubscription(), true)?.canEdit).toBe(true);
    expect(getUsageLimitsView(buildSubscription(), false)?.canEdit).toBe(false);
    expect(getUsageLimitsView(notConfigurable, true)?.canEdit).toBe(false);
  });

  it('picks the paused experience by plan', () => {
    const paused = { isPaused: true };

    expect(getUsageLimitsView(buildSubscription(), true)?.pausedPlan).toBeNull();
    expect(
      getUsageLimitsView(buildSubscription({ apiServiceLevel: ApiServiceLevelEnum.FREE, events: paused }), true)
        ?.pausedPlan
    ).toBe('free');
    expect(
      getUsageLimitsView(buildSubscription({ apiServiceLevel: ApiServiceLevelEnum.BUSINESS, events: paused }), true)
        ?.pausedPlan
    ).toBe('paid');
    expect(
      getUsageLimitsView(buildSubscription({ apiServiceLevel: ApiServiceLevelEnum.ENTERPRISE, events: paused }), true)
        ?.pausedPlan
    ).toBeNull();
  });
});
