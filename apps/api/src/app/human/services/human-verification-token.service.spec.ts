import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import {
  HUMAN_VERIFICATION_LINK_TTL_SECONDS,
  HumanVerificationTokenService,
  InactiveHumanVerificationError,
} from './human-verification-token.service';

describe('HumanVerificationTokenService', () => {
  function runClaimScript(cacheStore: Map<string, string>, keys: string[]) {
    const [storageKey, usedKey] = keys;
    const raw = cacheStore.get(storageKey) ?? null;

    if (!raw) {
      return cacheStore.has(usedKey) ? 'U' : '';
    }

    cacheStore.delete(storageKey);
    cacheStore.set(usedKey, raw);

    return `M${raw}`;
  }

  function makeService({ cacheEnabled = true } = {}) {
    const cacheStore = new Map<string, string>();
    const cacheService = {
      cacheEnabled: () => cacheEnabled,
      client: {},
      set: sinon.stub().callsFake(async (key: string, value: string) => {
        cacheStore.set(key, value);

        return 'OK';
      }),
      get: sinon.stub().callsFake(async (key: string) => cacheStore.get(key) ?? null),
      del: sinon.stub().callsFake(async (key: string) => cacheStore.delete(key)),
      eval: sinon.stub().callsFake(async (_script: string, keys: string[]) => runClaimScript(cacheStore, keys)),
    };
    const logger = { setContext: sinon.stub(), warn: sinon.stub(), error: sinon.stub(), debug: sinon.stub() };

    return {
      service: new HumanVerificationTokenService(cacheService as never, logger as never),
      cacheService,
      cacheStore,
    };
  }

  const payload = {
    env: 'env-1',
    org: 'org-1',
    agentId: 'agent-1',
    subscriberId: 'alice',
    via: HumanChannelViaEnum.EMAIL,
    address: 'alice@example.com',
  };

  it('issues a 32-char token that lives for 24 hours', async () => {
    const { service, cacheService } = makeService();

    const { token, expiresAt } = await service.issue(payload);

    expect(token).to.match(/^[A-Za-z0-9]{32}$/);
    expect(Math.abs(Date.parse(expiresAt) - (Date.now() + HUMAN_VERIFICATION_LINK_TTL_SECONDS * 1000))).to.be.below(
      1500
    );
    expect(cacheService.set.firstCall.args[0]).to.equal(`human_verify:{${token}}`);
    expect(cacheService.set.firstCall.args[2]).to.deep.equal({ ttl: HUMAN_VERIFICATION_LINK_TTL_SECONDS });
  });

  it('claims once and then reads as used', async () => {
    const { service } = makeService();
    const { token } = await service.issue(payload);

    const claimed = await service.claim(token);
    expect(claimed.payload).to.deep.equal(payload);

    try {
      await service.claim(token);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(InactiveHumanVerificationError);
      expect((err as InactiveHumanVerificationError).reason).to.equal('used');
    }
  });

  it('maps used claims to ConflictException', async () => {
    const { service } = makeService();
    const { token } = await service.issue(payload);
    await service.claim(token);

    try {
      await service.claim(token);
      expect.fail('should have thrown');
    } catch (err) {
      const { toVerificationHttpError } = await import('./human-verification-token.service');
      const mapped = toVerificationHttpError(err);
      expect(mapped).to.be.instanceOf(ConflictException);
    }
  });

  it('maps missing tokens to UnauthorizedException', async () => {
    const { service } = makeService();

    try {
      await service.claim('abcdefghijklmnopqrstuvwxyzABCDEF');
      expect.fail('should have thrown');
    } catch (err) {
      const { toVerificationHttpError } = await import('./human-verification-token.service');
      const mapped = toVerificationHttpError(err);
      expect(mapped).to.be.instanceOf(UnauthorizedException);
    }
  });
});
