import {
  buildIntegrationKey,
  CacheInMemoryProviderService,
  CacheService,
  createHash,
  InvalidateCacheService,
} from '@novu/application-generic';
import { IntegrationRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum, InAppProviderIdEnum, SeverityLevelEnum, StepTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { randomBytes } from 'crypto';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

const integrationRepository = new IntegrationRepository();
const mockSubscriberId = '12345';
const isNotificationSeverityEnabled = process.env.IS_NOTIFICATION_SEVERITY_ENABLED;

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
    // @ts-ignore
    process.env.IS_NOTIFICATION_SEVERITY_ENABLED = 'true';
  });

  afterEach(() => {
    // @ts-ignore
    process.env.IS_NOTIFICATION_SEVERITY_ENABLED = isNotificationSeverityEnabled;
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

  it('should return severity-based unread counts in session', async () => {
    await setIntegrationConfig(
      {
        _environmentId: session.environment._id,
        _organizationId: session.environment._organizationId,
        hmac: false,
      },
      invalidateCache
    );

    const novuClient = initNovuClassSdk(session);

    // Create templates with different severities
    const highSeverityTemplate = await session.createTemplate({
      noFeedId: true,
      severity: SeverityLevelEnum.HIGH,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'High severity notification',
        },
      ],
    });

    const mediumSeverityTemplate = await session.createTemplate({
      noFeedId: true,
      severity: SeverityLevelEnum.MEDIUM,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Medium severity notification',
        },
      ],
    });

    const lowSeverityTemplate = await session.createTemplate({
      noFeedId: true,
      severity: SeverityLevelEnum.LOW,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Low severity notification',
        },
      ],
    });

    // Trigger notifications with different severities
    await novuClient.trigger({
      workflowId: highSeverityTemplate.triggers[0].identifier,
      to: { subscriberId: mockSubscriberId },
    });

    await novuClient.trigger({
      workflowId: mediumSeverityTemplate.triggers[0].identifier,
      to: { subscriberId: mockSubscriberId },
    });

    await novuClient.trigger({
      workflowId: lowSeverityTemplate.triggers[0].identifier,
      to: { subscriberId: mockSubscriberId },
    });

    // Wait for jobs to complete
    await session.waitForJobCompletion(highSeverityTemplate._id);
    await session.waitForJobCompletion(mediumSeverityTemplate._id);
    await session.waitForJobCompletion(lowSeverityTemplate._id);

    // Initialize session and check severity counts
    const { body, status } = await initializeSession({
      applicationIdentifier: session.environment.identifier,
      subscriberId: mockSubscriberId,
    });

    expect(status).to.equal(201);
    expect(body.data.token).to.be.ok;
    expect(body.data.totalUnreadCount).to.equal(3);
    expect(body.data.unreadCount).to.exist;
    expect(body.data.unreadCount.total).to.equal(3);
    expect(body.data.unreadCount.severity).to.exist;
    expect(body.data.unreadCount.severity.high).to.equal(1);
    expect(body.data.unreadCount.severity.medium).to.equal(1);
    expect(body.data.unreadCount.severity.low).to.equal(1);
    expect(body.data.unreadCount.severity.none).to.equal(0);
  });

  it('should return correct severity counts when no notifications exist', async () => {
    await setIntegrationConfig(
      {
        _environmentId: session.environment._id,
        _organizationId: session.environment._organizationId,
        hmac: false,
      },
      invalidateCache
    );

    const { body, status } = await session.testAgent.post('/v1/inbox/session').send({
      applicationIdentifier: session.environment.identifier,
      subscriberId: session.subscriberId,
    });

    expect(status).to.equal(201);
    expect(body.data.unreadCount).to.exist;
    expect(body.data.unreadCount.total).to.equal(0);
    expect(body.data.unreadCount.severity).to.exist;
    expect(body.data.unreadCount.severity.high).to.equal(0);
    expect(body.data.unreadCount.severity.medium).to.equal(0);
    expect(body.data.unreadCount.severity.low).to.equal(0);
    expect(body.data.unreadCount.severity.none).to.equal(0);
  });

  it('should return correct severity counts with mixed read/unread notifications', async () => {
    await setIntegrationConfig(
      {
        _environmentId: session.environment._id,
        _organizationId: session.environment._organizationId,
        hmac: false,
      },
      invalidateCache
    );

    const novuClient = initNovuClassSdk(session);

    const highSeverityTemplate = await session.createTemplate({
      noFeedId: true,
      severity: SeverityLevelEnum.HIGH,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'High severity notification',
        },
      ],
    });

    const mediumSeverityTemplate = await session.createTemplate({
      noFeedId: true,
      severity: SeverityLevelEnum.MEDIUM,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Medium severity notification',
        },
      ],
    });

    // Trigger multiple notifications of each severity
    await novuClient.trigger({
      workflowId: highSeverityTemplate.triggers[0].identifier,
      to: { subscriberId: session.subscriberId },
    });
    await novuClient.trigger({
      workflowId: highSeverityTemplate.triggers[0].identifier,
      to: { subscriberId: session.subscriberId },
    });
    await novuClient.trigger({
      workflowId: mediumSeverityTemplate.triggers[0].identifier,
      to: { subscriberId: session.subscriberId },
    });

    await session.waitForJobCompletion(highSeverityTemplate._id);
    await session.waitForJobCompletion(mediumSeverityTemplate._id);

    // Mark one high severity notification as read
    const { body: notifications } = await session.testAgent
      .get('/v1/inbox/notifications')
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    const highSeverityNotification = notifications.data.find((n: any) => n.severity === SeverityLevelEnum.HIGH);
    await session.testAgent
      .patch(`/v1/inbox/notifications/${highSeverityNotification.id}/read`)
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    const { body, status } = await session.testAgent.post('/v1/inbox/session').send({
      applicationIdentifier: session.environment.identifier,
      subscriberId: session.subscriberId,
    });

    expect(status).to.equal(201);
    expect(body.data.unreadCount).to.exist;
    expect(body.data.unreadCount.total).to.equal(2); // 1 unread high + 1 unread medium
    expect(body.data.unreadCount.severity).to.exist;
    expect(body.data.unreadCount.severity.high).to.equal(1); // 1 unread
    expect(body.data.unreadCount.severity.medium).to.equal(1);
    expect(body.data.unreadCount.severity.low).to.equal(0);
    expect(body.data.unreadCount.severity.none).to.equal(0);
  });

  it('should maintain backward compatibility with totalUnreadCount', async () => {
    await setIntegrationConfig(
      {
        _environmentId: session.environment._id,
        _organizationId: session.environment._organizationId,
        hmac: false,
      },
      invalidateCache
    );

    const novuClient = initNovuClassSdk(session);

    const highSeverityTemplate = await session.createTemplate({
      noFeedId: true,
      severity: SeverityLevelEnum.HIGH,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'High severity notification',
        },
      ],
    });

    await novuClient.trigger({
      workflowId: highSeverityTemplate.triggers[0].identifier,
      to: { subscriberId: session.subscriberId },
    });

    await session.waitForJobCompletion(highSeverityTemplate._id);

    const { body } = await session.testAgent.post('/v1/inbox/session').send({
      applicationIdentifier: session.environment.identifier,
      subscriberId: session.subscriberId,
    });

    // Both fields should exist and match for backward compatibility
    expect(body.data.totalUnreadCount).to.be.a('number');
    expect(body.data.unreadCount.total).to.be.a('number');
    expect(body.data.totalUnreadCount).to.equal(body.data.unreadCount.total);
  });

  it('should handle notifications with no severity (none)', async () => {
    await setIntegrationConfig(
      {
        _environmentId: session.environment._id,
        _organizationId: session.environment._organizationId,
        hmac: false,
      },
      invalidateCache
    );

    const novuClient = initNovuClassSdk(session);

    // Create template without severity (defaults to none)
    const noSeverityTemplate = await session.createTemplate({
      noFeedId: true,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Notification without explicit severity',
        },
      ],
    });

    await novuClient.trigger({
      workflowId: noSeverityTemplate.triggers[0].identifier,
      to: { subscriberId: session.subscriberId },
    });

    await session.waitForJobCompletion(noSeverityTemplate._id);

    const { body, status } = await session.testAgent.post('/v1/inbox/session').send({
      applicationIdentifier: session.environment.identifier,
      subscriberId: session.subscriberId,
    });

    expect(status).to.equal(201);
    expect(body.data.unreadCount).to.exist;
    expect(body.data.unreadCount.total).to.equal(1);
    expect(body.data.unreadCount.severity).to.exist;
    expect(body.data.unreadCount.severity.high).to.equal(0);
    expect(body.data.unreadCount.severity.medium).to.equal(0);
    expect(body.data.unreadCount.severity.low).to.equal(0);
    expect(body.data.unreadCount.severity.none).to.equal(1);
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
