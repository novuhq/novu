import { ApiServiceLevelEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { getSidebarPlanCardVariant } from './sidebar-plan-card-variant';

function buildSubscription(apiServiceLevel: ApiServiceLevelEnum, isTrialActive = false) {
  return { apiServiceLevel, trial: { isActive: isTrialActive, start: null, end: null, daysTotal: 14 } };
}

describe('getSidebarPlanCardVariant', () => {
  it('shows no card until the subscription loads', () => {
    expect(getSidebarPlanCardVariant(undefined, 'paid')).toBeNull();
  });

  it('shows the trial card over every other card', () => {
    expect(getSidebarPlanCardVariant(buildSubscription(ApiServiceLevelEnum.PRO, true), 'paid')).toBe('trial');
  });

  it('shows the free usage card on the free plan, paused or not', () => {
    expect(getSidebarPlanCardVariant(buildSubscription(ApiServiceLevelEnum.FREE), null)).toBe('free_usage');
    expect(getSidebarPlanCardVariant(buildSubscription(ApiServiceLevelEnum.FREE), 'free')).toBe('free_usage');
  });

  it('shows the paused card only while a paid plan is paused', () => {
    expect(getSidebarPlanCardVariant(buildSubscription(ApiServiceLevelEnum.PRO), 'paid')).toBe('paused_usage');
    expect(getSidebarPlanCardVariant(buildSubscription(ApiServiceLevelEnum.PRO), null)).toBeNull();
  });
});
