import { expect } from 'chai';
import sinon from 'sinon';

import {
  InvalidTelegramMobileTokenError,
  TELEGRAM_MOBILE_LINK_TTL_SECONDS,
  TelegramMobileLinkCacheUnavailableError,
  TelegramMobileLinkTokenService,
} from './telegram-mobile-link-token.service';

describe('TelegramMobileLinkTokenService', () => {
  function runClaimScript(
    cacheStore: Map<string, string>,
    keyTtls: Map<string, number>,
    keys: string[],
    args: (string | number | Buffer)[]
  ) {
    const storageKey = keys[0];
    const usedKey = keys[1];
    const now = Number(args[0]);
    const expectedKind = args[1] as string | undefined;
    const raw = cacheStore.get(storageKey) ?? null;

    if (!raw) {
      if (cacheStore.has(usedKey)) {
        return 'U';
      }

      return '';
    }

    cacheStore.delete(storageKey);

    let parsed: { expiresAt?: number; payload?: { kind?: string } };
    try {
      parsed = JSON.parse(raw) as { expiresAt?: number; payload?: { kind?: string } };
    } catch {
      return 'I';
    }

    if (!parsed.expiresAt || !parsed.payload?.kind) {
      return 'I';
    }

    if (expectedKind && parsed.payload.kind !== expectedKind) {
      const ttl = Math.max(1, parsed.expiresAt - now);
      cacheStore.set(storageKey, raw);
      keyTtls.set(storageKey, ttl);

      return 'K';
    }

    const ttl = Math.max(1, parsed.expiresAt - now);
    cacheStore.set(usedKey, '1');
    keyTtls.set(usedKey, ttl);

    return `M${raw}`;
  }

  function runReleaseScript(
    cacheStore: Map<string, string>,
    keyTtls: Map<string, number>,
    keys: string[],
    args: (string | number | Buffer)[]
  ) {
    const storageKey = keys[0];
    const usedKey = keys[1];
    const value = String(args[0]);
    const ttl = Number(args[1]);

    cacheStore.set(storageKey, value);
    keyTtls.set(storageKey, ttl);
    cacheStore.delete(usedKey);
    keyTtls.delete(usedKey);
  }

  function makeService() {
    const cacheStore = new Map<string, string>();
    const keyTtls = new Map<string, number>();
    const cacheService = {
      cacheEnabled: () => true,
      client: {},
      set: sinon.stub().callsFake(async (key: string, value: string, options?: { ttl?: number }) => {
        cacheStore.set(key, value);
        if (options?.ttl != null) {
          keyTtls.set(key, options.ttl);
        } else {
          keyTtls.delete(key);
        }

        return 'OK';
      }),
      get: sinon.stub().callsFake(async (key: string) => cacheStore.get(key) ?? null),
      del: sinon.stub().callsFake(async (key: string) => {
        cacheStore.delete(key);
        keyTtls.delete(key);
      }),
      eval: sinon.stub().callsFake(async (script: string, keys: string[], args: (string | number | Buffer)[]) => {
        if (script.includes("redis.call('DEL', KEYS[2])")) {
          runReleaseScript(cacheStore, keyTtls, keys, args);

          return null;
        }

        return runClaimScript(cacheStore, keyTtls, keys, args);
      }),
    };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
    };

    const service = new TelegramMobileLinkTokenService(cacheService as any, logger as any);

    return { service, cacheService, cacheStore, keyTtls };
  }

  it('issues a 32-char autolink-safe alphanumeric token and stores the payload in Redis', async () => {
    const { service, cacheService } = makeService();

    const { token, expiresAt } = await service.issue({
      environmentId: 'env-1',
      organizationId: 'org-1',
      agentIdentifier: 'agent-1',
      integrationId: 'int-1',
      subscriberId: 'sub-1',
    });

    expect(token).to.have.length(32);
    expect(token).to.match(/^[A-Za-z0-9]{32}$/);
    expect(token).to.not.match(/[-_]/);

    const expiresAtMs = Date.parse(expiresAt);
    const expectedExpiresAtMs = Date.now() + TELEGRAM_MOBILE_LINK_TTL_SECONDS * 1000;
    expect(Math.abs(expiresAtMs - expectedExpiresAtMs)).to.be.below(1500);

    expect(cacheService.set.calledOnce).to.equal(true);
    const setArgs = cacheService.set.firstCall.args;
    expect(setArgs[0]).to.equal(`telegram_mobile_link:{${token}}`);
    const parsed = JSON.parse(setArgs[1] as string);
    expect(parsed.payload.kind).to.equal('agent');
    expect(parsed.payload.env).to.equal('env-1');
    expect(parsed.payload.sid).to.equal('sub-1');
    expect(setArgs[2]).to.deep.equal({ ttl: TELEGRAM_MOBILE_LINK_TTL_SECONDS });
  });

  it('peek verifies without consuming', async () => {
    const { service } = makeService();
    const { token } = await service.issue({
      environmentId: 'env-1',
      organizationId: 'org-1',
      agentIdentifier: 'agent-1',
      integrationId: 'int-1',
    });

    const payload = await service.verify(token);
    expect(payload.kind).to.equal('agent');
    expect(payload.aid).to.equal('agent-1');

    const payloadAgain = await service.verify(token);
    expect(payloadAgain.aid).to.equal('agent-1');
  });

  it('claim is single-use and marks the token as used with remaining TTL', async () => {
    const { service, cacheStore, keyTtls } = makeService();
    const { token } = await service.issue({
      environmentId: 'env-1',
      organizationId: 'org-1',
      agentIdentifier: 'agent-1',
      integrationId: 'int-1',
    });

    const claimed = await service.claim(token, 'agent');
    expect(claimed.payload.kind).to.equal('agent');

    const usedKey = `telegram_mobile_link_used:{${token}}`;
    expect(cacheStore.get(usedKey)).to.equal('1');
    const usedTtl = keyTtls.get(usedKey);
    expect(usedTtl).to.be.a('number');
    const remaining = claimed.expiresAt - Math.floor(Date.now() / 1000);
    const expectedTtl = Math.max(1, remaining);
    expect(usedTtl!).to.be.within(expectedTtl, expectedTtl + 1);

    try {
      await service.claim(token, 'agent');
      expect.fail('expected second claim to fail');
    } catch (err) {
      expect(err).to.be.instanceOf(InvalidTelegramMobileTokenError);
      expect((err as InvalidTelegramMobileTokenError).reason).to.equal('used');
    }

    try {
      await service.verify(token);
      expect.fail('expected verify after claim to fail');
    } catch (err) {
      expect((err as InvalidTelegramMobileTokenError).reason).to.equal('used');
    }
  });

  it('release restores a claimed token for retry via atomic script', async () => {
    const { service, cacheService } = makeService();
    const { token } = await service.issue({
      environmentId: 'env-1',
      organizationId: 'org-1',
      agentIdentifier: 'agent-1',
      integrationId: 'int-1',
    });

    const claimed = await service.claim(token, 'agent');
    await service.release(token, claimed);

    expect(cacheService.eval.callCount).to.be.at.least(2);
    const payload = await service.verify(token);
    expect(payload.iid).to.equal('int-1');
  });

  it('release is a no-op when the natural expiry has passed', async () => {
    const { service, cacheService } = makeService();
    const { token } = await service.issue({
      environmentId: 'env-1',
      organizationId: 'org-1',
      agentIdentifier: 'agent-1',
      integrationId: 'int-1',
    });

    const claimed = await service.claim(token, 'agent');
    const expiredClaim = { ...claimed, expiresAt: Math.floor(Date.now() / 1000) - 1 };
    const setCallsBefore = cacheService.set.callCount;

    await service.release(token, expiredClaim);

    expect(cacheService.set.callCount).to.equal(setCallsBefore);
  });

  it('rejects tokens with unexpected kind on peek', async () => {
    const { service } = makeService();
    const { token } = await service.issueForIntegrationStore({
      environmentId: 'env-1',
      organizationId: 'org-1',
    });

    try {
      await service.verify(token);
      expect.fail('expected agent verify to reject integration-store token');
    } catch (err) {
      expect((err as InvalidTelegramMobileTokenError).reason).to.equal('invalid');
    }
  });

  it('claim with wrong kind does not burn the token', async () => {
    const { service } = makeService();
    const { token } = await service.issueForIntegrationStore({
      environmentId: 'env-1',
      organizationId: 'org-1',
    });

    try {
      await service.claim(token, 'agent');
      expect.fail('expected agent claim to reject integration-store token');
    } catch (err) {
      expect((err as InvalidTelegramMobileTokenError).reason).to.equal('invalid');
    }

    const payload = await service.verifyIntegrationStore(token);
    expect(payload.kind).to.equal('integration-store');
  });

  it('surfaces cache failures from isTokenUsed', async () => {
    const { service, cacheService } = makeService();
    cacheService.get.rejects(new Error('redis down'));

    try {
      await service.isTokenUsed('abcdefghijklmnopqrstuvwxyz123456');
      expect.fail('expected cache failure');
    } catch (err) {
      expect(err).to.be.instanceOf(TelegramMobileLinkCacheUnavailableError);
    }
  });
});
