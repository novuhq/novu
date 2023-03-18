import { expect } from 'chai';
import { getDayOfYear, getYear } from 'date-fns';
import { UserSession } from '@novu/testing';
import { NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';

describe('Get activity feed graph stats - /notifications/graph/stats (GET)', async () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriberId: string;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate();
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

  it('should return the empty stats if there were no triggers', async function () {
    const { body } = await session.testAgent.get('/v1/notifications/graph/stats');

    const stats = body.data;

    expect(stats.length).to.equal(0);
  });

  it('should get the current activity feed graph stats', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId, {
      firstName: 'Test',
    });

    await session.triggerEvent(template.triggers[0].identifier, subscriberId, {
      firstName: 'Test',
    });

    await session.awaitRunningJobs(template._id);
    const { body } = await session.testAgent.get('/v1/notifications/graph/stats');
    const stats = body.data;

    expect(stats.length).to.equal(2);
    expect(stats[0]._id.year).to.equal(getYear(new Date()));
    expect(stats[0]._id.day).to.equal(getDayOfYear(new Date()));
    expect(stats[0].count).to.equal(2);
  });
});
