import { expect } from 'chai';
import sinon from 'sinon';

import { TELEGRAM_START_CODE_TTL_SECONDS, TelegramStartCodeService } from './telegram-start-code.service';

describe('TelegramStartCodeService', () => {
  function makeService() {
    const cacheStore = new Map<string, string>();
    const cacheService = {
      cacheEnabled: () => true,
      set: sinon.stub().callsFake(async (key: string, value: string) => {
        cacheStore.set(key, value);

        return 'OK';
      }),
      get: sinon.stub().callsFake(async (key: string) => cacheStore.get(key) ?? null),
      del: sinon.stub().callsFake(async (key: string) => {
        cacheStore.delete(key);
      }),
      eval: sinon.stub().callsFake(async (_script: string, keys: string[], args: (string | number | Buffer)[]) => {
        const key = keys[0];
        const raw = cacheStore.get(key);
        if (!raw) return '';

        let parsed: any;
        try {
          parsed = JSON.parse(raw);
        } catch {
          cacheStore.delete(key);

          return '';
        }

        const matches =
          parsed._environmentId === args[0] &&
          parsed._organizationId === args[1] &&
          parsed._integrationId === args[2] &&
          parsed.agentIdentifier === args[3];

        if (matches) {
          cacheStore.delete(key);

          return `M${raw}`;
        }

        return `X${raw}`;
      }),
    };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
    };

    const service = new TelegramStartCodeService(cacheService as any, logger as any);

    return { service, cacheService, cacheStore };
  }

  const scope = {
    environmentId: 'e',
    organizationId: 'o',
    integrationId: 'i',
    agentIdentifier: 'a',
  };

  it('issues a 32-char base64url code and stores JSON payload with TTL', async () => {
    const { service, cacheService } = makeService();

    const { code, expiresAt } = await service.issue({
      environmentId: 'env-1',
      organizationId: 'org-1',
      agentIdentifier: 'agent-1',
      integrationId: 'int-1',
      subscriberId: 'sub-1',
    });

    expect(code).to.have.length(32);
    expect(code).to.match(/^[A-Za-z0-9_-]+$/);

    const expiresAtMs = Date.parse(expiresAt);
    const expectedExpiresAtMs = Date.now() + TELEGRAM_START_CODE_TTL_SECONDS * 1000;
    expect(Math.abs(expiresAtMs - expectedExpiresAtMs)).to.be.below(1500);

    expect(cacheService.set.calledOnce).to.equal(true);
    const setArgs = cacheService.set.firstCall.args;
    expect(setArgs[0]).to.equal(`telegram-start-code:${code}`);
    const parsed = JSON.parse(setArgs[1] as string);
    expect(parsed._environmentId).to.equal('env-1');
    expect(parsed.subscriberId).to.equal('sub-1');
    expect(setArgs[2]).to.deep.equal({ ttl: TELEGRAM_START_CODE_TTL_SECONDS });
  });

  it('consumeIfMatches atomically deletes on scope match and is single-use under concurrency', async () => {
    const { service, cacheStore } = makeService();
    const { code } = await service.issue({
      environmentId: 'e',
      organizationId: 'o',
      agentIdentifier: 'a',
      integrationId: 'i',
      subscriberId: 's',
    });

    const [first, second] = await Promise.all([
      service.consumeIfMatches(code, scope),
      service.consumeIfMatches(code, scope),
    ]);

    const outcomes = [first.status, second.status].sort();
    expect(outcomes).to.deep.equal(['consumed', 'missing']);
    expect(cacheStore.has(`telegram-start-code:${code}`)).to.equal(false);
  });

  it('consumeIfMatches returns mismatch without deleting when scope differs', async () => {
    const { service, cacheStore } = makeService();
    const { code } = await service.issue({
      environmentId: 'e',
      organizationId: 'o',
      agentIdentifier: 'a',
      integrationId: 'i',
      subscriberId: 's',
    });

    const result = await service.consumeIfMatches(code, { ...scope, integrationId: 'other' });

    expect(result.status).to.equal('mismatch');
    if (result.status === 'mismatch') {
      expect(result.payload.subscriberId).to.equal('s');
    }
    expect(cacheStore.has(`telegram-start-code:${code}`)).to.equal(true);
  });

  it('consumeIfMatches returns missing for unknown code', async () => {
    const { service } = makeService();

    const result = await service.consumeIfMatches('unknown-unknown-unknown-unknown', scope);

    expect(result.status).to.equal('missing');
  });

  it('delete removes the code', async () => {
    const { service, cacheStore } = makeService();
    const { code } = await service.issue({
      environmentId: 'e',
      organizationId: 'o',
      agentIdentifier: 'a',
      integrationId: 'i',
      subscriberId: 's',
    });

    await service.delete(code);

    expect(cacheStore.has(`telegram-start-code:${code}`)).to.equal(false);
  });
});
