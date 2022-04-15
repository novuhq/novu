import { NotificationTemplateEntity } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ChannelTypeEnum, IMessage } from '@novu/shared';

describe('Get activity feed - /activity (GET)', async () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let smsOnlyTemplate: NotificationTemplateEntity;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate();
    smsOnlyTemplate = await session.createChannelTemplate(ChannelTypeEnum.SMS);
    await session.testAgent
      .post('/v1/widgets/session/initialize')
      .send({
        applicationIdentifier: session.environment.identifier,
        $user_id: '12345',
        $first_name: 'Test',
        $last_name: 'User',
        $email: 'test@example.com',
      })
      .expect(201);
  });

  it('should get the current activity feed of user', async function () {
    await session.triggerEvent(template.triggers[0].identifier, '12345', {
      firstName: 'Test',
    });

    await session.triggerEvent(template.triggers[0].identifier, '12345', {
      firstName: 'Test',
    });

    const { body } = await session.testAgent.get('/v1/activity?page=0');

    const activities = body.data;

    expect(body.totalCount).to.equal(4);
    expect(activities.length).to.equal(4);
    expect(activities[0].template.name).to.equal(template.name);
    expect(activities[0].template._id).to.equal(template._id);
    expect(activities[0].subscriber.firstName).to.equal('Test');
    expect(activities[0].channel).to.be.oneOf(Object.keys(ChannelTypeEnum).map((i) => ChannelTypeEnum[i]));
  });

  it('should filter by channel', async function () {
    await session.triggerEvent(template.triggers[0].identifier, '12345', {
      firstName: 'Test',
    });

    await session.triggerEvent(smsOnlyTemplate.triggers[0].identifier, '12345', {
      firstName: 'Test',
    });

    await session.triggerEvent(smsOnlyTemplate.triggers[0].identifier, '12345', {
      firstName: 'Test',
    });

    const { body } = await session.testAgent.get(`/v1/activity?page=0&channels=${ChannelTypeEnum.SMS}`);
    const activities: IMessage[] = body.data;

    expect(activities.length).to.equal(2);
    expect(activities[0].channel).to.equal(ChannelTypeEnum.SMS);
    expect(activities[0].template.name).to.equal(smsOnlyTemplate.name);
  });

  it('should filter by templateId', async function () {
    await session.triggerEvent(smsOnlyTemplate.triggers[0].identifier, '12345', {
      payload: {
        firstName: 'Test',
      },
    });

    await session.triggerEvent(template.triggers[0].identifier, '12345', {
      firstName: 'Test',
    });

    await session.triggerEvent(template.triggers[0].identifier, '12345', {
      firstName: 'Test',
    });

    const { body } = await session.testAgent.get(`/v1/activity?page=0&templates=${template._id}`);
    const activities: IMessage[] = body.data;

    expect(activities.length).to.equal(4);
    expect(activities[0]._templateId).to.equal(template._id);
    expect(activities[1]._templateId).to.equal(template._id);
    expect(activities[2]._templateId).to.equal(template._id);
    expect(activities[3]._templateId).to.equal(template._id);
  });

  it('should filter by email', async function () {
    await session.triggerEvent(
      smsOnlyTemplate.triggers[0].identifier,
      {
        subscriberId: '1234522',
        email: 'test@email.coms',
      },
      {
        firstName: 'Test',
      }
    );

    await session.triggerEvent(template.triggers[0].identifier, '1234564', {
      firstName: 'Test',
    });

    await session.triggerEvent(
      template.triggers[0].identifier,
      {
        subscriberId: '123452',
      },
      {
        firstName: 'Test',
      }
    );

    await session.triggerEvent(
      template.triggers[0].identifier,
      {
        subscriberId: '12345',
      },
      {
        firstName: 'Test',
      }
    );

    const { body } = await session.testAgent.get(`/v1/activity?page=0&search=test@email.coms`);
    const activities: IMessage[] = body.data;

    expect(activities.length).to.equal(1);
    expect(activities[0]._templateId).to.equal(smsOnlyTemplate._id);
  });
});
