import { ConflictException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { expect } from 'chai';
import sinon from 'sinon';

import {
  HUMAN_INVITE_LINK_TTL_SECONDS,
  HumanInviteTokenService,
  InactiveHumanInviteError,
} from './human-invite-token.service';

describe('HumanInviteTokenService', () => {
  /** Mirrors the claim Lua script in SingleUseTokenCache (GETDEL + used-marker carrying the entry). */
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

    return { service: new HumanInviteTokenService(cacheService as never, logger as never), cacheService, cacheStore };
  }

  const payload = { env: 'env-1', org: 'org-1', agentId: 'agent-1', subscriberId: 'alice' };

  it('issues a 32-char token that lives for three days', async () => {
    const { service, cacheService } = makeService();

    const { token, expiresAt } = await service.issue(payload);

    expect(token).to.match(/^[A-Za-z0-9]{32}$/);
    expect(Math.abs(Date.parse(expiresAt) - (Date.now() + HUMAN_INVITE_LINK_TTL_SECONDS * 1000))).to.be.below(1500);
    expect(cacheService.set.firstCall.args[0]).to.equal(`human_invite_link:{${token}}`);
    expect(cacheService.set.firstCall.args[2]).to.deep.equal({ ttl: HUMAN_INVITE_LINK_TTL_SECONDS });
  });

  it('can be read any number of times while active', async () => {
    const { service } = makeService();
    const { token, expiresAt } = await service.issue(payload);

    const first = await service.peek(token);
    const second = await service.peek(token);

    expect(first).to.deep.equal({ payload, expiresAt });
    expect(second.payload).to.deep.equal(payload);
  });

  it('reads as declined after decline, and declining again is a no-op', async () => {
    const { service } = makeService();
    const { token } = await service.issue(payload);

    await service.decline(token);
    await service.decline(token);

    try {
      await service.peek(token);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(InactiveHumanInviteError);
      expect((err as InactiveHumanInviteError).reason).to.equal('declined');
    }
  });

  it('reads unknown tokens as expired and malformed ones as invalid', async () => {
    const { service } = makeService();

    const reasons = await Promise.all(
      ['a'.repeat(32), 'not a token'].map((token) =>
        service.peek(token).catch((err: InactiveHumanInviteError) => err.reason)
      )
    );

    expect(reasons).to.deep.equal(['expired', 'invalid']);
  });

  describe('requireActive', () => {
    it('maps a declined invite to a 409 with invite_declined', async () => {
      const { service } = makeService();
      const { token } = await service.issue(payload);
      await service.decline(token);

      const err = await service.requireActive(token).catch((error) => error);

      expect(err).to.be.instanceOf(ConflictException);
      expect((err as ConflictException).getResponse()).to.include({ code: 'invite_declined' });
    });

    it('maps expired and malformed links to 401s with token_expired and token_invalid', async () => {
      const { service } = makeService();

      const expired = await service.requireActive('a'.repeat(32)).catch((error) => error);
      const invalid = await service.requireActive('nope').catch((error) => error);

      expect(expired).to.be.instanceOf(UnauthorizedException);
      expect((expired as UnauthorizedException).getResponse()).to.include({ code: 'token_expired' });
      expect(invalid).to.be.instanceOf(UnauthorizedException);
      expect((invalid as UnauthorizedException).getResponse()).to.include({ code: 'token_invalid' });
    });

    it('maps a cache outage to a 503', async () => {
      const { service } = makeService({ cacheEnabled: false });

      const err = await service.requireActive('a'.repeat(32)).catch((error) => error);

      expect(err).to.be.instanceOf(ServiceUnavailableException);
    });
  });
});
