import { MessageRepository, NotificationTemplateEntity, SubscriberRepository, JobRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { subDays } from 'date-fns';

describe('Get activity stats - /notifications/stats (GET)', async () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  const messageRepository = new MessageRepository();
  const jobRepository = new JobRepository();
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

    await session.awaitRunningJobs(template._id);

    const existing = await messageRepository.find(
      {
        _environmentId: session.environment._id,
      } as any,
      null,
      { limit: 2 }
    );

    await messageRepository._model.updateMany(
      {
        _id: existing.map((i) => i._id),
      },
      {
        $set: {
          createdAt: subDays(new Date(), 12),
        },
      },
      {
        multi: true,
        timestamps: false,
      }
    );

    const {
      body: { data },
    } = await session.testAgent.get('/v1/notifications/stats');

    expect(data.weeklySent).to.equal(2);
    expect(data.monthlySent).to.equal(2);
  });
});
