import { ApiServiceLevelEnum, type GetSubscriptionDto } from '@novu/shared';
import { describe, expect, it, vi } from 'vitest';
import { getDefaultDateRange } from './use-analytics-page-date-filter';

// The dashboard config reads `window`, which the node test environment doesn't have.
vi.mock('../../../config', () => ({ IS_CLOUD: true, IS_SELF_HOSTED: false }));
vi.mock('../../../hooks/use-feature-flag', () => ({ useNumericFeatureFlag: () => 0 }));

const organization = { createdAt: new Date('2026-01-01') };
const subscription = (apiServiceLevel: ApiServiceLevelEnum) => ({ apiServiceLevel }) as GetSubscriptionDto;

describe('getDefaultDateRange', () => {
  it('opens on the period a link asks for when the plan allows it', () => {
    expect(
      getDefaultDateRange({
        organization,
        subscription: subscription(ApiServiceLevelEnum.BUSINESS),
        preferredDateRange: '7d',
      })
    ).toBe('7d');
  });

  it("falls back to the plan's default when the plan doesn't allow the period, or it isn't one", () => {
    const free = { organization, subscription: subscription(ApiServiceLevelEnum.FREE) };
    const freeDefault = getDefaultDateRange(free);

    expect(getDefaultDateRange({ ...free, preferredDateRange: '90d' })).toBe(freeDefault);
    expect(getDefaultDateRange({ ...free, preferredDateRange: '1y' })).toBe(freeDefault);
  });

  it('keeps the period a link asks for while the subscription loads', () => {
    expect(getDefaultDateRange({ organization, subscription: undefined, preferredDateRange: '7d' })).toBe('7d');
    expect(getDefaultDateRange({ organization, subscription: undefined, preferredDateRange: '1y' })).toBe('30d');
  });
});
