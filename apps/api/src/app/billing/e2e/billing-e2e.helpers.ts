import { IOrganizationUsageLimits, UsageAlertRecipientsEnum } from '@novu/shared';

/** Its alerts differ from the defaults, so a test can tell the stored settings from the defaults. */
export const PAUSING_USAGE_LIMITS: IOrganizationUsageLimits = {
  workflowRuns: { onDemandLimit: 10_000, pauseAtLimit: true },
  alerts: { enabled: false, sendTo: UsageAlertRecipientsEnum.ALL_MEMBERS },
};

/**
 * The Stripe subscription lookup of an active monthly subscription. Typed structurally because this file is part of
 * the build, which must not import `@novu/ee-billing`.
 */
export function buildStripeSubscription(includedEvents: number | null) {
  return {
    includedEvents,
    currentPeriodStart: '2024-04-05T00:00:00.000Z',
    currentPeriodEnd: '2024-05-05T00:00:00.000Z',
    status: 'active' as const,
    trialStart: null,
    trialEnd: null,
    cancelAt: null,
    hasPaymentMethod: true,
    billingInterval: 'month' as const,
    skip: null,
  };
}

/** Sets the variables before each test and restores them after it, so it must be called inside a `describe`. */
export function useEnvironment(variables: Record<string, string>): void {
  let originals: Record<string, string | undefined> = {};

  beforeEach(() => {
    originals = Object.fromEntries(Object.keys(variables).map((name) => [name, process.env[name]]));
    Object.assign(process.env, variables);
  });

  afterEach(() => {
    for (const [name, value] of Object.entries(originals)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });
}
