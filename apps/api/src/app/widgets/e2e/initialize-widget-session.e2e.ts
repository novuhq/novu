import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, InAppProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  buildIntegrationKey,
  CacheInMemoryProviderService,
  CacheService,
  createHash,
  InvalidateCacheService,
} from '@novu/application-generic';

import { encryptApiKeysMigration } from '../../../../migrations/encrypt-api-keys/encrypt-api-keys-migration';

const integrationRepository = new IntegrationRepository();
const subscriberId = '12345';

describe('Initialize Session - /widgets/session/initialize (POST)', async () => {
  let session: UserSession;
  let invalidateCache: InvalidateCacheService;

  before(async () => {
    const cacheInMemoryProviderService = new CacheInMemoryProviderService();
    const cacheService = new CacheService(cacheInMemoryProviderService);
    await cacheService.initialize();
    invalidateCache = new InvalidateCacheService(cacheService);
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    await setHmacConfig(subscriberId, session, invalidateCache);
  });

  it('should create a valid app session for current widget user', async function () {
    const secretKey = session.environment.apiKeys[0].key;
    const hmacHash = createHash(secretKey, subscriberId);

    const firstName = 'Test';
    const lastName = 'User';
    const phone = '054777777';

    const result = await session.testAgent.post('/v1/widgets/session/initialize').send({
      applicationIdentifier: session.environment.identifier,
      subscriberId,
      firstName,
      lastName,
      email: 'test@example.com',
      phone,
      hmacHash,
    });

    const { body } = result;

    expect(body.data.token).to.be.ok;
    expect(body.data.profile._id).to.be.ok;
    expect(body.data.profile.firstName).to.equal(firstName);
    expect(body.data.profile.lastName).to.equal(lastName);
    expect(body.data.profile.phone).to.equal(phone);
  });

  it('should throw an error when an invalid environment Id passed', async function () {
    const { body } = await session.testAgent.post('/v1/widgets/session/initialize').send({
      applicationIdentifier: 'some-not-existing-id',
      subscriberId,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '054777777',
    });

    expect(body.message).to.contain('Please provide a valid app identifier');
  });

  it('should pass the test with valid HMAC hash', async function () {
    const secretKey = session.environment.apiKeys[0].key;

    const hmacHash = createHash(secretKey, subscriberId);
    const response = await initWidgetSession(subscriberId, session, hmacHash);

    expect(response.status).to.equal(201);
  });

  it('should fail the test with invalid subscriber id', async function () {
    const validSecretKey = session.environment.apiKeys[0].key;

    const invalidSubscriberId = `invalid-suscriberId`;
    const validSubscriberHmacHash = createHash(validSecretKey, subscriberId);
    const responseInvalidSubscriberId = await initWidgetSession(invalidSubscriberId, session, validSubscriberHmacHash);

    expect(responseInvalidSubscriberId.body?.data?.profile).to.not.exist;
    expect(responseInvalidSubscriberId.body.message).to.contain('Please provide a valid HMAC hash');
  });

  it('should fail the test with invalid secret key', async function () {
    const validSecretKey = session.environment.apiKeys[0].key;

    const invalidSecretKey = 'invalid-secret-key';
    const invalidSubscriberHmacHash = createHash(invalidSecretKey, subscriberId);

    const responseInvalidSecretKey = await initWidgetSession(subscriberId, session, invalidSubscriberHmacHash);

    expect(responseInvalidSecretKey.body?.data?.profile).to.not.exist;
    expect(responseInvalidSecretKey.body.message).to.contain('Please provide a valid HMAC hash');
  });

  it('should pass api key migration regression tests', async function () {
    const validSecretKey = session.environment.apiKeys[0].key;

    const invalidSubscriberHmacHash = createHash(validSecretKey, subscriberId);

    await encryptApiKeysMigration();

    const response = await initWidgetSession(subscriberId, session, invalidSubscriberHmacHash);

    expect(response.status).to.equal(201);
  });
});

async function initWidgetSession(subscriberIdentifier: string, session, hmacHash?: string) {
  return await session.testAgent.post('/v1/widgets/session/initialize').send({
    applicationIdentifier: session.environment.identifier,
    subscriberId: subscriberIdentifier,
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    phone: '054777777',
    hmacHash,
  });
}

async function setHmacConfig(userId: string, session: UserSession, invalidateCache: InvalidateCacheService) {
  await invalidateCache.invalidateQuery({
    key: buildIntegrationKey().invalidate({
      _organizationId: session.organization._id,
    }),
  });

  const command = {
    environmentId: session.environment._id,
    userId,
    providerId: InAppProviderIdEnum.Novu,
    channel: ChannelTypeEnum.IN_APP,
  };

  await invalidateCache.invalidateByKey({
    key: buildIntegrationKey().cache({
      _organizationId: session.organization._id,
      ...command,
    }),
  });

  const result = await integrationRepository.update(
    {
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: InAppProviderIdEnum.Novu,
      channel: ChannelTypeEnum.IN_APP,
      active: true,
    },
    {
      $set: {
        'credentials.hmac': true,
      },
    }
  );

  expect(result.matched).to.equal(1);
  expect(result.modified).to.equal(1);
}
