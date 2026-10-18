import { HttpStatus } from '@nestjs/common';
import { ApiServiceLevelEnum } from '@novu/shared';
import type { Mock } from 'vitest';
import {
  AgentEmailInboxQuotaExceededException,
  AgentEmailInboxQuotaService,
  quotaKeys,
} from './agent-email-inbox-quota.service';

async function expectQuotaRejection(
  service: AgentEmailInboxQuotaService,
  cap: 'daily' | 'monthly',
  code: string
): Promise<void> {
  try {
    await service.reserveCredits('org-1', 1);
    throw new Error('expected the inbox cap to reject');
  } catch (err) {
    expect(err).toBeInstanceOf(AgentEmailInboxQuotaExceededException);
    const quotaError = err as AgentEmailInboxQuotaExceededException;
    expect(quotaError.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(quotaError.getResponse()).toEqual(
      expect.objectContaining({ cap, code, retryAfterSeconds: expect.any(Number) })
    );
  }
}

type CounterStore = Map<string, number>;

function applyReserve(store: CounterStore, keys: string[], args: Array<string | number>): string {
  const count = Number(args[0]);
  const dailyLimit = Number(args[1]);
  const monthlyLimit = Number(args[2]);
  const daily = store.get(keys[0]) ?? 0;
  const monthly = store.get(keys[1]) ?? 0;

  if (daily + count > dailyLimit) {
    return 'daily';
  }

  if (monthly + count > monthlyLimit) {
    return 'monthly';
  }

  store.set(keys[0], daily + count);
  store.set(keys[1], monthly + count);

  return 'ok';
}

function applyRelease(store: CounterStore, keys: string[], args: Array<string | number>): number {
  const count = Number(args[0]);
  for (const key of keys) {
    const current = store.get(key) ?? 0;
    if (current <= count) {
      store.delete(key);
    } else {
      store.set(key, current - count);
    }
  }

  return 1;
}

describe('AgentEmailInboxQuotaService', () => {
  const organizationId = 'org-1';
  let store: CounterStore;
  let cacheEnabled: boolean;
  let evalImpl: Mock;
  let service: AgentEmailInboxQuotaService;
  const logger = { setContext: vi.fn(), warn: vi.fn(), debug: vi.fn() };

  const dailyCount = () => store.get(quotaKeys(organizationId, new Date()).daily);
  const monthlyCount = () => store.get(quotaKeys(organizationId, new Date()).monthly);

  beforeEach(() => {
    store = new Map();
    cacheEnabled = true;
    delete process.env.IS_SELF_HOSTED;
    evalImpl = vi.fn(async (script: string, keys: string[], args: Array<string | number>) => {
      if (script.includes('INCRBY')) {
        return applyReserve(store, keys, args);
      }

      return applyRelease(store, keys, args);
    });
    service = new AgentEmailInboxQuotaService(
      { cacheEnabled: () => cacheEnabled, eval: evalImpl } as never,
      { findById: vi.fn().mockResolvedValue({ apiServiceLevel: ApiServiceLevelEnum.FREE }) } as never,
      logger as never
    );
  });

  it('uses UTC day and month keys that roll over on the 1st', () => {
    const october = quotaKeys(organizationId, new Date('2026-10-31T23:00:00.000Z'));
    const november = quotaKeys(organizationId, new Date('2026-11-01T00:00:00.000Z'));

    expect(october.daily).toBe('agent-email-inbox:{org-1}:day:2026-10-31');
    expect(october.monthly).toBe('agent-email-inbox:{org-1}:month:2026-10');
    expect(november.daily).toBe('agent-email-inbox:{org-1}:day:2026-11-01');
    expect(november.monthly).toBe('agent-email-inbox:{org-1}:month:2026-11');
    expect(october.monthly).not.toBe(november.monthly);
  });

  it('reserves under the cap and rejects the exact daily and monthly boundaries', async () => {
    await service.reserveCredits(organizationId, 50);
    expect(dailyCount()).toBe(50);
    expect(monthlyCount()).toBe(50);

    await expectQuotaRejection(service, 'daily', 'agent_email_inbox_daily_cap');

    store.set(quotaKeys(organizationId, new Date()).daily, 0);
    store.set(quotaKeys(organizationId, new Date()).monthly, 300);
    await expectQuotaRejection(service, 'monthly', 'agent_email_inbox_monthly_cap');
  });

  it('does not let two concurrent reservations oversend the last credit', async () => {
    store.set(quotaKeys(organizationId, new Date()).daily, 49);
    store.set(quotaKeys(organizationId, new Date()).monthly, 49);

    const results = await Promise.allSettled([
      service.reserveCredits(organizationId, 1),
      service.reserveCredits(organizationId, 1),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(dailyCount()).toBe(50);
  });

  it('gives back the credits the sender did not spend', async () => {
    await service.withCredits(organizationId, 2, async () => {
      const attempt = await service.beginSend(organizationId);
      attempt.accept();
    });

    expect(dailyCount()).toBe(1);
  });

  it('gives back every credit when the scope throws before sending', async () => {
    await expect(
      service.withCredits(organizationId, 2, async () => {
        throw new Error('send never happened');
      })
    ).rejects.toThrow('send never happened');

    expect(dailyCount()).toBeUndefined();
  });

  it('counts an unreserved sender call', async () => {
    const attempt = await service.beginSend(organizationId);
    attempt.accept();

    expect(dailyCount()).toBe(1);
  });

  it('consumes a held reservation without counting twice', async () => {
    const credits = await service.reserveCredits(organizationId, 1);
    evalImpl.mockClear();

    await credits.run(async () => {
      const attempt = await service.beginSend(organizationId);
      attempt.accept();
    });
    await credits.release();

    expect(evalImpl).not.toHaveBeenCalled();
    expect(dailyCount()).toBe(1);
  });

  it('fails open when Redis is unavailable', async () => {
    cacheEnabled = false;
    await service.reserveCredits(organizationId, 1);
    expect(evalImpl).not.toHaveBeenCalled();

    cacheEnabled = true;
    evalImpl.mockRejectedValueOnce(new Error('redis down'));
    await service.reserveCredits(organizationId, 1);
    expect(dailyCount()).toBeUndefined();
  });

  it('does not cap self-hosted deployments', async () => {
    process.env.IS_SELF_HOSTED = 'true';
    await service.reserveCredits(organizationId, 50);

    expect(evalImpl).not.toHaveBeenCalled();
  });

  it('passes a TTL past the window on the first increment', async () => {
    await service.reserveCredits(organizationId, 1);
    const args = evalImpl.mock.calls[0][2] as number[];
    const dailyTtl = args[3];
    const monthlyTtl = args[4];

    expect(dailyTtl).toBeGreaterThan(60 * 60);
    expect(monthlyTtl).toBeGreaterThan(24 * 60 * 60);
  });
});
