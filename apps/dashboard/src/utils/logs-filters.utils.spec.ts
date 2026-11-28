import { ApiServiceLevelEnum, type GetSubscriptionDto } from '@novu/shared';
import { describe, expect, it, vi } from 'vitest';
import { getMaxAvailableLogsDateRange, toRequestLogsCreatedGte } from './logs-filters.utils';

const config = vi.hoisted(() => ({ IS_SELF_HOSTED: false }));

vi.mock('../config', () => config);

describe('toRequestLogsCreatedGte', () => {
  const hourMs = 60 * 60 * 1000;
  const now = new Date('2026-11-26T12:00:00.000Z');
  const organization = { createdAt: new Date('2025-06-01T00:00:00.000Z') };
  const proSubscription = { apiServiceLevel: ApiServiceLevelEnum.PRO } as GetSubscriptionDto;

  it('leaves out a createdGte at or before the start of the retention window', () => {
    const windowStart = now.getTime() - 7 * 24 * hourMs;

    expect(
      toRequestLogsCreatedGte({ createdGte: windowStart, subscription: proSubscription, organization, now })
    ).toBeUndefined();
    expect(
      toRequestLogsCreatedGte({ createdGte: windowStart - 1, subscription: proSubscription, organization, now })
    ).toBeUndefined();
  });

  it('keeps a createdGte inside the retention window', () => {
    const createdGte = now.getTime() - 24 * hourMs;

    expect(toRequestLogsCreatedGte({ createdGte, subscription: proSubscription, organization, now })).toBe(createdGte);
  });

  it('leaves out the default range of a page opened before the window moved past it', () => {
    const freeSubscription = { apiServiceLevel: ApiServiceLevelEnum.FREE } as GetSubscriptionDto;
    vi.useFakeTimers({ now: now.getTime() - 2 * hourMs });
    const defaultAtOpen = Number(getMaxAvailableLogsDateRange({ subscription: freeSubscription, organization }));
    vi.useRealTimers();

    expect(
      toRequestLogsCreatedGte({ createdGte: defaultAtOpen, subscription: freeSubscription, organization, now })
    ).toBeUndefined();
  });

  it('keeps createdGte as is until the plan is known, and when self-hosted', () => {
    const createdGte = now.getTime() - 400 * 24 * hourMs;

    expect(toRequestLogsCreatedGte({ createdGte, subscription: null, organization, now })).toBe(createdGte);

    config.IS_SELF_HOSTED = true;
    expect(toRequestLogsCreatedGte({ createdGte, subscription: proSubscription, organization, now })).toBe(createdGte);
    config.IS_SELF_HOSTED = false;
  });
});
