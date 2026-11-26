import { createHash, createHmac, randomUUID } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { SubscriberSessionSourceEnum } from '../../shared/services/subscriber-session-auth-stats.service';
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

function setup(flagValue: unknown, storedKeys: StoredKey[], { isHmacBlockEnabled = false } = {}) {
  const featureFlagsService = {
    getFlag: sinon
      .stub()
      .callsFake(async ({ key }: { key: string }) =>
        key === FeatureFlagsKeysEnum.IS_API_KEY_REVOCATION_HMAC_BLOCK_ENABLED ? isHmacBlockEnabled : flagValue
      ),
  };
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

    it('keeps every key in the other modes while the HMAC block is off', async () => {
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

    it('leaves out the keys created before the cutoff in block_except_allowed while the HMAC block is on', async () => {
      const { service } = setup(flag('block_except_allowed'), [], { isHmacBlockEnabled: true });

      const signingKeys = await service.getSigningKeys({
        organizationId: 'org-id',
        environmentId: 'env-id',
        apiKeys: createKeys(),
      });

      expect(signingKeys).to.deep.equal(['new-encrypted-key']);
    });

    it('keeps every key while the policy is off or in warn mode, even with the HMAC block on', async () => {
      for (const flagValue of ['', flag('warn')]) {
        const { service } = setup(flagValue, [], { isHmacBlockEnabled: true });

        const signingKeys = await service.getSigningKeys({
          organizationId: 'org-id',
          environmentId: 'env-id',
          apiKeys: createKeys(),
        });

        expect(signingKeys, JSON.stringify(flagValue)).to.deep.equal(['old-encrypted-key', 'new-encrypted-key']);
      }
    });

    it('reads both flags for the organization and environment of the keys', async () => {
      const { service, featureFlagsService } = setup(flag('block_all'), []);

      await service.getSigningKeys({ organizationId: 'org-id', environmentId: 'env-id', apiKeys: [] });

      const context = { organization: { _id: 'org-id' }, environment: { _id: 'env-id' }, component: 'api' };

      expect(featureFlagsService.getFlag.getCalls().map((call) => call.args[0])).to.have.deep.members([
        { key: FeatureFlagsKeysEnum.API_KEY_REVOCATION_POLICY, defaultValue: '', ...context },
        { key: FeatureFlagsKeysEnum.IS_API_KEY_REVOCATION_HMAC_BLOCK_ENABLED, defaultValue: false, ...context },
      ]);
    });
  });

  describe('recordOldKeySubscriberHash', () => {
    const subscriberId = 'subscriber-id';
    // Stored keys without the encryption prefix are used as they are, so these act as plain secret keys.
    const sign = (secretKey: string) => createHmac('sha256', secretKey).update(subscriberId).digest('hex');
    // A random environment keeps the module-level log throttle from carrying over between tests.
    const hashSignedWith = (secretKey: string | undefined, signingKeys = ['old-secret', 'new-secret']) => ({
      organizationId: 'org-id',
      environmentId: randomUUID(),
      apiKeys: [
        { ...createOldKey().stored, key: 'old-secret' },
        { ...createNewKey().stored, key: 'new-secret' },
      ],
      signingKeys,
      subscriberId,
      subscriberHash: secretKey && sign(secretKey),
      source: SubscriberSessionSourceEnum.INBOX,
    });

    it('logs a hash signed with an old key that still counts once per environment, source and outcome', async () => {
      const { service, logger } = setup(flag('block_except_allowed'), []);
      const session = hashSignedWith('old-secret');

      await service.recordOldKeySubscriberHash(session);
      await service.recordOldKeySubscriberHash(session);

      expect(logger.warn.callCount).to.equal(1);
      expect(logger.warn.firstCall.args).to.deep.equal([
        {
          apiKeyRequiresRotation: true,
          apiKeyRevocationBlocked: false,
          apiKeyRevocationMode: 'block_except_allowed',
          apiKeyRevocationHashSource: 'inbox',
          organizationId: 'org-id',
          environmentId: session.environmentId,
        },
        'Accepted a subscriber hash signed with a secret key that has to be replaced',
      ]);
    });

    it('logs a hash signed with an old key the session no longer accepts as rejected', async () => {
      const { service, logger } = setup(flag('block_all'), []);

      await service.recordOldKeySubscriberHash({
        ...hashSignedWith('old-secret', ['new-secret']),
        source: SubscriberSessionSourceEnum.LEGACY_WIDGET,
      });

      expect(logger.warn.firstCall.args[0]).to.deep.include({
        apiKeyRevocationBlocked: true,
        apiKeyRevocationMode: 'block_all',
        apiKeyRevocationHashSource: 'legacy-widget',
      });
      expect(logger.warn.firstCall.args[1]).to.equal('Rejected a subscriber hash signed with a revoked secret key');
    });

    it('records nothing for a hash signed with a newer key, a wrong hash or no hash', async () => {
      const { service, logger } = setup(flag('block_except_allowed'), []);

      for (const secretKey of ['new-secret', 'another-secret', undefined]) {
        await service.recordOldKeySubscriberHash(hashSignedWith(secretKey));
      }

      expect(logger.warn.called).to.equal(false);
    });

    it('records nothing while the policy is off', async () => {
      const { service, logger } = setup('', []);

      await service.recordOldKeySubscriberHash(hashSignedWith('old-secret'));

      expect(logger.warn.called).to.equal(false);
    });

    it('logs instead of failing the session when a stored key cannot be read', async () => {
      const { service, logger } = setup(flag('block_except_allowed'), []);

      await service.recordOldKeySubscriberHash({
        ...hashSignedWith('old-secret'),
        apiKeys: [{ ...createOldKey().stored, key: 'nvsk.not-an-encrypted-key' }],
      });

      expect(logger.error.calledOnce).to.equal(true);
      expect(logger.warn.called).to.equal(false);
    });
  });
});
