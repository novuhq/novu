import { expect } from 'chai';
import sinon from 'sinon';

import {
  InvalidTelegramMobileTokenError,
  TELEGRAM_MOBILE_LINK_TTL_SECONDS,
  TelegramMobileLinkTokenService,
} from './telegram-mobile-link-token.service';

describe('TelegramMobileLinkTokenService', () => {
  function makeService() {
    const cacheStore = new Map<string, string>();
    const client = {
      getdel: sinon.stub().callsFake(async (key: string) => {
        const value = cacheStore.get(key) ?? null;
        if (value != null) {
          cacheStore.delete(key);
        }

        return value;
      }),
    };
    const cacheService = {
      cacheEnabled: () => true,
      client,
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

    const service = new TelegramMobileLinkTokenService(cacheService as any, logger as any);

    return { service, cacheService, cacheStore, client };
  }

  it('issues a 32-char opaque token and stores the payload in Redis', async () => {
    const { service, cacheService } = makeService();

    const { token, expiresAt } = await service.issue({
      environmentId: 'env-1',
      organizationId: 'org-1',
      agentIdentifier: 'agent-1',
      integrationId: 'int-1',
      subscriberId: 'sub-1',
    });

    expect(token).to.have.length(32);
    expect(token).to.match(/^[A-Za-z0-9_-]+$/);

    const expiresAtMs = Date.parse(expiresAt);
    const expectedExpiresAtMs = Date.now() + TELEGRAM_MOBILE_LINK_TTL_SECONDS * 1000;
    expect(Math.abs(expiresAtMs - expectedExpiresAtMs)).to.be.below(1500);

    expect(cacheService.set.calledOnce).to.equal(true);
    const setArgs = cacheService.set.firstCall.args;
    expect(setArgs[0]).to.equal(`telegram_mobile_link:${token}`);
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

  it('claim is single-use and marks the token as used', async () => {
    const { service } = makeService();
    const { token } = await service.issue({
      environmentId: 'env-1',
      organizationId: 'org-1',
      agentIdentifier: 'agent-1',
      integrationId: 'int-1',
    });

    const claimed = await service.claim(token, 'agent');
    expect(claimed.payload.kind).to.equal('agent');

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

  it('release restores a claimed token for retry', async () => {
    const { service } = makeService();
    const { token } = await service.issue({
      environmentId: 'env-1',
      organizationId: 'org-1',
      agentIdentifier: 'agent-1',
      integrationId: 'int-1',
    });

    const claimed = await service.claim(token, 'agent');
    await service.release(token, claimed);

    const payload = await service.verify(token);
    expect(payload.iid).to.equal('int-1');
  });

  it('rejects tokens with unexpected kind', async () => {
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
});
