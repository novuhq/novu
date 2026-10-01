import { HttpException, HttpStatus } from '@nestjs/common';
import { HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import {
  HUMAN_VERIFICATION_COOLDOWN_SECONDS,
  HUMAN_VERIFICATION_DAILY_CAP,
  HumanVerificationRateLimitService,
} from './human-verification-rate-limit.service';

describe('HumanVerificationRateLimitService', () => {
  function makeService() {
    const cacheStore = new Map<string, string>();
    const cacheService = {
      get: sinon.stub().callsFake(async (key: string) => cacheStore.get(key) ?? null),
      set: sinon.stub().callsFake(async (key: string, value: string) => {
        cacheStore.set(key, String(value));

        return 'OK';
      }),
      incr: sinon.stub().callsFake(async (key: string) => {
        const next = String(Number(cacheStore.get(key) ?? '0') + 1);
        cacheStore.set(key, next);

        return Number(next);
      }),
    };
    const logger = { setContext: sinon.stub() };

    return {
      service: new HumanVerificationRateLimitService(cacheService as never, logger as never),
      cacheStore,
      cacheService,
    };
  }

  const params = {
    environmentId: 'env-1',
    agentId: 'agent-1',
    subscriberId: 'alice',
    via: HumanChannelViaEnum.EMAIL,
  };

  it('arms the cooldown and increments the daily counter on success', async () => {
    const { service, cacheService } = makeService();

    const result = await service.assertAndRecord(params);

    expect(result.retryAfterSeconds).to.equal(HUMAN_VERIFICATION_COOLDOWN_SECONDS);
    expect(cacheService.set.calledTwice).to.equal(true);
  });

  it('rejects within the cooldown window', async () => {
    const { service } = makeService();
    await service.assertAndRecord(params);

    try {
      await service.assertAndRecord(params);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(HttpException);
      expect((err as HttpException).getStatus()).to.equal(HttpStatus.TOO_MANY_REQUESTS);
      expect((err as HttpException).getResponse()).to.deep.include({
        code: 'verification_cooldown',
      });
    }
  });

  it('rejects after the daily cap', async () => {
    const { service, cacheStore } = makeService();
    const dailyKey = `human_verify_daily:{${params.environmentId}:${params.agentId}:${params.subscriberId}:${params.via}}`;
    cacheStore.set(dailyKey, String(HUMAN_VERIFICATION_DAILY_CAP));

    try {
      await service.assertAndRecord(params);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(HttpException);
      expect((err as HttpException).getStatus()).to.equal(HttpStatus.TOO_MANY_REQUESTS);
      expect((err as HttpException).getResponse()).to.deep.include({
        code: 'verification_cap',
      });
    }
  });
});
