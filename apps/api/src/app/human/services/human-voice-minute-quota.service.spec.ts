import { HttpStatus } from '@nestjs/common';
import { ApiServiceLevelEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import {
  HumanVoiceMinuteQuotaExceededException,
  HumanVoiceMinuteQuotaService,
  humanVoiceMinuteQuotaKeys,
} from './human-voice-minute-quota.service';

async function expectQuotaRejection(
  service: HumanVoiceMinuteQuotaService,
  cap: 'daily' | 'monthly',
  code: string
): Promise<void> {
  try {
    await service.reserveMinutes('org-1', 1);
    expect.fail('expected the minute cap to reject');
  } catch (err) {
    expect(err).to.be.instanceOf(HumanVoiceMinuteQuotaExceededException);
    const quotaError = err as HumanVoiceMinuteQuotaExceededException;
    expect(quotaError.getStatus()).to.equal(HttpStatus.TOO_MANY_REQUESTS);
    const body = quotaError.getResponse() as {
      cap: string;
      code: string;
      message: string;
      resetsAt: string;
      retryAfterSeconds: number;
    };
    expect(body.cap).to.equal(cap);
    expect(body.code).to.equal(code);
    expect(body.resetsAt).to.be.a('string');
    expect(body.retryAfterSeconds).to.be.a('number');
    expect(body.message).to.include('Resets at');
    expect(body.message.toLowerCase()).to.not.include('upgrade');
    expect(body.message.toLowerCase()).to.not.include('plan');
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

describe('HumanVoiceMinuteQuotaService', () => {
  const organizationId = 'org-1';
  const originalSelfHosted = process.env.IS_SELF_HOSTED;
  let store: CounterStore;
  let cacheEnabled: boolean;
  let evalStub: sinon.SinonStub;
  let service: HumanVoiceMinuteQuotaService;

  const dailyCount = () => store.get(humanVoiceMinuteQuotaKeys(organizationId, new Date()).daily);
  const monthlyCount = () => store.get(humanVoiceMinuteQuotaKeys(organizationId, new Date()).monthly);

  beforeEach(() => {
    store = new Map();
    cacheEnabled = true;
    delete process.env.IS_SELF_HOSTED;
    evalStub = sinon.stub().callsFake(async (script: string, keys: string[], args: Array<string | number>) => {
      if (script.includes('INCRBY')) {
        return applyReserve(store, keys, args);
      }

      return applyRelease(store, keys, args);
    });
    service = new HumanVoiceMinuteQuotaService(
      { cacheEnabled: () => cacheEnabled, eval: evalStub } as never,
      { findById: sinon.stub().resolves({ apiServiceLevel: ApiServiceLevelEnum.FREE }) } as never,
      { setContext: sinon.stub(), warn: sinon.stub() } as never
    );
  });

  afterEach(() => {
    if (originalSelfHosted === undefined) {
      delete process.env.IS_SELF_HOSTED;
    } else {
      process.env.IS_SELF_HOSTED = originalSelfHosted;
    }
  });

  it('reserves under the cap and rejects the next minute with resetsAt', async () => {
    const credits = await service.reserveMinutes(organizationId, 5);
    credits.accept(5);
    await credits.release();
    expect(dailyCount()).to.equal(5);
    expect(monthlyCount()).to.equal(5);

    await expectQuotaRejection(service, 'daily', 'voice_minutes_daily_cap');

    store.set(humanVoiceMinuteQuotaKeys(organizationId, new Date()).daily, 0);
    store.set(humanVoiceMinuteQuotaKeys(organizationId, new Date()).monthly, 15);
    await expectQuotaRejection(service, 'monthly', 'voice_minutes_monthly_cap');
  });

  it('gives back the minutes the sender did not keep', async () => {
    const credits = await service.reserveMinutes(organizationId, 5);
    credits.accept(2);
    await credits.release();

    expect(dailyCount()).to.equal(2);
    expect(monthlyCount()).to.equal(2);
  });

  it('gives every minute back when the send does not stay pending', async () => {
    const credits = await service.reserveMinutes(organizationId, 5);
    await credits.release();

    expect(dailyCount()).to.equal(undefined);
    expect(monthlyCount()).to.equal(undefined);
  });

  it('returns a later settlement to the day the minutes were reserved', async () => {
    const reservedAt = new Date('2026-01-15T12:00:00.000Z');
    const keys = humanVoiceMinuteQuotaKeys(organizationId, reservedAt);
    store.set(keys.daily, 10);
    store.set(keys.monthly, 10);

    await service.releaseReserved(organizationId, 10, reservedAt);

    expect(store.get(keys.daily)).to.equal(undefined);
    expect(store.get(keys.monthly)).to.equal(undefined);
    expect(dailyCount()).to.equal(undefined);
  });

  it('does not cap self-hosted deployments', async () => {
    process.env.IS_SELF_HOSTED = 'true';
    const credits = await service.reserveMinutes(organizationId, 30);
    credits.accept(30);
    await credits.release();

    expect(credits.unlimited).to.equal(true);
    expect(evalStub.called).to.equal(false);
  });

  it('fails open when Redis is down', async () => {
    evalStub.rejects(new Error('redis down'));

    const credits = await service.reserveMinutes(organizationId, 10);
    credits.accept(10);
    await credits.release();

    expect(credits.unlimited).to.equal(true);
  });
});
