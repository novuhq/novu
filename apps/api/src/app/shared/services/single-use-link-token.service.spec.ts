import { expect } from 'chai';
import sinon from 'sinon';

import { SingleUseTokenCache } from './single-use-link-token.service';

class TestCacheUnavailableError extends Error {
  constructor(
    public readonly operation: string,
    public readonly cause?: unknown
  ) {
    super(`test cache unavailable during ${operation}`);
  }
}

interface TestPayload {
  env: string;
  org: string;
  kind?: string;
}

describe('SingleUseTokenCache', () => {
  function runClaimScript(
    cacheStore: Map<string, string>,
    keyTtls: Map<string, number>,
    keys: string[],
    args: (string | number | Buffer)[]
  ) {
    const storageKey = keys[0];
    const usedKey = keys[1];
    const now = Number(args[0]);
    const expectedKind = String(args[1] ?? '');
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

    if (!parsed.expiresAt || !parsed.payload) {
      return 'I';
    }

    if (expectedKind !== '') {
      if (!parsed.payload.kind) {
        return 'I';
      }

      if (parsed.payload.kind !== expectedKind) {
        const restoreTtl = Math.max(1, parsed.expiresAt - now);
        cacheStore.set(storageKey, raw);
        keyTtls.set(storageKey, restoreTtl);

        return 'K';
      }
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

  function runExtendScript(
    cacheStore: Map<string, string>,
    keyTtls: Map<string, number>,
    keys: string[],
    args: (string | number | Buffer)[]
  ) {
    const storageKey = keys[0];
    const now = Number(args[0]);
    const ttl = Number(args[1]);
    const maxLifetime = Number(args[2]);
    const baseTtl = Number(args[3]);
    const expectedKind = String(args[4] ?? '');
    const raw = cacheStore.get(storageKey) ?? null;

    if (!raw) {
      return '';
    }

    let parsed: { expiresAt?: number; mintedAt?: number; payload?: { kind?: string } };
    try {
      parsed = JSON.parse(raw) as { expiresAt?: number; mintedAt?: number; payload?: { kind?: string } };
    } catch {
      return 'I';
    }

    if (!parsed.expiresAt || !parsed.payload) {
      return 'I';
    }

    if (expectedKind !== '' && parsed.payload.kind !== expectedKind) {
      return 'K';
    }

    const mintedAt = typeof parsed.mintedAt === 'number' ? parsed.mintedAt : parsed.expiresAt - baseTtl;
    const target = Math.min(now + ttl, mintedAt + maxLifetime);
    if (target <= parsed.expiresAt) {
      return `S${raw}`;
    }

    parsed.expiresAt = target;
    parsed.mintedAt = mintedAt;
    const encoded = JSON.stringify(parsed);
    cacheStore.set(storageKey, encoded);
    keyTtls.set(storageKey, target - now);

    return `M${encoded}`;
  }

  const TTL_SECONDS = 10 * 60;

  function makeCache() {
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

        if (script.includes('parsed.mintedAt')) {
          return runExtendScript(cacheStore, keyTtls, keys, args);
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

    const cache = new SingleUseTokenCache<TestPayload>({
      cacheService: cacheService as any,
      logger: logger as any,
      scope: 'test link',
      keyPrefix: 'test_link:',
      usedKeyPrefix: 'test_link_used:',
      ttlSeconds: TTL_SECONDS,
      isValidTokenFormat: (token) => /^[A-Za-z0-9]{32}$/.test(token),
      createCacheUnavailableError: (operation, cause) => new TestCacheUnavailableError(operation, cause),
    });

    return { cache, cacheService, cacheStore, keyTtls };
  }

  const payload: TestPayload = { env: 'env-1', org: 'org-1' };

  it('issues a 32-char autolink-safe token and stores the entry with the configured TTL', async () => {
    const { cache, cacheService } = makeCache();

    const { token, expiresAt } = await cache.issue(payload);

    expect(token).to.have.length(32);
    expect(token).to.match(/^[A-Za-z0-9]{32}$/);

    const expiresAtMs = Date.parse(expiresAt);
    const expectedExpiresAtMs = Date.now() + TTL_SECONDS * 1000;
    expect(Math.abs(expiresAtMs - expectedExpiresAtMs)).to.be.below(1500);

    expect(cacheService.set.calledOnce).to.equal(true);
    const setArgs = cacheService.set.firstCall.args;
    expect(setArgs[0]).to.equal(`test_link:{${token}}`);
    const parsed = JSON.parse(setArgs[1] as string);
    expect(parsed.payload).to.deep.equal(payload);
    expect(setArgs[2]).to.deep.equal({ ttl: TTL_SECONDS });
  });

  it('peek returns the entry without consuming the token', async () => {
    const { cache } = makeCache();
    const { token } = await cache.issue(payload);

    const first = await cache.peek(token);
    expect(first.status).to.equal('active');

    const second = await cache.peek(token);
    expect(second).to.deep.include({ status: 'active' });
    if (second.status === 'active') {
      expect(second.entry.payload).to.deep.equal(payload);
    }
  });

  it('claim is single-use and the used-marker keeps the full entry for later peeks', async () => {
    const { cache, cacheStore, keyTtls } = makeCache();
    const { token } = await cache.issue(payload);

    const claimed = await cache.claim(token);
    expect(claimed.status).to.equal('claimed');
    if (claimed.status === 'claimed') {
      expect(claimed.entry.payload).to.deep.equal(payload);
    }

    const usedKey = `test_link_used:{${token}}`;
    const usedEntry = JSON.parse(cacheStore.get(usedKey) as string);
    expect(usedEntry.payload).to.deep.equal(payload);
    expect(keyTtls.get(usedKey)).to.be.a('number');

    const second = await cache.claim(token);
    expect(second.status).to.equal('used');

    const peeked = await cache.peek(token);
    expect(peeked.status).to.equal('used');
    if (peeked.status === 'used') {
      expect(peeked.entry?.payload).to.deep.equal(payload);
    }
  });

  it('claim with an expected kind rejects mismatches without burning the token', async () => {
    const { cache } = makeCache();
    const { token } = await cache.issue({ ...payload, kind: 'integration-store' });

    const mismatch = await cache.claim(token, 'agent');
    expect(mismatch.status).to.equal('kind-mismatch');

    const matched = await cache.claim(token, 'integration-store');
    expect(matched.status).to.equal('claimed');
  });

  it('claim with an expected kind reports kindless payloads as corrupt', async () => {
    const { cache } = makeCache();
    const { token } = await cache.issue(payload);

    const outcome = await cache.claim(token, 'agent');
    expect(outcome.status).to.equal('corrupt');
  });

  it('release restores a claimed entry for retry', async () => {
    const { cache } = makeCache();
    const { token } = await cache.issue(payload);

    const claimed = await cache.claim(token);
    if (claimed.status !== 'claimed') {
      throw new Error('expected claim to succeed');
    }
    await cache.release(token, claimed.entry);

    const peeked = await cache.peek(token);
    expect(peeked.status).to.equal('active');

    const reclaimed = await cache.claim(token);
    expect(reclaimed.status).to.equal('claimed');
  });

  it('release is a no-op when the natural expiry has passed', async () => {
    const { cache, cacheService } = makeCache();
    const { token } = await cache.issue(payload);

    const claimed = await cache.claim(token);
    if (claimed.status !== 'claimed') {
      throw new Error('expected claim to succeed');
    }
    const evalCallsBefore = cacheService.eval.callCount;

    await cache.release(token, { ...claimed.entry, expiresAt: Math.floor(Date.now() / 1000) - 1 });

    expect(cacheService.eval.callCount).to.equal(evalCallsBefore);
  });

  it('reports malformed tokens and unknown tokens distinctly', async () => {
    const { cache } = makeCache();

    const malformedPeek = await cache.peek('not-a-valid-token');
    expect(malformedPeek.status).to.equal('malformed-token');

    const malformedClaim = await cache.claim('not-a-valid-token');
    expect(malformedClaim.status).to.equal('malformed-token');

    const missingPeek = await cache.peek('a'.repeat(32));
    expect(missingPeek.status).to.equal('missing');

    const missingClaim = await cache.claim('a'.repeat(32));
    expect(missingClaim.status).to.equal('missing');
  });

  it('tolerates legacy flag-only used markers on peek', async () => {
    const { cache, cacheStore } = makeCache();
    const token = 'a'.repeat(32);
    cacheStore.set(`test_link_used:{${token}}`, '1');

    const peeked = await cache.peek(token);
    expect(peeked.status).to.equal('used');
    if (peeked.status === 'used') {
      expect(peeked.entry).to.equal(null);
    }

    expect(await cache.isTokenUsed(token)).to.equal(true);
  });

  describe('extend (sliding expiry)', () => {
    const EXTEND_TTL = 20 * 60;
    const MAX_LIFETIME = 30 * 60;

    it('records mintedAt on issue', async () => {
      const { cache, cacheService } = makeCache();

      await cache.issue(payload);

      const stored = JSON.parse(cacheService.set.firstCall.args[1] as string);
      expect(stored.mintedAt).to.be.a('number');
      expect(stored.expiresAt - stored.mintedAt).to.equal(TTL_SECONDS);
    });

    it('pushes an active entry out to now + ttl and refreshes the Redis TTL', async () => {
      const { cache, keyTtls } = makeCache();
      const { token } = await cache.issue(payload);
      const now = Math.floor(Date.now() / 1000);

      const outcome = await cache.extend(token, { ttlSeconds: EXTEND_TTL, maxLifetimeSeconds: MAX_LIFETIME });

      expect(outcome.status).to.equal('extended');
      if (outcome.status === 'extended') {
        expect(outcome.entry.expiresAt).to.be.within(now + EXTEND_TTL - 1, now + EXTEND_TTL + 1);
        expect(outcome.entry.payload).to.deep.equal(payload);
      }
      expect(keyTtls.get(`test_link:{${token}}`)).to.be.within(EXTEND_TTL - 1, EXTEND_TTL + 1);

      const peeked = await cache.peek(token);
      expect(peeked.status).to.equal('active');
    });

    it('never shortens an entry that already expires later', async () => {
      const { cache } = makeCache();
      const { token } = await cache.issue(payload);

      const outcome = await cache.extend(token, { ttlSeconds: 60, maxLifetimeSeconds: MAX_LIFETIME });

      expect(outcome.status).to.equal('unchanged');
    });

    it('caps total lifetime at mint + maxLifetime', async () => {
      const { cache, cacheStore } = makeCache();
      const { token } = await cache.issue(payload);
      const now = Math.floor(Date.now() / 1000);
      const mintedAt = now - 25 * 60;
      cacheStore.set(`test_link:{${token}}`, JSON.stringify({ payload, expiresAt: now + 60, mintedAt }));

      const first = await cache.extend(token, { ttlSeconds: EXTEND_TTL, maxLifetimeSeconds: MAX_LIFETIME });
      expect(first.status).to.equal('extended');
      if (first.status === 'extended') {
        expect(first.entry.expiresAt).to.equal(mintedAt + MAX_LIFETIME);
      }

      const second = await cache.extend(token, { ttlSeconds: EXTEND_TTL, maxLifetimeSeconds: MAX_LIFETIME });
      expect(second.status).to.equal('unchanged');
    });

    it('infers mintedAt from the base TTL for entries issued before it was recorded', async () => {
      const { cache, cacheStore } = makeCache();
      const { token } = await cache.issue(payload);
      const now = Math.floor(Date.now() / 1000);
      // Legacy shape: no mintedAt. Issued TTL_SECONDS ago, i.e. expiring right now.
      cacheStore.set(`test_link:{${token}}`, JSON.stringify({ payload, expiresAt: now + 1 }));

      const outcome = await cache.extend(token, { ttlSeconds: EXTEND_TTL, maxLifetimeSeconds: MAX_LIFETIME });

      expect(outcome.status).to.equal('extended');
      if (outcome.status === 'extended') {
        // Inferred mint = (now + 1) - TTL_SECONDS; the cap is measured from there.
        const inferredMintedAt = now + 1 - TTL_SECONDS;
        expect(outcome.entry.mintedAt).to.equal(inferredMintedAt);
        expect(outcome.entry.expiresAt).to.equal(Math.min(now + EXTEND_TTL, inferredMintedAt + MAX_LIFETIME));
      }
    });

    it('cannot resurrect a claimed or unknown token', async () => {
      const { cache, cacheStore } = makeCache();
      const { token } = await cache.issue(payload);
      await cache.claim(token);

      const afterClaim = await cache.extend(token, { ttlSeconds: EXTEND_TTL, maxLifetimeSeconds: MAX_LIFETIME });
      expect(afterClaim.status).to.equal('missing');
      expect(cacheStore.has(`test_link:{${token}}`)).to.equal(false);

      const unknown = await cache.extend('b'.repeat(32), { ttlSeconds: EXTEND_TTL, maxLifetimeSeconds: MAX_LIFETIME });
      expect(unknown.status).to.equal('missing');

      const malformed = await cache.extend('nope', { ttlSeconds: EXTEND_TTL, maxLifetimeSeconds: MAX_LIFETIME });
      expect(malformed.status).to.equal('malformed-token');
    });

    it('leaves entries of another kind untouched', async () => {
      const { cache, keyTtls } = makeCache();
      const { token } = await cache.issue({ ...payload, kind: 'integration-store' });
      const ttlBefore = keyTtls.get(`test_link:{${token}}`);

      const outcome = await cache.extend(token, {
        ttlSeconds: EXTEND_TTL,
        maxLifetimeSeconds: MAX_LIFETIME,
        expectedKind: 'agent',
      });

      expect(outcome.status).to.equal('kind-mismatch');
      expect(keyTtls.get(`test_link:{${token}}`)).to.equal(ttlBefore);
    });
  });

  it('throws the configured domain error when the cache is unavailable', async () => {
    const { cache, cacheService } = makeCache();
    cacheService.get.rejects(new Error('redis down'));

    try {
      await cache.peek('a'.repeat(32));
      expect.fail('expected cache failure');
    } catch (err) {
      expect(err).to.be.instanceOf(TestCacheUnavailableError);
      expect((err as TestCacheUnavailableError).operation).to.equal('peek');
    }
  });
});
