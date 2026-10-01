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
  function makeService(options?: { staleCooldownRead?: boolean }) {
    const cacheStore = new Map<string, string>();
    const cacheService = {
      get: sinon.stub().callsFake(async (key: string) => {
        if (options?.staleCooldownRead && key.includes('human_verify_cooldown:')) {
          return null;
        }

        return cacheStore.get(key) ?? null;
      }),
      set: sinon.stub().callsFake(async (key: string, value: string) => {
        cacheStore.set(key, String(value));

        return 'OK';
      }),
      setIfNotExist: sinon.stub().callsFake(async (key: string, value: string) => {
        if (cacheStore.has(key)) {
          return null;
        }

        cacheStore.set(key, String(value));

        return 'OK';
      }),
      incr: sinon.stub().callsFake(async (key: string) => {
        const next = String(Number(cacheStore.get(key) ?? '0') + 1);
        cacheStore.set(key, next);

        return Number(next);
      }),
      incrIfExistsAtomic: sinon.stub().callsFake(async (key: string, incrementBy = 1) => {
        if (!cacheStore.has(key)) {
          return null;
        }

        const next = String(Number(cacheStore.get(key) ?? '0') + incrementBy);
        cacheStore.set(key, next);

        return Number(next);
      }),
      del: sinon.stub().callsFake(async (key: string) => {
        const existed = cacheStore.delete(key);

        return existed ? 1 : 0;
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
    expect(cacheService.setIfNotExist.calledOnce).to.equal(true);
    expect(cacheService.set.calledOnce).to.equal(true);
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

  it('rejects a second reservation when the cooldown read is stale', async () => {
    const { service, cacheService } = makeService({ staleCooldownRead: true });
    await service.assertAndRecord(params);

    try {
      await service.assertAndRecord(params);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(HttpException);
      expect((err as HttpException).getResponse()).to.deep.include({
        code: 'verification_cooldown',
      });
    }

    expect(cacheService.setIfNotExist.callCount).to.equal(2);
  });

  it('rejects after the daily cap without keeping the cooldown', async () => {
    const { service, cacheStore, cacheService } = makeService();
    const dailyKey = `human_verify_daily:{${params.environmentId}:${params.agentId}:${params.subscriberId}:${params.via}}`;
    const cooldownKey = `human_verify_cooldown:{${params.environmentId}:${params.agentId}:${params.subscriberId}:${params.via}}`;
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

    expect(cacheStore.has(cooldownKey)).to.equal(false);
    expect(cacheService.set.called).to.equal(false);
  });

  it('returns the cooldown and daily allowance when the send is abandoned', async () => {
    const { service, cacheStore } = makeService();
    const dailyKey = `human_verify_daily:{${params.environmentId}:${params.agentId}:${params.subscriberId}:${params.via}}`;
    const cooldownKey = `human_verify_cooldown:{${params.environmentId}:${params.agentId}:${params.subscriberId}:${params.via}}`;

    await service.assertAndRecord(params);
    await service.release(params);

    expect(cacheStore.has(cooldownKey)).to.equal(false);
    expect(cacheStore.has(dailyKey)).to.equal(false);

    const again = await service.assertAndRecord(params);
    expect(again.retryAfterSeconds).to.equal(HUMAN_VERIFICATION_COOLDOWN_SECONDS);
  });
});
