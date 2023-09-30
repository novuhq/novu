import { NotificationEntity, NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ChannelTypeEnum, StepTypeEnum, IMessage } from '@novu/shared';

describe('Get activity feed - /notifications (GET)', async () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let smsOnlyTemplate: NotificationTemplateEntity;
  let subscriberId: string;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate();
    smsOnlyTemplate = await session.createChannelTemplate(StepTypeEnum.SMS);
    subscriberId = SubscriberRepository.createObjectId();
    await session.testAgent
      .post('/v1/widgets/session/initialize')
      .send({
        applicationIdentifier: session.environment.identifier,
        subscriberId,
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      })
      .expect(201);
  });

  it('should get the current activity feed of user', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId, {
      firstName: 'Test',
    });

    await session.triggerEvent(template.triggers[0].identifier, subscriberId, {
      firstName: 'Test',
    });

    await session.awaitRunningJobs(template._id);
    const { body } = await session.testAgent.get('/v1/notifications?page=0');

    const activities = body.data;

    expect(body.hasMore).to.equal(false);
    expect(activities.length).to.equal(2);
    expect(activities[0].template.name).to.equal(template.name);
    expect(activities[0].template._id).to.equal(template._id);
    expect(activities[0].subscriber.firstName).to.equal('Test');
    expect(activities[0].channels).to.include.oneOf(Object.keys(ChannelTypeEnum).map((i) => ChannelTypeEnum[i]));
  });

  it('should filter by channel', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId, {
      firstName: 'Test',
    });

    await session.triggerEvent(smsOnlyTemplate.triggers[0].identifier, subscriberId, {
      firstName: 'Test',
    });

    await session.triggerEvent(smsOnlyTemplate.triggers[0].identifier, subscriberId, {
      firstName: 'Test',
    });

    await session.awaitRunningJobs([template._id, smsOnlyTemplate._id]);

    const { body } = await session.testAgent.get(`/v1/notifications?page=0&channels=${ChannelTypeEnum.SMS}`);
    const activities: NotificationEntity[] = body.data;

    expect(activities.length).to.equal(2);

    const activity = activities[0];

    expect(activity.template?.name).to.equal(smsOnlyTemplate.name);
    expect(activity.channels).to.include(ChannelTypeEnum.SMS);
  });

  it('should filter by templateId', async function () {
    await session.triggerEvent(smsOnlyTemplate.triggers[0].identifier, subscriberId, {
      payload: {
        firstName: 'Test',
      },
    });

    await session.triggerEvent(template.triggers[0].identifier, subscriberId, {
      firstName: 'Test',
    });

    await session.triggerEvent(template.triggers[0].identifier, subscriberId, {
      firstName: 'Test',
    });

    await session.awaitRunningJobs(template._id);
    const { body } = await session.testAgent.get(`/v1/notifications?page=0&templates=${template._id}`);
    const activities: IMessage[] = body.data;

    expect(activities.length).to.equal(2);
    expect(activities[0]._templateId).to.equal(template._id);
    expect(activities[1]._templateId).to.equal(template._id);
  });

  it('should filter by email', async function () {
    await session.triggerEvent(
      template.triggers[0].identifier,
      {
        subscriberId: SubscriberRepository.createObjectId(),
        email: 'test@email.coms',
      },
      {
        firstName: 'Test',
      }
    );

    await session.triggerEvent(template.triggers[0].identifier, SubscriberRepository.createObjectId(), {
      firstName: 'Test',
    });

    await session.triggerEvent(
      template.triggers[0].identifier,
      {
        subscriberId: SubscriberRepository.createObjectId(),
      },
      {
        firstName: 'Test',
      }
    );

    await session.triggerEvent(
      template.triggers[0].identifier,
      {
        subscriberId: subscriberId,
      },
      {
        firstName: 'Test',
      }
    );

    await session.awaitRunningJobs(template._id);

    const { body } = await session.testAgent.get(`/v1/notifications?page=0&emails=test@email.coms`);
    const activities: IMessage[] = body.data;

    expect(activities.length).to.equal(1);
    expect(activities[0]._templateId).to.equal(template._id);
  });

  it('should filter by subscriberId', async function () {
    const subscriberIdToCreate = SubscriberRepository.createObjectId() + 'some-test';

    await session.triggerEvent(
      template.triggers[0].identifier,
      {
        subscriberId: subscriberIdToCreate,
        email: 'test@email.coms',
      },
      {
        firstName: 'Test',
      }
    );

    await session.triggerEvent(template.triggers[0].identifier, SubscriberRepository.createObjectId(), {
      firstName: 'Test',
    });

    await session.triggerEvent(
      template.triggers[0].identifier,
      {
        subscriberId: SubscriberRepository.createObjectId(),
      },
      {
        firstName: 'Test',
      }
    );

    await session.triggerEvent(
      template.triggers[0].identifier,
      {
        subscriberId: subscriberId,
      },
      {
        firstName: 'Test',
      }
    );

    await session.awaitRunningJobs(template._id);

    const { body } = await session.testAgent.get(`/v1/notifications?page=0&subscriberIds=${subscriberIdToCreate}`);
    const activities: IMessage[] = body.data;

    expect(activities.length).to.equal(1);
    expect(activities[0]._templateId).to.equal(template._id);
  });
});
