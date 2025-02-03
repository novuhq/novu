import { expect } from 'chai';
import { format } from 'date-fns';
import { UserSession } from '@novu/testing';
import { NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { Novu } from '@novu/api';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get activity feed graph stats - /notifications/graph/stats (GET) #novu-v2', async () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriberId: string;
  let novuClient: Novu;
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate();
    subscriberId = SubscriberRepository.createObjectId();
    novuClient = initNovuClassSdk(session);
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
    const body = await novuClient.notifications.stats.graph();

    const stats = body.result;

    expect(stats.length).to.equal(0);
  });

  it('should get the current activity feed graph stats', async function () {
    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: subscriberId,
      payload: { firstName: 'Test' },
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: subscriberId,
      payload: { firstName: 'Test' },
    });

    await session.awaitRunningJobs(template._id);
    const body = await novuClient.notifications.stats.graph();

    const stats = body.result;

    expect(stats.length).to.equal(1);
    expect(stats[0].id).to.equal(format(new Date(), 'yyyy-MM-dd'));
    expect(stats[0].count).to.equal(4);
    expect(stats[0].channels).to.include.oneOf(Object.keys(ChannelTypeEnum).map((i) => ChannelTypeEnum[i]));
    expect(stats[0].templates).to.include(template._id);
  });
});
