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
  const isSubscribersScheduleEnabled = process.env.IS_SUBSCRIBERS_SCHEDULE_ENABLED;

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
    // @ts-expect-error
    process.env.IS_NOTIFICATION_SEVERITY_ENABLED = 'true';
    // @ts-expect-error
    process.env.IS_SUBSCRIBERS_SCHEDULE_ENABLED = 'true';
  });

  afterEach(() => {
    // @ts-expect-error
    process.env.IS_NOTIFICATION_SEVERITY_ENABLED = isNotificationSeverityEnabled;
    // @ts-expect-error
    process.env.IS_SUBSCRIBERS_SCHEDULE_ENABLED = isSubscribersScheduleEnabled;
  });

  const initializeSession = async ({
    applicationIdentifier,
    subscriberId,
    subscriberHash,
    subscriber,
    origin,
    defaultSchedule,
  }: {
    applicationIdentifier: string;
    subscriberId?: string;
    subscriberHash?: string;
    subscriber?: Record<string, unknown>;
    origin?: string;
    defaultSchedule?: Record<string, unknown>;
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
      defaultSchedule,
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

  describe('defaultSchedule functionality', () => {
    it('should initialize session with valid defaultSchedule', async () => {
      await setIntegrationConfig(
        {
          _environmentId: session.environment._id,
          _organizationId: session.environment._organizationId,
          hmac: false,
        },
        invalidateCache
      );

      const defaultSchedule = {
        isEnabled: true,
        weeklySchedule: {
          monday: {
            isEnabled: true,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }],
          },
          tuesday: {
            isEnabled: true,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }],
          },
          wednesday: {
            isEnabled: true,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }],
          },
          thursday: {
            isEnabled: true,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }],
          },
          friday: {
            isEnabled: true,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }],
          },
        },
      };

      const { body, status } = await initializeSession({
        applicationIdentifier: session.environment.identifier,
        subscriberId: `schedule-test-${randomBytes(4).toString('hex')}`,
        subscriber: {
          subscriberId: `schedule-test-${randomBytes(4).toString('hex')}`,
          firstName: 'Schedule',
          lastName: 'Test',
        },
        defaultSchedule,
      });

      expect(status).to.equal(201);
      expect(body.data.token).to.be.ok;
      expect(body.data.schedule).to.exist;
      expect(body.data.schedule.isEnabled).to.equal(true);
      expect(body.data.schedule.weeklySchedule).to.exist;
      expect(body.data.schedule.weeklySchedule.monday.isEnabled).to.equal(true);
      expect(body.data.schedule.weeklySchedule.monday.hours[0].start).to.equal('09:00 AM');
      expect(body.data.schedule.weeklySchedule.monday.hours[0].end).to.equal('05:00 PM');
      expect(body.data.schedule.weeklySchedule.tuesday.isEnabled).to.equal(true);
      expect(body.data.schedule.weeklySchedule.tuesday.hours[0].start).to.equal('09:00 AM');
      expect(body.data.schedule.weeklySchedule.tuesday.hours[0].end).to.equal('05:00 PM');
    });

    it('should initialize session with defaultSchedule when isEnabled is false', async () => {
      await setIntegrationConfig(
        {
          _environmentId: session.environment._id,
          _organizationId: session.environment._organizationId,
          hmac: false,
        },
        invalidateCache
      );

      const defaultSchedule = {
        isEnabled: false,
      };

      const { body, status } = await initializeSession({
        applicationIdentifier: session.environment.identifier,
        subscriberId: `schedule-disabled-${randomBytes(4).toString('hex')}`,
        defaultSchedule,
      });

      expect(status).to.equal(201);
      expect(body.data.token).to.be.ok;
      expect(body.data.schedule).to.exist;
      expect(body.data.schedule.isEnabled).to.equal(false);
      expect(body.data.schedule.weeklySchedule).to.not.exist;
    });

    it('should create schedule with isEnabled true when weeklySchedule is not provided', async () => {
      await setIntegrationConfig(
        {
          _environmentId: session.environment._id,
          _organizationId: session.environment._organizationId,
          hmac: false,
        },
        invalidateCache
      );

      const defaultSchedule = {
        isEnabled: true,
      };

      const { body, status } = await initializeSession({
        applicationIdentifier: session.environment.identifier,
        subscriberId: `schedule-enabled-only-${randomBytes(4).toString('hex')}`,
        defaultSchedule,
      });

      expect(status).to.equal(201);
      expect(body.data.token).to.be.ok;
      expect(body.data.schedule).to.exist;
      expect(body.data.schedule.isEnabled).to.equal(true);
      expect(body.data.schedule.weeklySchedule).to.not.exist;
    });

    it('should fail validation when isEnabled is true but weeklySchedule is empty', async () => {
      await setIntegrationConfig(
        {
          _environmentId: session.environment._id,
          _organizationId: session.environment._organizationId,
          hmac: false,
        },
        invalidateCache
      );

      const defaultSchedule = {
        isEnabled: true,
        weeklySchedule: {},
      };

      const { body, status } = await initializeSession({
        applicationIdentifier: session.environment.identifier,
        subscriberId: `schedule-empty-${randomBytes(4).toString('hex')}`,
        defaultSchedule,
      });

      expect(status).to.equal(422);
      expect(body.message).to.equal('Validation Error');
      expect(body.errors).to.exist;
      expect(body.errors.general).to.exist;
      expect(body.errors.general.messages).to.be.an('array');
      expect(body.errors.general.messages[0]).to.contain(
        'weeklySchedule must contain at least one day configuration when isEnabled is true'
      );
    });

    it('should fail validation with invalid time format', async () => {
      await setIntegrationConfig(
        {
          _environmentId: session.environment._id,
          _organizationId: session.environment._organizationId,
          hmac: false,
        },
        invalidateCache
      );

      const defaultSchedule = {
        isEnabled: true,
        weeklySchedule: {
          monday: {
            isEnabled: true,
            hours: [{ start: '25:00', end: '17:00' }], // Invalid 24-hour format
          },
        },
      };

      const { body, status } = await initializeSession({
        applicationIdentifier: session.environment.identifier,
        subscriberId: `schedule-invalid-time-${randomBytes(4).toString('hex')}`,
        defaultSchedule,
      });

      expect(status).to.equal(422);
      expect(body.message).to.equal('Validation Error');
      expect(body.errors).to.exist;
      expect(body.errors.general).to.exist;
      expect(body.errors.general.messages).to.be.an('array');
      expect(body.errors.general.messages.some((msg: string) => msg.includes('must be in 12-hour format'))).to.be.true;
    });

    it('should fail validation with invalid day name', async () => {
      await setIntegrationConfig(
        {
          _environmentId: session.environment._id,
          _organizationId: session.environment._organizationId,
          hmac: false,
        },
        invalidateCache
      );

      const defaultSchedule = {
        isEnabled: true,
        weeklySchedule: {
          invalidDay: {
            isEnabled: true,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }],
          },
        },
      };

      const { body, status } = await initializeSession({
        applicationIdentifier: session.environment.identifier,
        subscriberId: `schedule-invalid-day-${randomBytes(4).toString('hex')}`,
        defaultSchedule,
      });

      expect(status).to.equal(422);
      expect(body.message).to.equal('Validation Error');
      expect(body.errors).to.exist;
      expect(body.errors.general).to.exist;
      expect(body.errors.general.messages).to.be.an('array');
      expect(body.errors.general.messages[0]).to.contain('weeklySchedule contains invalid day names');
    });

    it('should not set defaultSchedule when subscriber already has a schedule', async () => {
      await setIntegrationConfig(
        {
          _environmentId: session.environment._id,
          _organizationId: session.environment._organizationId,
          hmac: false,
        },
        invalidateCache
      );

      const subscriberId = `existing-schedule-${randomBytes(4).toString('hex')}`;

      // First, create a subscriber with a schedule
      const existingSchedule = {
        isEnabled: true,
        weeklySchedule: {
          monday: {
            isEnabled: true,
            hours: [{ start: '08:00 AM', end: '04:00 PM' }],
          },
        },
      };

      await initializeSession({
        applicationIdentifier: session.environment.identifier,
        subscriberId,
        defaultSchedule: existingSchedule,
      });

      // Now try to set a different defaultSchedule
      const newDefaultSchedule = {
        isEnabled: true,
        weeklySchedule: {
          tuesday: {
            isEnabled: true,
            hours: [{ start: '10:00 AM', end: '06:00 PM' }],
          },
        },
      };

      const { body, status } = await initializeSession({
        applicationIdentifier: session.environment.identifier,
        subscriberId,
        defaultSchedule: newDefaultSchedule,
      });

      expect(status).to.equal(201);
      expect(body.data.token).to.be.ok;
      expect(body.data.schedule).to.exist;
      expect(body.data.schedule.weeklySchedule.monday).to.exist; // Should keep existing schedule
      expect(body.data.schedule.weeklySchedule.tuesday).to.not.exist; // Should not use new defaultSchedule
    });

    it('should handle multiple time ranges in a day', async () => {
      await setIntegrationConfig(
        {
          _environmentId: session.environment._id,
          _organizationId: session.environment._organizationId,
          hmac: false,
        },
        invalidateCache
      );

      const defaultSchedule = {
        isEnabled: true,
        weeklySchedule: {
          monday: {
            isEnabled: true,
            hours: [
              { start: '09:00 AM', end: '12:00 PM' },
              { start: '01:00 PM', end: '05:00 PM' },
            ],
          },
        },
      };

      const { body, status } = await initializeSession({
        applicationIdentifier: session.environment.identifier,
        subscriberId: `multiple-ranges-${randomBytes(4).toString('hex')}`,
        defaultSchedule,
      });

      expect(status).to.equal(201);
      expect(body.data.token).to.be.ok;
      expect(body.data.schedule).to.exist;
      expect(body.data.schedule.weeklySchedule.monday.hours).to.have.length(2);
      expect(body.data.schedule.weeklySchedule.monday.hours[0].start).to.equal('09:00 AM');
      expect(body.data.schedule.weeklySchedule.monday.hours[0].end).to.equal('12:00 PM');
      expect(body.data.schedule.weeklySchedule.monday.hours[1].start).to.equal('01:00 PM');
      expect(body.data.schedule.weeklySchedule.monday.hours[1].end).to.equal('05:00 PM');
    });

    it('should handle different time formats (with/without leading zero)', async () => {
      await setIntegrationConfig(
        {
          _environmentId: session.environment._id,
          _organizationId: session.environment._organizationId,
          hmac: false,
        },
        invalidateCache
      );

      const defaultSchedule = {
        isEnabled: true,
        weeklySchedule: {
          monday: {
            isEnabled: true,
            hours: [{ start: '9:00 AM', end: '5:00 PM' }], // Without leading zero
          },
          tuesday: {
            isEnabled: true,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }], // With leading zero
          },
        },
      };

      const { body, status } = await initializeSession({
        applicationIdentifier: session.environment.identifier,
        subscriberId: `time-format-${randomBytes(4).toString('hex')}`,
        defaultSchedule,
      });

      expect(status).to.equal(201);
      expect(body.data.token).to.be.ok;
      expect(body.data.schedule).to.exist;
      expect(body.data.schedule.weeklySchedule.monday.hours[0].start).to.equal('9:00 AM');
      expect(body.data.schedule.weeklySchedule.tuesday.hours[0].start).to.equal('09:00 AM');
    });

    it('should not create schedule when feature flag is disabled', async () => {
      // Disable the feature flag
      // @ts-expect-error process.env is not typed
      process.env.IS_SUBSCRIBERS_SCHEDULE_ENABLED = 'false';

      await setIntegrationConfig(
        {
          _environmentId: session.environment._id,
          _organizationId: session.environment._organizationId,
          hmac: false,
        },
        invalidateCache
      );

      const defaultSchedule = {
        isEnabled: true,
        weeklySchedule: {
          monday: {
            isEnabled: true,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }],
          },
        },
      };

      const { body, status } = await initializeSession({
        applicationIdentifier: session.environment.identifier,
        subscriberId: `feature-flag-disabled-${randomBytes(4).toString('hex')}`,
        defaultSchedule,
      });

      expect(status).to.equal(201);
      expect(body.data.token).to.be.ok;
      expect(body.data.schedule).to.not.exist;

      // Re-enable the feature flag for other tests
      // @ts-expect-error process.env is not typed
      process.env.IS_SUBSCRIBERS_SCHEDULE_ENABLED = 'true';
    });
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
