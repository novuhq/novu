import { JwtService } from '@nestjs/jwt';
import { expect } from 'chai';
import sinon from 'sinon';

import {
  InvalidTelegramSubscriberLinkTokenError,
  TelegramMobileLinkTokenService,
  TELEGRAM_SUBSCRIBER_LINK_TTL_SECONDS,
} from './telegram-mobile-link-token.service';

describe('TelegramMobileLinkTokenService - subscriber link', () => {
  function makeService() {
    const jwtService = new JwtService({ secret: 'test-secret' });
    const cacheStore = new Map<string, string>();
    const cacheService = {
      cacheEnabled: () => true,
      setIfNotExist: sinon.stub().callsFake(async (key: string, value: string) => {
        if (cacheStore.has(key)) return null;
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

    const service = new TelegramMobileLinkTokenService(jwtService, cacheService as any, logger as any);

    return { service, cacheService, cacheStore };
  }

  it('round-trips a subscriber-link token with all expected claims', async () => {
    const { service } = makeService();

    const { token, expiresAt } = await service.issueSubscriberLink({
      environmentId: 'env-1',
      organizationId: 'org-1',
      agentIdentifier: 'support-agent',
      integrationId: 'integration-1',
      subscriberId: 'subscriber-1',
    });

    const payload = service.verifySubscriberLink(token);

    expect(payload.env).to.equal('env-1');
    expect(payload.org).to.equal('org-1');
    expect(payload.aid).to.equal('support-agent');
    expect(payload.iid).to.equal('integration-1');
    expect(payload.sid).to.equal('subscriber-1');
    expect(payload.jti).to.be.a('string').and.have.length.greaterThan(10);

    const expiresAtMs = Date.parse(expiresAt);
    const expectedExpiresAtMs = Date.now() + TELEGRAM_SUBSCRIBER_LINK_TTL_SECONDS * 1000;
    expect(Math.abs(expiresAtMs - expectedExpiresAtMs)).to.be.below(1500);
  });

  it('rejects tampered or unsigned tokens with reason "invalid"', () => {
    const { service } = makeService();

    expect(() => service.verifySubscriberLink('not.a.jwt')).to.throw(InvalidTelegramSubscriberLinkTokenError);
    try {
      service.verifySubscriberLink('not.a.jwt');
    } catch (err) {
      expect((err as InvalidTelegramSubscriberLinkTokenError).reason).to.equal('invalid');
    }
  });

  it('rejects tokens issued with a different audience (mobile-setup) when verified as subscriber-link', async () => {
    const { service } = makeService();

    // A mobile-setup token must not pass subscriber-link verification.
    const mobileLink = await service.issue({
      environmentId: 'env-1',
      organizationId: 'org-1',
      agentIdentifier: 'support-agent',
      integrationId: 'integration-1',
    });

    expect(() => service.verifySubscriberLink(mobileLink.token)).to.throw(InvalidTelegramSubscriberLinkTokenError);
  });

  it('claims a subscriber-link jti exactly once', async () => {
    const { service } = makeService();
    const jti = 'jti-test-1';

    const first = await service.claimSubscriberLinkJti(jti);
    const second = await service.claimSubscriberLinkJti(jti);

    expect(first).to.equal(true);
    expect(second).to.equal(false);
    expect(await service.isSubscriberLinkJtiUsed(jti)).to.equal(true);
  });

  it('release allows the jti to be claimed again', async () => {
    const { service } = makeService();
    const jti = 'jti-test-2';

    await service.claimSubscriberLinkJti(jti);
    await service.releaseSubscriberLinkJti(jti);
    const reclaim = await service.claimSubscriberLinkJti(jti);

    expect(reclaim).to.equal(true);
  });
});
