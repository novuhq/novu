import { PreferencesRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum, PreferencesTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { run } from './preferences-uniqueness-migration';

describe('Preferences Uniqueness Migration #novu-v2', () => {
  let session: UserSession;
  const preferencesRepository = new PreferencesRepository();
  const subscriberRepository = new SubscriberRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    await cleanupPreferences();
    await cleanupSubscribers();
  });

  async function cleanupPreferences() {
    await preferencesRepository._model.deleteMany({});
  }

  async function cleanupSubscribers() {
    await subscriberRepository._model.deleteMany({});
  }

  it('should remove duplicate subscriber global preferences and keep the oldest', async () => {
    const subscriber = await subscriberRepository.create({
      subscriberId: '123',
      firstName: 'first_subscriber',
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    const oldestDate = new Date('2024-01-01');
    const middleDate = new Date('2024-01-02');
    const newestDate = new Date('2024-01-03');

    const oldest = await preferencesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _subscriberId: subscriber._id,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
      preferences: {
        channels: {
          [ChannelTypeEnum.EMAIL]: { enabled: true },
        },
      },
    });

    await preferencesRepository._model.findByIdAndUpdate(oldest._id, { updatedAt: oldestDate });

    const duplicate1 = await preferencesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _subscriberId: subscriber._id,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
      preferences: {
        channels: {
          [ChannelTypeEnum.EMAIL]: { enabled: false },
        },
      },
    });

    await preferencesRepository._model.findByIdAndUpdate(duplicate1._id, { updatedAt: middleDate });

    const duplicate2 = await preferencesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _subscriberId: subscriber._id,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
      preferences: {
        channels: {
          [ChannelTypeEnum.SMS]: { enabled: true },
        },
      },
    });

    await preferencesRepository._model.findByIdAndUpdate(duplicate2._id, { updatedAt: newestDate });

    const beforeCount = await preferencesRepository.count({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    });

    expect(beforeCount).to.equal(3);

    await run();

    const afterCount = await preferencesRepository.count({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    });

    expect(afterCount).to.equal(1);

    const remaining = await preferencesRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    });

    expect(remaining?._id).to.equal(oldest._id);
  });

  it('should remove duplicate subscriber workflow preferences and keep the oldest', async () => {
    const subscriber = await subscriberRepository.create({
      subscriberId: '123',
      firstName: 'first_subscriber',
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });
    const workflow = await session.createTemplate();

    await preferencesRepository._model.deleteMany({
      _templateId: workflow._id,
    });

    const oldestDate = new Date('2024-01-01');
    const newestDate = new Date('2024-01-03');

    const oldest = await preferencesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _subscriberId: subscriber._id,
      _templateId: workflow._id,
      type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
      preferences: {
        channels: {
          [ChannelTypeEnum.EMAIL]: { enabled: true },
        },
      },
    });

    await preferencesRepository._model.findByIdAndUpdate(oldest._id, { updatedAt: oldestDate });

    const duplicate = await preferencesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _subscriberId: subscriber._id,
      _templateId: workflow._id,
      type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
      preferences: {
        channels: {
          [ChannelTypeEnum.EMAIL]: { enabled: false },
        },
      },
    });

    await preferencesRepository._model.findByIdAndUpdate(duplicate._id, { updatedAt: newestDate });

    const beforeCount = await preferencesRepository.count({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      _templateId: workflow._id,
      type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    });

    expect(beforeCount).to.equal(2);

    await run();

    const afterCount = await preferencesRepository.count({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      _templateId: workflow._id,
      type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    });

    expect(afterCount).to.equal(1);

    const remaining = await preferencesRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      _templateId: workflow._id,
      type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    });

    expect(remaining?._id).to.equal(oldest._id);
  });

  it('should remove duplicate user workflow preferences and keep the oldest', async () => {
    const workflow = await session.createTemplate();

    await preferencesRepository._model.deleteMany({
      _templateId: workflow._id,
    });

    const oldestDate = new Date('2024-01-01');
    const newestDate = new Date('2024-01-03');

    const oldest = await preferencesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _userId: session.user._id,
      _templateId: workflow._id,
      type: PreferencesTypeEnum.USER_WORKFLOW,
      preferences: {
        channels: {
          [ChannelTypeEnum.EMAIL]: { enabled: true },
        },
      },
    });

    await preferencesRepository._model.findByIdAndUpdate(oldest._id, { updatedAt: oldestDate });

    const duplicate = await preferencesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _userId: session.user._id,
      _templateId: workflow._id,
      type: PreferencesTypeEnum.USER_WORKFLOW,
      preferences: {
        channels: {
          [ChannelTypeEnum.EMAIL]: { enabled: false },
        },
      },
    });

    await preferencesRepository._model.findByIdAndUpdate(duplicate._id, { updatedAt: newestDate });

    const beforeCount = await preferencesRepository.count({
      _environmentId: session.environment._id,
      _templateId: workflow._id,
      type: PreferencesTypeEnum.USER_WORKFLOW,
    });

    expect(beforeCount).to.equal(2);

    await run();

    const afterCount = await preferencesRepository.count({
      _environmentId: session.environment._id,
      _templateId: workflow._id,
      type: PreferencesTypeEnum.USER_WORKFLOW,
    });

    expect(afterCount).to.equal(1);

    const remaining = await preferencesRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: workflow._id,
      type: PreferencesTypeEnum.USER_WORKFLOW,
    });

    expect(remaining?._id).to.equal(oldest._id);
  });

  it('should remove duplicate workflow resource preferences and keep the oldest', async () => {
    const workflow = await session.createTemplate();

    await preferencesRepository._model.deleteMany({
      _templateId: workflow._id,
    });

    const oldestDate = new Date('2024-01-01');
    const newestDate = new Date('2024-01-03');

    const oldest = await preferencesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _templateId: workflow._id,
      type: PreferencesTypeEnum.WORKFLOW_RESOURCE,
      preferences: {
        channels: {
          [ChannelTypeEnum.EMAIL]: { enabled: true },
        },
      },
    });

    await preferencesRepository._model.findByIdAndUpdate(oldest._id, { updatedAt: oldestDate });

    const duplicate = await preferencesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _templateId: workflow._id,
      type: PreferencesTypeEnum.WORKFLOW_RESOURCE,
      preferences: {
        channels: {
          [ChannelTypeEnum.EMAIL]: { enabled: false },
        },
      },
    });

    await preferencesRepository._model.findByIdAndUpdate(duplicate._id, { updatedAt: newestDate });

    const beforeCount = await preferencesRepository.count({
      _environmentId: session.environment._id,
      _templateId: workflow._id,
      type: PreferencesTypeEnum.WORKFLOW_RESOURCE,
    });

    expect(beforeCount).to.equal(2);

    await run();

    const afterCount = await preferencesRepository.count({
      _environmentId: session.environment._id,
      _templateId: workflow._id,
      type: PreferencesTypeEnum.WORKFLOW_RESOURCE,
    });

    expect(afterCount).to.equal(1);

    const remaining = await preferencesRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: workflow._id,
      type: PreferencesTypeEnum.WORKFLOW_RESOURCE,
    });

    expect(remaining?._id).to.equal(oldest._id);
  });

  it('should not affect unique preferences without duplicates', async () => {
    const subscriber1 = await subscriberRepository.create({
      subscriberId: '123',
      firstName: 'first_subscriber',
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });
    const subscriber2 = await subscriberRepository.create({
      subscriberId: '345',
      firstName: 'second_subscriber',
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });
    const workflow = await session.createTemplate();

    await preferencesRepository._model.deleteMany({
      _templateId: workflow._id,
    });

    await preferencesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _subscriberId: subscriber1._id,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
      preferences: {
        channels: {
          [ChannelTypeEnum.EMAIL]: { enabled: true },
        },
      },
    });

    await preferencesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _subscriberId: subscriber2._id,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
      preferences: {
        channels: {
          [ChannelTypeEnum.EMAIL]: { enabled: true },
        },
      },
    });

    await preferencesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _subscriberId: subscriber1._id,
      _templateId: workflow._id,
      type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
      preferences: {
        channels: {
          [ChannelTypeEnum.EMAIL]: { enabled: true },
        },
      },
    });

    const beforeCount = await preferencesRepository.count({
      _environmentId: session.environment._id,
    });

    expect(beforeCount).to.equal(3);

    await run();

    const afterCount = await preferencesRepository.count({
      _environmentId: session.environment._id,
    });

    expect(afterCount).to.equal(3);
  });

  it('should handle multiple duplicate groups independently', async () => {
    const subscriber1 = await subscriberRepository.create({
      subscriberId: '123',
      firstName: 'first_subscriber',
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });
    const subscriber2 = await subscriberRepository.create({
      subscriberId: '345',
      firstName: 'second_subscriber',
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    const oldestDate1 = new Date('2024-01-01');
    const newestDate1 = new Date('2024-01-03');
    const oldestDate2 = new Date('2024-02-01');
    const newestDate2 = new Date('2024-02-03');

    const oldest1 = await preferencesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _subscriberId: subscriber1._id,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
      preferences: {
        channels: {
          [ChannelTypeEnum.EMAIL]: { enabled: true },
        },
      },
    });

    await preferencesRepository._model.findByIdAndUpdate(oldest1._id, { updatedAt: oldestDate1 });

    const duplicate1 = await preferencesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _subscriberId: subscriber1._id,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
      preferences: {
        channels: {
          [ChannelTypeEnum.EMAIL]: { enabled: false },
        },
      },
    });

    await preferencesRepository._model.findByIdAndUpdate(duplicate1._id, { updatedAt: newestDate1 });

    const oldest2 = await preferencesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _subscriberId: subscriber2._id,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
      preferences: {
        channels: {
          [ChannelTypeEnum.SMS]: { enabled: true },
        },
      },
    });

    await preferencesRepository._model.findByIdAndUpdate(oldest2._id, { updatedAt: oldestDate2 });

    const duplicate2 = await preferencesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _subscriberId: subscriber2._id,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
      preferences: {
        channels: {
          [ChannelTypeEnum.SMS]: { enabled: false },
        },
      },
    });

    await preferencesRepository._model.findByIdAndUpdate(duplicate2._id, { updatedAt: newestDate2 });

    const beforeCount = await preferencesRepository.count({
      _environmentId: session.environment._id,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    });

    expect(beforeCount).to.equal(4);

    await run();

    const afterCount = await preferencesRepository.count({
      _environmentId: session.environment._id,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    });

    expect(afterCount).to.equal(2);

    const remaining1 = await preferencesRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber1._id,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    });

    expect(remaining1?._id).to.equal(oldest1._id);

    const remaining2 = await preferencesRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber2._id,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    });

    expect(remaining2?._id).to.equal(oldest2._id);
  });

  it('should handle mixed scenarios with duplicates across different preference types', async () => {
    const subscriber = await subscriberRepository.create({
      subscriberId: '123',
      firstName: 'first_subscriber',
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });
    const workflow1 = await session.createTemplate();
    const workflow2 = await session.createTemplate();

    await preferencesRepository._model.deleteMany({
      _templateId: { $in: [workflow1._id, workflow2._id] },
    });

    const oldestDate = new Date('2024-01-01');
    const newestDate = new Date('2024-01-03');

    const globalOldest = await preferencesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _subscriberId: subscriber._id,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
      preferences: {
        channels: {
          [ChannelTypeEnum.EMAIL]: { enabled: true },
        },
      },
    });

    await preferencesRepository._model.findByIdAndUpdate(globalOldest._id, { updatedAt: oldestDate });

    const globalDuplicate = await preferencesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _subscriberId: subscriber._id,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
      preferences: {
        channels: {
          [ChannelTypeEnum.EMAIL]: { enabled: false },
        },
      },
    });

    await preferencesRepository._model.findByIdAndUpdate(globalDuplicate._id, { updatedAt: newestDate });

    const workflowOldest = await preferencesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _subscriberId: subscriber._id,
      _templateId: workflow1._id,
      type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
      preferences: {
        channels: {
          [ChannelTypeEnum.EMAIL]: { enabled: true },
        },
      },
    });

    await preferencesRepository._model.findByIdAndUpdate(workflowOldest._id, { updatedAt: oldestDate });

    const workflowDuplicate = await preferencesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _subscriberId: subscriber._id,
      _templateId: workflow1._id,
      type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
      preferences: {
        channels: {
          [ChannelTypeEnum.EMAIL]: { enabled: false },
        },
      },
    });

    await preferencesRepository._model.findByIdAndUpdate(workflowDuplicate._id, { updatedAt: newestDate });

    await preferencesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _subscriberId: subscriber._id,
      _templateId: workflow2._id,
      type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
      preferences: {
        channels: {
          [ChannelTypeEnum.EMAIL]: { enabled: true },
        },
      },
    });

    const beforeCount = await preferencesRepository.count({
      _environmentId: session.environment._id,
    });

    expect(beforeCount).to.equal(5);

    await run();

    const afterCount = await preferencesRepository.count({
      _environmentId: session.environment._id,
    });

    expect(afterCount).to.equal(3);

    const globalRemaining = await preferencesRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    });

    expect(globalRemaining?._id).to.equal(globalOldest._id);

    const workflowRemaining = await preferencesRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      _templateId: workflow1._id,
      type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    });

    expect(workflowRemaining?._id).to.equal(workflowOldest._id);

    const workflow2Count = await preferencesRepository.count({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      _templateId: workflow2._id,
      type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    });

    expect(workflow2Count).to.equal(1);
  });
});
