import { expect } from 'chai';
import sinon from 'sinon';

import {
  TELEGRAM_START_CODE_TTL_SECONDS,
  TelegramStartCodeService,
} from './telegram-start-code.service';

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

  it('peek returns payload without deleting', async () => {
    const { service, cacheStore } = makeService();
    const { code } = await service.issue({
      environmentId: 'e',
      organizationId: 'o',
      agentIdentifier: 'a',
      integrationId: 'i',
      subscriberId: 's',
    });

    const first = await service.peek(code);
    const second = await service.peek(code);

    expect(first?.subscriberId).to.equal('s');
    expect(second?.subscriberId).to.equal('s');
    expect(cacheStore.has(`telegram-start-code:${code}`)).to.equal(true);
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
    expect(await service.peek(code)).to.equal(null);
  });

  it('peek returns null for unknown code', async () => {
    const { service } = makeService();

    expect(await service.peek('unknown-unknown-unknown-unknown')).to.equal(null);
  });
});
