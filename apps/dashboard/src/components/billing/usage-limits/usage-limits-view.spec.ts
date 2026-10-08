import { ApiServiceLevelEnum, type GetSubscriptionDto, UsageAlertRecipientsEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { getUsageLimitsView, isNearingOverageLimit, resolveUsageAlertsAllowanceOverride } from './usage-limits-view';

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
              workflowRuns: { onDemandLimit: null },
              pauseAtLimit: false,
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
    expect(getUsageLimitsView(buildSubscription(), true)?.usage.allowanceOverride).toBeNull();
    expect(getUsageLimitsView(buildSubscription(), true, 0)?.usage.max).toBe(30000);
  });

  it('measures the meter from 0 to the usage alert allowance override without an on-demand limit', () => {
    const view = getUsageLimitsView(buildSubscription({ events: { current: 28 } }), true, 20);

    expect(view?.usage.max).toBe(20);
    expect(view?.usage.allowanceOverride).toBe(20);
    expect(view?.usage.current).toBe(28);
    expect(view?.usage.included).toBe(30000);
    expect(view?.usage.state).toBe('within_included');
  });

  it('stands the usage alert allowance override in for the included runs under an on-demand limit', () => {
    const withOnDemandLimit = (current: number) =>
      getUsageLimitsView(
        buildSubscription({
          events: { current, limit: 30010 },
          usageLimits: {
            settings: {
              workflowRuns: { onDemandLimit: 10 },
              pauseAtLimit: false,
              alerts: { enabled: true, sendTo: UsageAlertRecipientsEnum.ADMINS },
            },
          },
        }),
        true,
        20
      );

    expect(withOnDemandLimit(20)?.usage).toMatchObject({ max: 30, included: 30000, state: 'within_included' });
    expect(withOnDemandLimit(28)?.usage).toMatchObject({ max: 30, included: 30000, state: 'billed_on_demand' });
  });

  it('keeps the plan allowance for unlimited organizations', () => {
    const view = getUsageLimitsView(buildSubscription({ apiServiceLevel: ApiServiceLevelEnum.UNLIMITED }), true, 20);

    expect(view?.usage.max).toBe(30000);
    expect(view?.usage.allowanceOverride).toBeNull();
  });

  describe('resolveUsageAlertsAllowanceOverride', () => {
    it('keeps the plan allowance for non-positive values and floors a positive cap', () => {
      expect(resolveUsageAlertsAllowanceOverride(0)).toBeNull();
      expect(resolveUsageAlertsAllowanceOverride(-5)).toBeNull();
      expect(resolveUsageAlertsAllowanceOverride(Number.NaN)).toBeNull();
      expect(resolveUsageAlertsAllowanceOverride(20.9)).toBe(20);
    });
  });

  it('allows editing only on configurable plans with billing write', () => {
    const notConfigurable = buildSubscription({ usageLimits: { isConfigurable: false } });

    expect(getUsageLimitsView(buildSubscription(), true)?.canEdit).toBe(true);
    expect(getUsageLimitsView(buildSubscription(), false)?.canEdit).toBe(false);
    expect(getUsageLimitsView(notConfigurable, true)?.canEdit).toBe(false);
  });

  it('warns once 90% of the on-demand allowance is used and usage is not paused', () => {
    const pausingAt10k = {
      settings: {
        workflowRuns: { onDemandLimit: 10_000 },
        pauseAtLimit: true,
        alerts: { enabled: true, sendTo: UsageAlertRecipientsEnum.ADMINS },
      },
    };
    const nearing = getUsageLimitsView(
      buildSubscription({ events: { current: 39_000, limit: 40_000 }, usageLimits: pausingAt10k }),
      true
    );
    const under = getUsageLimitsView(
      buildSubscription({ events: { current: 38_999, limit: 40_000 }, usageLimits: pausingAt10k }),
      true
    );
    const paused = getUsageLimitsView(
      buildSubscription({
        events: { current: 40_000, limit: 40_000, isPaused: true },
        usageLimits: pausingAt10k,
      }),
      true
    );

    expect(nearing && isNearingOverageLimit(nearing)).toBe(true);
    expect(under && isNearingOverageLimit(under)).toBe(false);
    expect(paused && isNearingOverageLimit(paused)).toBe(false);
  });

  it('warns from the included runs when a usage alert allowance override is set', () => {
    const pausingAt10k = {
      settings: {
        workflowRuns: { onDemandLimit: 10_000 },
        pauseAtLimit: true,
        alerts: { enabled: true, sendTo: UsageAlertRecipientsEnum.ADMINS },
      },
    };
    const atOverride = getUsageLimitsView(
      buildSubscription({ events: { current: 9_020, limit: 40_000 }, usageLimits: pausingAt10k }),
      true,
      20
    );
    const underPause = getUsageLimitsView(
      buildSubscription({ events: { current: 38_999, limit: 40_000 }, usageLimits: pausingAt10k }),
      true,
      20
    );
    const nearingPause = getUsageLimitsView(
      buildSubscription({ events: { current: 39_000, limit: 40_000 }, usageLimits: pausingAt10k }),
      true,
      20
    );

    expect(atOverride && isNearingOverageLimit(atOverride)).toBe(false);
    expect(underPause && isNearingOverageLimit(underPause)).toBe(false);
    expect(nearingPause && isNearingOverageLimit(nearingPause)).toBe(true);
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
