import { IntegrationRepository, SubscriberRepository } from '@novu/dal';
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
import { randomBytes } from 'crypto';

const integrationRepository = new IntegrationRepository();
const mockSubscriberId = '12345';

describe('Session - /inbox/session (POST) #novu-v2', async () => {
  let session: UserSession;
  let cacheService: CacheService;
  let invalidateCache: InvalidateCacheService;
  let subscriberRepository: SubscriberRepository;

  before(async () => {
    const cacheInMemoryProviderService = new CacheInMemoryProviderService();
    cacheService = new CacheService(cacheInMemoryProviderService);
    await cacheService.initialize();
    invalidateCache = new InvalidateCacheService(cacheService);
    subscriberRepository = new SubscriberRepository();
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    await setIntegrationConfig(
      {
        _environmentId: session.environment._id,
        _organizationId: session.environment._organizationId,
      },
      invalidateCache
    );
  });

  const initializeSession = async ({
    applicationIdentifier,
    subscriberId,
    subscriberHash,
    subscriber,
    origin,
  }: {
    applicationIdentifier: string;
    subscriberId?: string;
    subscriberHash?: string;
    subscriber?: Record<string, unknown>;
    origin?: string;
  }) => {
    const request = session.testAgent.post('/v1/inbox/session');

    if (origin) {
      request.set('origin', origin);
    }

    return await request.send({
      applicationIdentifier,
      subscriberId,
      subscriberHash,
      subscriber,
    });
  };

  it('should initialize session', async () => {
    await setIntegrationConfig(
      {
        _environmentId: session.environment._id,
        _organizationId: session.environment._organizationId,
        hmac: false,
      },
      invalidateCache
    );
    const { body, status } = await initializeSession({
      applicationIdentifier: session.environment.identifier,
      subscriberId: mockSubscriberId,
    });

    expect(status).to.equal(201);
    expect(body.data.token).to.be.ok;
    expect(body.data.totalUnreadCount).to.equal(0);
  });

  it('should initialize session with HMAC', async () => {
    const secretKey = session.environment.apiKeys[0].key;
    const subscriberHash = createHash(secretKey, mockSubscriberId);

    const { body, status } = await initializeSession({
      applicationIdentifier: session.environment.identifier,
      subscriberId: mockSubscriberId,
      subscriberHash,
    });

    expect(status).to.equal(201);
    expect(body.data.token).to.be.ok;
    expect(body.data.totalUnreadCount).to.equal(0);
  });

  it('should initialize session with subscriber object', async () => {
    await setIntegrationConfig(
      {
        _environmentId: session.environment._id,
        _organizationId: session.environment._organizationId,
        hmac: false,
      },
      invalidateCache
    );

    const subscriber = {
      subscriberId: mockSubscriberId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    };

    const { body, status } = await initializeSession({
      applicationIdentifier: session.environment.identifier,
      subscriber,
    });

    expect(status).to.equal(201);
    expect(body.data.token).to.be.ok;
    expect(body.data.totalUnreadCount).to.equal(0);
  });

  it('should create a new subscriber if it does not exist', async () => {
    await setIntegrationConfig(
      {
        _environmentId: session.environment._id,
        _organizationId: session.environment._organizationId,
        hmac: false,
      },
      invalidateCache
    );
    const subscriberId = `user-subscriber-id-${`${randomBytes(4).toString('hex')}`}`;

    const newRandomSubscriber = {
      subscriberId,
      firstName: 'Mike',
      lastName: 'Tyson',
      email: 'mike@example.com',
    };

    const res = await initializeSession({
      applicationIdentifier: session.environment.identifier,
      subscriber: newRandomSubscriber,
    });

    const { status, body } = res;

    expect(status).to.equal(201);
    expect(body.data.token).to.be.ok;
    expect(body.data.totalUnreadCount).to.equal(0);

    const storedSubscriber = await subscriberRepository.findBySubscriberId(session.environment._id, subscriberId);
    expect(storedSubscriber).to.exist;
    if (!storedSubscriber) {
      throw new Error('Subscriber exists but was not found');
    }

    expect(storedSubscriber.firstName).to.equal(newRandomSubscriber.firstName);
    expect(storedSubscriber.lastName).to.equal(newRandomSubscriber.lastName);
    expect(storedSubscriber.email).to.equal(newRandomSubscriber.email);
  });

  it('should upsert a subscriber', async () => {
    await setIntegrationConfig(
      {
        _environmentId: session.environment._id,
        _organizationId: session.environment._organizationId,
        hmac: false,
      },
      invalidateCache
    );
    const subscriberId = `user-subscriber-id-${`${randomBytes(4).toString('hex')}`}`;

    const newRandomSubscriber = {
      subscriberId,
      firstName: 'Mike',
      lastName: 'Tyson',
      email: 'mike@example.com',
    };

    const { body, status } = await initializeSession({
      applicationIdentifier: session.environment.identifier,
      subscriber: newRandomSubscriber,
    });

    expect(status).to.equal(201);
    expect(body.data.token).to.be.ok;
    expect(body.data.totalUnreadCount).to.equal(0);

    const storedSubscriber = await subscriberRepository.findBySubscriberId(session.environment._id, subscriberId);
    expect(storedSubscriber).to.exist;
    if (!storedSubscriber) {
      throw new Error('Subscriber exists but was not found');
    }

    expect(storedSubscriber.firstName).to.equal(newRandomSubscriber.firstName);
    expect(storedSubscriber.lastName).to.equal(newRandomSubscriber.lastName);
    expect(storedSubscriber.email).to.equal(newRandomSubscriber.email);

    const updatedSubscriber = {
      subscriberId,
      firstName: 'Mike 2',
      lastName: 'Tyson 2',
      email: 'mike2@example.com',
    };

    const secretKey = session.environment.apiKeys[0].key;
    const subscriberHash = createHash(secretKey, subscriberId);
    const { body: updatedBody, status: updatedStatus } = await initializeSession({
      applicationIdentifier: session.environment.identifier,
      subscriber: updatedSubscriber,
      subscriberHash,
    });

    expect(updatedStatus).to.equal(201);
    expect(updatedBody.data.token).to.be.ok;
    expect(updatedBody.data.totalUnreadCount).to.equal(0);

    const updatedStoredSubscriber = await subscriberRepository.findBySubscriberId(
      session.environment._id,
      subscriberId
    );
    expect(updatedStoredSubscriber).to.exist;
    if (!updatedStoredSubscriber) {
      throw new Error('Subscriber exists but was not found');
    }

    expect(updatedStoredSubscriber.firstName).to.equal(updatedSubscriber.firstName);
    expect(updatedStoredSubscriber.lastName).to.equal(updatedSubscriber.lastName);
    expect(updatedStoredSubscriber.email).to.equal(updatedSubscriber.email);

    const { body: upsertWithoutHmac, status: upsertedStatusWithoutHmac } = await initializeSession({
      applicationIdentifier: session.environment.identifier,
      subscriber: {
        subscriberId,
        firstName: 'Mike 3',
        lastName: 'Tyson 3',
        email: 'mike3@example.com',
      },
    });

    expect(upsertedStatusWithoutHmac).to.equal(201);
    expect(upsertWithoutHmac.data.token).to.be.ok;
    expect(upsertWithoutHmac.data.totalUnreadCount).to.equal(0);

    const updatedStoredSubscriber2 = await subscriberRepository.findBySubscriberId(
      session.environment._id,
      subscriberId
    );
    expect(updatedStoredSubscriber2).to.exist;
    if (!updatedStoredSubscriber2) {
      throw new Error('Subscriber exists but was not found');
    }

    expect(updatedStoredSubscriber2.firstName).to.not.equal('Mike 3');
    expect(updatedStoredSubscriber2.lastName).to.not.equal('Tyson 3');
    expect(updatedStoredSubscriber2.email).to.not.equal('mike3@example.com');
  });

  it('should initialize session with origin header', async () => {
    await setIntegrationConfig(
      {
        _environmentId: session.environment._id,
        _organizationId: session.environment._organizationId,
        hmac: false,
      },
      invalidateCache
    );

    const origin = 'https://example.com';
    const { body, status } = await initializeSession({
      applicationIdentifier: session.environment.identifier,
      subscriberId: mockSubscriberId,
      origin,
    });

    expect(status).to.equal(201);
    expect(body.data.token).to.be.ok;
    expect(body.data.totalUnreadCount).to.equal(0);
  });

  it('should throw an error when invalid applicationIdentifier provided', async () => {
    const { body, status } = await initializeSession({
      applicationIdentifier: 'some-not-existing-id',
      subscriberId: mockSubscriberId,
    });

    expect(status).to.equal(400);
    expect(body.message).to.contain('Please provide a valid application identifier');
  });

  it('should throw an error when no active integrations', async () => {
    await setIntegrationConfig(
      {
        _environmentId: session.environment._id,
        _organizationId: session.environment._organizationId,
        active: false,
      },
      invalidateCache
    );

    const { body, status } = await initializeSession({
      applicationIdentifier: session.environment.identifier,
      subscriberId: mockSubscriberId,
    });

    expect(status).to.equal(404);
    expect(body.message).to.contain('The active in-app integration could not be found');
  });

  it('should throw an error when invalid subscriberHash provided', async () => {
    const invalidSecretKey = 'invalid-secret-key';
    const subscriberHash = createHash(invalidSecretKey, mockSubscriberId);

    const { body, status } = await initializeSession({
      applicationIdentifier: session.environment.identifier,
      subscriberId: session.subscriberId,
      subscriberHash,
    });

    expect(status).to.equal(400);
    expect(body.message).to.contain('Please provide a valid HMAC hash');
  });

  it('should throw an error when subscriber object is missing subscriberId', async () => {
    await setIntegrationConfig(
      {
        _environmentId: session.environment._id,
        _organizationId: session.environment._organizationId,
        hmac: false,
      },
      invalidateCache
    );
    const subscriber = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    };

    const { body, status } = await initializeSession({
      applicationIdentifier: session.environment.identifier,
      subscriber,
    });

    expect(status).to.equal(422);
    expect(body.message).to.contain('Validation Error');
  });
});

async function setIntegrationConfig(
  {
    _environmentId,
    _organizationId,
    hmac = true,
    active = true,
  }: { _environmentId: string; _organizationId: string; active?: boolean; hmac?: boolean },
  invalidateCache: InvalidateCacheService
) {
  await invalidateCache.invalidateQuery({
    key: buildIntegrationKey().invalidate({
      _organizationId,
    }),
  });

  await integrationRepository.update(
    {
      _environmentId,
      _organizationId,
      providerId: InAppProviderIdEnum.Novu,
      channel: ChannelTypeEnum.IN_APP,
      active: true,
    },
    {
      $set: {
        'credentials.hmac': hmac,
        active,
      },
    }
  );
}
