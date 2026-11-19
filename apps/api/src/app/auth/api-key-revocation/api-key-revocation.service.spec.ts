import { createHash, randomUUID } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { expect } from 'chai';
import sinon from 'sinon';
import { REVOKED_API_KEY_MESSAGE, TRIGGER_ONLY_API_KEY_MESSAGE } from './api-key-revocation.policy';
import { ApiKeyRevocationService } from './api-key-revocation.service';

const HOUR_MS = 60 * 60 * 1000;

type StoredKey = { key: string; _userId: string; hash: string; _id: string };

function objectIdCreatedAt(date: Date): string {
  return `${Math.floor(date.getTime() / 1000)
    .toString(16)
    .padStart(8, '0')}0000000000000000`;
}

// Random keys keep the module-level creation-time cache from carrying over between tests.
function createKey(createdAt: Date): { apiKey: string; stored: StoredKey } {
  const apiKey = randomUUID();

  return {
    apiKey,
    stored: {
      key: 'encrypted-key',
      _userId: 'user-id',
      hash: createHash('sha256').update(apiKey).digest('hex'),
      _id: objectIdCreatedAt(createdAt),
    },
  };
}

function setup(flagValue: unknown, storedKeys: StoredKey[]) {
  const featureFlagsService = { getFlag: sinon.stub().resolves(flagValue) };
  const environmentRepository = {
    findOne: sinon.stub().callsFake(async (query: Record<string, string>) => {
      const hash = query['apiKeys.hash'];

      return storedKeys.some((stored) => stored.hash === hash) ? { apiKeys: storedKeys } : null;
    }),
  };
  const logger = { setContext: sinon.stub(), error: sinon.stub(), warn: sinon.stub() };
  const service = new ApiKeyRevocationService(
    featureFlagsService as never,
    environmentRepository as never,
    logger as never
  );

  return { service, featureFlagsService, environmentRepository, logger };
}

function callWith(apiKey: string, method: string, routePath: string) {
  return {
    organizationId: 'org-id',
    environmentId: 'env-id',
    authorization: `ApiKey ${apiKey}`,
    method,
    routePath,
  };
}

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }

  return undefined;
}

