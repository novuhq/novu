import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, InAppProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { CacheInMemoryProviderService, CacheService, createHash } from '@novu/application-generic';

const integrationRepository = new IntegrationRepository();
const mockSubscriberId = '12345';

describe('Session - /inbox/session (POST)', async () => {
  let session: UserSession;
  let cacheService: CacheService;

  before(async () => {
    const cacheInMemoryProviderService = new CacheInMemoryProviderService();
    cacheService = new CacheService(cacheInMemoryProviderService);
    await cacheService.initialize();
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    await setIntegrationConfig(
      {
        _environmentId: session.environment._id,
        _organizationId: session.environment._organizationId,
      },
      cacheService
    );
  });

  const initializeSession = async ({
    applicationIdentifier,
    subscriberId,
    subscriberHash,
  }: {
    applicationIdentifier: string;
    subscriberId: string;
    subscriberHash?: string;
  }) => {
    return await session.testAgent.post('/v1/inbox/session').send({
      applicationIdentifier,
      subscriberId,
      subscriberHash,
    });
  };

  it('should initialize session', async function () {
    await setIntegrationConfig(
      {
        _environmentId: session.environment._id,
        _organizationId: session.environment._organizationId,
        hmac: false,
      },
      cacheService
    );
    const { body, status } = await initializeSession({
      applicationIdentifier: session.environment.identifier,
      subscriberId: mockSubscriberId,
    });

    expect(status).to.equal(201);
    expect(body.data.token).to.be.ok;
    expect(body.data.totalUnreadCount).to.equal(0);
  });

  it('should initialize session with HMAC', async function () {
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

  it('should throw an error when invalid applicationIdentifier provided', async function () {
    const { body, status } = await initializeSession({
      applicationIdentifier: 'some-not-existing-id',
      subscriberId: mockSubscriberId,
    });

    expect(status).to.equal(400);
    expect(body.message).to.contain('Please provide a valid application identifier');
  });

  it('should throw an error when no active integrations', async function () {
    await setIntegrationConfig(
      {
        _environmentId: session.environment._id,
        _organizationId: session.environment._organizationId,
        active: false,
      },
      cacheService
    );

    const { body, status } = await initializeSession({
      applicationIdentifier: session.environment.identifier,
      subscriberId: mockSubscriberId,
    });

    expect(status).to.equal(404);
    expect(body.message).to.contain('The active in-app integration could not be found');
  });

  it('should throw an error when invalid subscriberHash provided', async function () {
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
});

async function setIntegrationConfig(
  {
    _environmentId,
    _organizationId,
    hmac = true,
    active = true,
  }: { _environmentId: string; _organizationId: string; active?: boolean; hmac?: boolean },
  cacheService: CacheService
) {
  await cacheService.delByPattern('*');

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
