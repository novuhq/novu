import { MessageRepository, NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import * as moment from 'moment';

describe('Get activity stats - /activity/stats (GET)', async () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  const messageRepository = new MessageRepository();
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

  it('should retrieve last month and last week activity', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId, {
      firstName: 'Test',
    });

    await session.triggerEvent(template.triggers[0].identifier, subscriberId, {
      firstName: 'Test',
    });

    const existing = await messageRepository.find(
      {
        _environmentId: session.environment._id,
      },
      null,
      { limit: 2 }
    );

    await messageRepository._model.updateMany(
      {
        _id: existing.map((i) => i._id),
      },
      {
        $set: {
          createdAt: moment().subtract(12, 'days').toDate(),
        },
      },
      {
        multi: true,
        timestamps: false,
      }
    );

    await session.sleep(7000);

    const {
      body: { data },
    } = await session.testAgent.get('/v1/activity/stats');

    expect(data.weeklySent).to.equal(2);
    expect(data.monthlySent).to.equal(4);
  });
});