describe('ApiKeyRevocationService', () => {
  const cutoff = new Date(Date.now() - HOUR_MS);
  const createOldKey = () => createKey(new Date(cutoff.getTime() - 24 * HOUR_MS));
  const createNewKey = () => createKey(new Date());
  const flag = (mode: string, extra: Record<string, unknown> = {}) => ({
    mode,
    keysCreatedBefore: cutoff.toISOString(),
    ...extra,
  });

  it('changes nothing and reads no key while the policy is off', async () => {
    const { apiKey, stored } = createOldKey();
    const { service, environmentRepository } = setup('', [stored]);

    await service.assertRequestAllowed(callWith(apiKey, 'GET', '/v1/subscribers'));

    expect(environmentRepository.findOne.called).to.equal(false);
  });

  it('reads the flag for the organization and environment of the call', async () => {
    const { apiKey, stored } = createOldKey();
    const { service, featureFlagsService } = setup('', [stored]);

    await service.assertRequestAllowed(callWith(apiKey, 'GET', '/v1/subscribers'));

    expect(featureFlagsService.getFlag.firstCall.args[0]).to.deep.include({
      organization: { _id: 'org-id' },
      environment: { _id: 'env-id' },
      defaultValue: '',
    });
  });

  it('rejects an old key outside the trigger routes and says it can still trigger', async () => {
    const { apiKey, stored } = createOldKey();
    const { service } = setup(flag('block_except_allowed'), [stored]);

    const error = await rejectionOf(service.assertRequestAllowed(callWith(apiKey, 'GET', '/v1/subscribers')));

    expect(error).to.be.instanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).message).to.equal(TRIGGER_ONLY_API_KEY_MESSAGE);
  });

  it('lets an old key trigger and cancel workflows', async () => {
    const { apiKey, stored } = createOldKey();
    const { service } = setup(flag('block_except_allowed'), [stored]);

    await service.assertRequestAllowed(callWith(apiKey, 'POST', '/v1/events/trigger'));
    await service.assertRequestAllowed(callWith(apiKey, 'DELETE', '/v1/events/trigger/:transactionId'));
  });

  it('rejects an old key on every route in block_all mode', async () => {
    const { apiKey, stored } = createOldKey();
    const { service } = setup(flag('block_all'), [stored]);

    const error = await rejectionOf(service.assertRequestAllowed(callWith(apiKey, 'POST', '/v1/events/trigger')));

    expect(error).to.be.instanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).message).to.equal(REVOKED_API_KEY_MESSAGE);
  });

  it('never limits or logs a key created after the cutoff', async () => {
    const { apiKey, stored } = createNewKey();
    const { service, logger } = setup(flag('block_all'), [stored]);

    await service.assertRequestAllowed(callWith(apiKey, 'GET', '/v1/subscribers'));

    expect(logger.warn.called).to.equal(false);
  });

  it('logs a call made with an old key once per route and outcome, with the New Relic flags', async () => {
    const { apiKey, stored } = createOldKey();
    const { service, logger } = setup(flag('block_except_allowed'), [stored]);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await rejectionOf(service.assertRequestAllowed(callWith(apiKey, 'GET', '/v1/subscribers')));
      await service.assertRequestAllowed(callWith(apiKey, 'POST', '/v1/events/trigger'));
    }

    expect(logger.warn.callCount).to.equal(2);
    expect(logger.warn.firstCall.args[0]).to.deep.equal({
      apiKeyRequiresRotation: true,
      apiKeyRevocationBlocked: true,
      apiKeyRevocationMode: 'block_except_allowed',
      organizationId: 'org-id',
      environmentId: 'env-id',
      route: 'GET /v1/subscribers',
    });
    expect(logger.warn.secondCall.args[0]).to.deep.include({
      apiKeyRequiresRotation: true,
      apiKeyRevocationBlocked: false,
      route: 'POST /v1/events/trigger',
    });
  });

  it('lets an old key through in warn mode', async () => {
    const { apiKey, stored } = createOldKey();
    const { service } = setup(flag('warn'), [stored]);

    await service.assertRequestAllowed(callWith(apiKey, 'GET', '/v1/subscribers'));
  });

  it('accepts the flag as a string holding JSON', async () => {
    const { apiKey, stored } = createOldKey();
    const { service } = setup(JSON.stringify(flag('block_all')), [stored]);

    const error = await rejectionOf(service.assertRequestAllowed(callWith(apiKey, 'POST', '/v1/events/trigger')));

    expect(error).to.be.instanceOf(UnauthorizedException);
  });

  it('treats a key it cannot find as old and looks it up again next time', async () => {
    const { apiKey } = createOldKey();
    const { service, environmentRepository } = setup(flag('block_all'), []);

    expect(
      await rejectionOf(service.assertRequestAllowed(callWith(apiKey, 'GET', '/v1/subscribers')))
    ).to.be.instanceOf(UnauthorizedException);
    expect(
      await rejectionOf(service.assertRequestAllowed(callWith(apiKey, 'GET', '/v1/subscribers')))
    ).to.be.instanceOf(UnauthorizedException);
    expect(environmentRepository.findOne.calledTwice).to.equal(true);
  });

  it('looks a key up on the primary once and reuses its creation time', async () => {
    const { apiKey, stored } = createNewKey();
    const { service, environmentRepository } = setup(flag('block_all'), [stored]);

    await service.assertRequestAllowed(callWith(apiKey, 'GET', '/v1/subscribers'));
    await service.assertRequestAllowed(callWith(apiKey, 'GET', '/v1/topics'));

    expect(environmentRepository.findOne.calledOnce).to.equal(true);
    expect(environmentRepository.findOne.firstCall.args[2]).to.deep.equal({ readPreference: 'primary' });
  });

  it('logs a flag value it cannot use and lets calls through', async () => {
    const { apiKey, stored } = createOldKey();
    const { service, logger } = setup(`{not json ${randomUUID()}`, [stored]);

    await service.assertRequestAllowed(callWith(apiKey, 'GET', '/v1/subscribers'));
    await service.assertRequestAllowed(callWith(apiKey, 'GET', '/v1/subscribers'));

    expect(logger.error.calledOnce).to.equal(true);
  });

  describe('isRotationRequired', () => {
    it('marks the keys created before the cutoff while the policy is on', async () => {
      const { stored: oldStored } = createOldKey();
      const { stored: newStored } = createNewKey();
      const { service } = setup(flag('warn'), []);
      const policy = await service.getPolicy({ organizationId: 'org-id', environmentId: 'env-id' });
      const off = await setup('', []).service.getPolicy({ organizationId: 'org-id', environmentId: 'env-id' });

      expect(service.isRotationRequired(policy, oldStored)).to.equal(true);
      expect(service.isRotationRequired(policy, newStored)).to.equal(false);
      expect(service.isRotationRequired(off, oldStored)).to.equal(false);
    });
  });

  describe('getSigningKeys', () => {
    const createKeys = () => [
      { ...createOldKey().stored, key: 'old-encrypted-key' },
      { ...createNewKey().stored, key: 'new-encrypted-key' },
    ];

    it('leaves out the keys created before the cutoff in block_all mode', async () => {
      const { service } = setup(flag('block_all'), []);

      const signingKeys = await service.getSigningKeys({
        organizationId: 'org-id',
        environmentId: 'env-id',
        apiKeys: createKeys(),
      });

      expect(signingKeys).to.deep.equal(['new-encrypted-key']);
    });

    it('keeps every key in the other modes', async () => {
      for (const flagValue of ['', flag('warn'), flag('block_except_allowed')]) {
        const { service } = setup(flagValue, []);

        const signingKeys = await service.getSigningKeys({
          organizationId: 'org-id',
          environmentId: 'env-id',
          apiKeys: createKeys(),
        });

        expect(signingKeys, JSON.stringify(flagValue)).to.deep.equal(['old-encrypted-key', 'new-encrypted-key']);
      }
    });

    it('reads the flag for the organization and environment of the keys', async () => {
      const { service, featureFlagsService } = setup(flag('block_all'), []);

      await service.getSigningKeys({ organizationId: 'org-id', environmentId: 'env-id', apiKeys: [] });

      expect(featureFlagsService.getFlag.firstCall.args[0]).to.deep.include({
        organization: { _id: 'org-id' },
        environment: { _id: 'env-id' },
      });
    });
  });
});
