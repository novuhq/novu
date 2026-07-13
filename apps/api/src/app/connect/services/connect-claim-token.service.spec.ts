import { expect } from 'chai';
import sinon from 'sinon';

import {
  CONNECT_CLAIM_TOKEN_TTL_SECONDS,
  ConnectClaimTokenService,
  InvalidConnectClaimTokenError,
} from './connect-claim-token.service';

describe('ConnectClaimTokenService', () => {
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
      setIfNotExist: sinon.stub().callsFake(async (key: string, value: string) => {
        if (cacheStore.has(key)) {
          return null;
        }

        cacheStore.set(key, value);

        return 'OK';
      }),
      eval: sinon.stub().callsFake(async (_script: string, keys: string[], args: (string | number | Buffer)[]) => {
        const storageKey = keys[0];
        const usedKey = keys[1];
        const raw = cacheStore.get(storageKey);

        if (!raw) {
          if (cacheStore.has(usedKey)) {
            return 'U';
          }

          return '';
        }

        cacheStore.delete(storageKey);

        let parsed: { expiresAt?: number; payload?: { env?: string; org?: string } };

        try {
          parsed = JSON.parse(raw);
        } catch {
          return 'I';
        }

        if (!parsed.expiresAt || !parsed.payload) {
          return 'I';
        }

        cacheStore.set(usedKey, '1');

        return `M${raw}`;
      }),
    };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
    };

    const service = new ConnectClaimTokenService(cacheService as any, logger as any);

    return { service, cacheService, cacheStore };
  }

  const payload = { env: 'env-1', org: 'org-1' };

  it('issues a 32-char alphanumeric token and stores JSON payload with TTL', async () => {
    const { service, cacheService } = makeService();

    const { token, expiresAt } = await service.issue(payload);

    expect(token).to.have.length(32);
    expect(token).to.match(/^[A-Za-z0-9]+$/);
    expect(token).to.not.match(/[-_]/);

    const expiresAtMs = Date.parse(expiresAt);
    const expectedExpiresAtMs = Date.now() + CONNECT_CLAIM_TOKEN_TTL_SECONDS * 1000;
    expect(Math.abs(expiresAtMs - expectedExpiresAtMs)).to.be.below(1500);

    expect(cacheService.set.calledOnce).to.equal(true);
    const setArgs = cacheService.set.firstCall.args;
    expect(setArgs[0]).to.equal(`connect_claim_link:{${token}}`);
    const parsed = JSON.parse(setArgs[1] as string);
    expect(parsed.payload).to.deep.equal(payload);
    expect(setArgs[2]).to.deep.equal({ ttl: CONNECT_CLAIM_TOKEN_TTL_SECONDS });
  });

  it('verifies and claims legacy base64url tokens', async () => {
    const { service, cacheStore } = makeService();
    const legacyToken = '0123456789ABCDEFGHIJKLMNOPQRSTU_';
    const expiresAt = Math.floor(Date.now() / 1000) + CONNECT_CLAIM_TOKEN_TTL_SECONDS;

    cacheStore.set(
      `connect_claim_link:{${legacyToken}}`,
      JSON.stringify({ payload, expiresAt })
    );

    const verified = await service.verify(legacyToken);
    expect(verified).to.deep.equal(payload);

    cacheStore.set(
      `connect_claim_link:{${legacyToken}}`,
      JSON.stringify({ payload, expiresAt })
    );

    const claimed = await service.claim(legacyToken);
    expect(claimed).to.deep.equal(payload);
  });

  it('rejects invalid token formats', async () => {
    const { service } = makeService();

    try {
      await service.verify('invalid-token');
      expect.fail('expected verify to reject invalid token');
    } catch (error) {
      expect(error).to.be.instanceOf(InvalidConnectClaimTokenError);
      expect((error as InvalidConnectClaimTokenError).reason).to.equal('invalid');
    }

    try {
      await service.claim('invalid-token');
      expect.fail('expected claim to reject invalid token');
    } catch (error) {
      expect(error).to.be.instanceOf(InvalidConnectClaimTokenError);
      expect((error as InvalidConnectClaimTokenError).reason).to.equal('invalid');
    }
  });

  it('reuses an existing legacy env token until it expires', async () => {
    const { service, cacheStore, cacheService } = makeService();
    const legacyToken = '0123456789ABCDEFGHIJKLMNOPQRSTU_';
    const expiresAt = Math.floor(Date.now() / 1000) + CONNECT_CLAIM_TOKEN_TTL_SECONDS;

    cacheStore.set(`connect_claim_link_env:{${payload.env}}`, legacyToken);
    cacheStore.set(
      `connect_claim_link:{${legacyToken}}`,
      JSON.stringify({ payload, expiresAt })
    );

    const issued = await service.issueOrGetForEnvironment(payload);

    expect(issued.token).to.equal(legacyToken);
    expect(cacheService.set.callCount).to.equal(0);
  });
});
