import { expect } from 'chai';
import sinon from 'sinon';

import {
  InvalidWhatsAppSignupLinkTokenError,
  WHATSAPP_SIGNUP_LINK_TTL_SECONDS,
  WhatsAppSignupLinkCacheUnavailableError,
  WhatsAppSignupLinkTokenService,
} from './whatsapp-signup-link-token.service';

describe('WhatsAppSignupLinkTokenService', () => {
  function runClaimScript(
    cacheStore: Map<string, string>,
    keyTtls: Map<string, number>,
    keys: string[],
    args: (string | number | Buffer)[]
  ) {
    const storageKey = keys[0];
    const usedKey = keys[1];
    const now = Number(args[0]);
    const raw = cacheStore.get(storageKey) ?? null;

    if (!raw) {
      if (cacheStore.has(usedKey)) {
        return 'U';
      }

      return '';
    }

    cacheStore.delete(storageKey);

    let parsed: { expiresAt?: number; payload?: unknown };
    try {
      parsed = JSON.parse(raw) as { expiresAt?: number; payload?: unknown };
    } catch {
      return 'I';
    }

    if (!parsed.expiresAt || !parsed.payload) {
      return 'I';
    }

    const ttl = Math.max(1, parsed.expiresAt - now);
    cacheStore.set(usedKey, raw);
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

    const service = new WhatsAppSignupLinkTokenService(cacheService as any, logger as any);

    return { service, cacheService, cacheStore, keyTtls };
  }

  const issueParams = {
    environmentId: 'env-1',
    organizationId: 'org-1',
    agentIdentifier: 'agent-1',
    integrationIdentifier: 'whatsapp-main',
  };

  it('issues a 32-char autolink-safe alphanumeric token with the 30-minute TTL', async () => {
    const { service, cacheService } = makeService();

    const { token, expiresAt } = await service.issue(issueParams);

    expect(token).to.have.length(32);
    expect(token).to.match(/^[A-Za-z0-9]{32}$/);

    const expiresAtMs = Date.parse(expiresAt);
    const expectedExpiresAtMs = Date.now() + WHATSAPP_SIGNUP_LINK_TTL_SECONDS * 1000;
    expect(Math.abs(expiresAtMs - expectedExpiresAtMs)).to.be.below(1500);

    expect(cacheService.set.calledOnce).to.equal(true);
    const setArgs = cacheService.set.firstCall.args;
    expect(setArgs[0]).to.equal(`whatsapp_signup_link:{${token}}`);
    const parsed = JSON.parse(setArgs[1] as string);
    expect(parsed.payload).to.deep.equal({ env: 'env-1', org: 'org-1', aid: 'agent-1', iid: 'whatsapp-main' });
    expect(setArgs[2]).to.deep.equal({ ttl: WHATSAPP_SIGNUP_LINK_TTL_SECONDS });
  });

  it('peek returns the payload without consuming the token', async () => {
    const { service } = makeService();
    const { token } = await service.issue(issueParams);

    const first = await service.peek(token);
    expect(first.used).to.equal(false);
    expect(first.payload.aid).to.equal('agent-1');

    const second = await service.peek(token);
    expect(second.used).to.equal(false);
    expect(second.payload.iid).to.equal('whatsapp-main');
  });

  it('claim is single-use, and peek still resolves the payload afterwards (used: true)', async () => {
    const { service, cacheStore, keyTtls } = makeService();
    const { token } = await service.issue(issueParams);

    const claimed = await service.claim(token);
    expect(claimed.payload.env).to.equal('env-1');

    // The used marker keeps the whole entry so status polling survives completion.
    const usedKey = `whatsapp_signup_link_used:{${token}}`;
    const usedEntry = JSON.parse(cacheStore.get(usedKey) as string);
    expect(usedEntry.payload.iid).to.equal('whatsapp-main');
    expect(keyTtls.get(usedKey)).to.be.a('number');

    try {
      await service.claim(token);
      expect.fail('expected second claim to fail');
    } catch (err) {
      expect(err).to.be.instanceOf(InvalidWhatsAppSignupLinkTokenError);
      expect((err as InvalidWhatsAppSignupLinkTokenError).reason).to.equal('used');
    }

    const peeked = await service.peek(token);
    expect(peeked.used).to.equal(true);
    expect(peeked.payload.aid).to.equal('agent-1');
  });

  it('release restores a claimed token for retry', async () => {
    const { service } = makeService();
    const { token } = await service.issue(issueParams);

    const claimed = await service.claim(token);
    await service.release(token, claimed);

    const peeked = await service.peek(token);
    expect(peeked.used).to.equal(false);

    const reclaimed = await service.claim(token);
    expect(reclaimed.payload.iid).to.equal('whatsapp-main');
  });

  it('release is a no-op when the natural expiry has passed', async () => {
    const { service, cacheService } = makeService();
    const { token } = await service.issue(issueParams);

    const claimed = await service.claim(token);
    const expiredClaim = { ...claimed, expiresAt: Math.floor(Date.now() / 1000) - 1 };
    const evalCallsBefore = cacheService.eval.callCount;

    await service.release(token, expiredClaim);

    expect(cacheService.eval.callCount).to.equal(evalCallsBefore);
  });

  it('peek rejects malformed tokens as invalid and unknown tokens as expired', async () => {
    const { service } = makeService();

    try {
      await service.peek('not-a-valid-token');
      expect.fail('expected malformed token to be invalid');
    } catch (err) {
      expect((err as InvalidWhatsAppSignupLinkTokenError).reason).to.equal('invalid');
    }

    try {
      await service.peek('a'.repeat(32));
      expect.fail('expected unknown token to be expired');
    } catch (err) {
      expect((err as InvalidWhatsAppSignupLinkTokenError).reason).to.equal('expired');
    }
  });

  it('surfaces cache failures from peek', async () => {
    const { service, cacheService } = makeService();
    cacheService.get.rejects(new Error('redis down'));

    try {
      await service.peek('a'.repeat(32));
      expect.fail('expected cache failure');
    } catch (err) {
      expect(err).to.be.instanceOf(WhatsAppSignupLinkCacheUnavailableError);
    }
  });
});
