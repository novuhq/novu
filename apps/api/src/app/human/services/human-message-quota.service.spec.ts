import { HttpStatus } from '@nestjs/common';
import { ApiServiceLevelEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import {
  HumanMessageQuotaExceededException,
  HumanMessageQuotaService,
  humanMessageQuotaKeys,
  type UsedUpWindow,
} from './human-message-quota.service';

async function expectQuotaRejection(
  service: HumanMessageQuotaService,
  cap: 'daily' | 'monthly',
  code: string
): Promise<void> {
  try {
    await service.reserveCredits('org-1', 1);
    expect.fail('expected the message cap to reject');
  } catch (err) {
    expect(err).to.be.instanceOf(HumanMessageQuotaExceededException);
    const quotaError = err as HumanMessageQuotaExceededException;
    expect(quotaError.getStatus()).to.equal(HttpStatus.TOO_MANY_REQUESTS);
    const body = quotaError.getResponse() as { cap: string; code: string; message: string };
    expect(body.cap).to.equal(cap);
    expect(body.code).to.equal(code);
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

  if (monthly + count > monthlyLimit) {
    return 'monthly';
  }

  if (daily + count > dailyLimit) {
    return 'daily';
  }

  store.set(keys[0], daily + count);
  store.set(keys[1], monthly + count);

  return 'ok';
}

function applyClaim(store: CounterStore, keys: string[], args: Array<string | number>): string {
  const [daily, monthly, dailyNotice, monthlyNotice] = keys;
  let cap = 'none';
  if ((store.get(monthly) ?? 0) >= Number(args[1])) {
    cap = 'monthly';
  } else if ((store.get(daily) ?? 0) >= Number(args[0])) {
    cap = 'daily';
  }
  const notice = cap === 'monthly' ? monthlyNotice : dailyNotice;
  if (cap === 'none' || store.has(notice)) {
    return 'none';
  }

  store.set(notice, 1);

  return cap;
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

describe('HumanMessageQuotaService', () => {
  const organizationId = 'org-1';
  const originalSelfHosted = process.env.IS_SELF_HOSTED;
  let store: CounterStore;
  let cacheEnabled: boolean;
  let evalStub: sinon.SinonStub;
  let setStub: sinon.SinonStub;
  let service: HumanMessageQuotaService;

  const dailyCount = () => store.get(humanMessageQuotaKeys(organizationId, new Date()).daily);
  const monthlyCount = () => store.get(humanMessageQuotaKeys(organizationId, new Date()).monthly);

  beforeEach(() => {
    store = new Map();
    cacheEnabled = true;
    delete process.env.IS_SELF_HOSTED;
    evalStub = sinon.stub().callsFake(async (script: string, keys: string[], args: Array<string | number>) => {
      if (script.includes('INCRBY')) {
        return applyReserve(store, keys, args);
      }

      if (script.includes("'NX'")) {
        return applyClaim(store, keys, args);
      }

      return applyRelease(store, keys, args);
    });
    const mget = async (keys: string[]) => keys.map((key) => (store.has(key) ? String(store.get(key)) : null));
    setStub = sinon.stub().callsFake(async (key: string, value: number) => {
      store.set(key, value);

      return 'OK';
    });
    service = new HumanMessageQuotaService(
      { cacheEnabled: () => cacheEnabled, eval: evalStub, mget, set: setStub } as never,
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

  it('reserves under the cap and rejects the exact daily and monthly boundaries', async () => {
    const credits = await service.reserveCredits(organizationId, 49);
    credits.accept(49);
    await credits.release();
    expect(dailyCount()).to.equal(49);
    expect(monthlyCount()).to.equal(49);

    const last = await service.reserveCredits(organizationId, 1);
    last.accept();
    await last.release();
    expect(dailyCount()).to.equal(50);

    await expectQuotaRejection(service, 'daily', 'human_message_daily_cap');

    store.set(humanMessageQuotaKeys(organizationId, new Date()).daily, 0);
    store.set(humanMessageQuotaKeys(organizationId, new Date()).monthly, 300);
    await expectQuotaRejection(service, 'monthly', 'human_message_monthly_cap');
  });

  it('names the month when the day and the month are used up at once, as the later reset', async () => {
    store.set(humanMessageQuotaKeys(organizationId, new Date()).daily, 50);
    store.set(humanMessageQuotaKeys(organizationId, new Date()).monthly, 300);

    await expectQuotaRejection(service, 'monthly', 'human_message_monthly_cap');
  });

  it('gives back the credits the sender did not spend', async () => {
    const credits = await service.reserveCredits(organizationId, 2);
    credits.accept();
    await credits.release();

    expect(dailyCount()).to.equal(1);
    expect(monthlyCount()).to.equal(1);
  });

  it('gives every credit back when delivery does not happen', async () => {
    const credits = await service.reserveCredits(organizationId, 2);
    await credits.release();

    expect(dailyCount()).to.equal(undefined);
    expect(monthlyCount()).to.equal(undefined);
  });

  it('does not cap self-hosted deployments', async () => {
    process.env.IS_SELF_HOSTED = 'true';
    const credits = await service.reserveCredits(organizationId, 50);
    credits.accept(50);
    await credits.release();

    expect(evalStub.called).to.equal(false);
  });

  describe('the notice that the limit was reached', () => {
    it('is claimed once, when the last credit of the day is spent', async () => {
      store.set(humanMessageQuotaKeys(organizationId, new Date()).daily, 50);

      expect(await service.claimLimitNotice(organizationId)).to.include({ cap: 'daily', limit: 50 });
      expect(await service.claimLimitNotice(organizationId)).to.equal(null);
    });

    it('is not claimed while credits remain, when a send to several people needed more of them', async () => {
      store.set(humanMessageQuotaKeys(organizationId, new Date()).daily, 48);

      expect(await service.claimLimitNotice(organizationId)).to.equal(null);
    });

    it('names the month once it is used up too, and only once', async () => {
      const keys = humanMessageQuotaKeys(organizationId, new Date());
      store.set(keys.daily, 50);
      store.set(keys.monthly, 300);

      const usedUp = await service.claimLimitNotice(organizationId);

      expect(usedUp).to.include({ cap: 'monthly', limit: 300 });
      expect(Date.parse(usedUp?.resetsAt ?? '')).to.be.greaterThan(Date.now());
      expect(await service.claimLimitNotice(organizationId)).to.equal(null);
    });

    it('names the day when only the day ran out, also for a send refused over the month', async () => {
      const keys = humanMessageQuotaKeys(organizationId, new Date());
      store.set(keys.daily, 50);
      store.set(keys.monthly, 299);

      const refused = await service.reserveCredits(organizationId, 2).catch((err: unknown) => err);
      expect(refused).to.be.instanceOf(HumanMessageQuotaExceededException);
      expect((refused as HumanMessageQuotaExceededException).cap).to.equal('monthly');
      expect(await service.claimLimitNotice(organizationId)).to.include({ cap: 'daily', limit: 50 });
    });

    it('is tried again after a few minutes, not the rest of the window, when it did not reach the operator', async () => {
      const keys = humanMessageQuotaKeys(organizationId, new Date());
      store.set(keys.daily, 50);
      const usedUp = await service.claimLimitNotice(organizationId);
      expect(usedUp).to.include({ cap: 'daily' });

      await service.retryLimitNoticeLater(organizationId, usedUp as UsedUpWindow);

      expect(setStub.firstCall.args).to.deep.equal([`${keys.daily}:notice`, 1, { ttl: 5 * 60, jitter: false }]);
      expect(await service.claimLimitNotice(organizationId)).to.equal(null);
    });
  });

  it('reads how much of today and this month the account used', async () => {
    const credits = await service.reserveCredits(organizationId, 3);
    credits.accept(3);
    await credits.release();

    const usage = await service.usage(organizationId);

    expect(usage?.daily).to.include({ used: 3, limit: 50 });
    expect(usage?.monthly).to.include({ used: 3, limit: 300 });
    expect(Date.parse(usage?.daily.resetsAt ?? '')).to.be.greaterThan(Date.now());
    expect(Date.parse(usage?.monthly.resetsAt ?? '')).to.be.at.least(Date.parse(usage?.daily.resetsAt ?? ''));
  });

  it('reads no usage where nothing is counted', async () => {
    process.env.IS_SELF_HOSTED = 'true';
    expect(await service.usage(organizationId)).to.equal(null);

    delete process.env.IS_SELF_HOSTED;
    cacheEnabled = false;
    expect(await service.usage(organizationId)).to.equal(null);
  });
});
