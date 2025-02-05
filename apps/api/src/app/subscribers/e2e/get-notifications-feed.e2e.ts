import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';
import { Novu } from '@novu/api';
import { expectSdkExceptionGeneric, initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get Notifications feed - /:subscriberId/notifications/feed (GET) #novu-v2', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriberId: string;
  let novuClient: Novu;
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);

    template = await session.createTemplate({
      noFeedId: false,
    });

    subscriberId = SubscriberRepository.createObjectId();
  });

  it('should throw exception on invalid subscriber id', async function () {
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });

    await session.awaitRunningJobs(template._id);

    const notificationsFeedResponse = (await novuClient.subscribers.notifications.feed({ limit: 5, subscriberId }))
      .result;
    expect(notificationsFeedResponse.pageSize).to.equal(5);
    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.subscribers.notifications.feed({
        subscriberId: `${subscriberId}111`,
        seen: false,
        limit: 5,
      })
    );
    expect(error).to.be.ok;
    expect(error?.statusCode).to.equals(400);
    expect(error?.message).to.eq(
      `Subscriber not found for this environment with the id: ${`${subscriberId}111`}. Make sure to create a subscriber before fetching the feed.`
    );
  });

  it('should throw exception when invalid payload query param is passed', async function () {
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });

    await session.awaitRunningJobs(template._id);

    const { error: err } = await expectSdkExceptionGeneric(() =>
      novuClient.subscribers.notifications.feed({
        limit: 5,
        payload: 'invalid',
        subscriberId,
      })
    );
    expect(err?.statusCode).to.equals(400);
    expect(err?.message).to.eq(`Invalid payload, the JSON object should be encoded to base64 string.`);
  });

  it('should allow filtering by custom data from the payload', async function () {
    const partialPayload = { foo: 123 };
    const payload = { ...partialPayload, bar: 'bar' };

    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await session.awaitRunningJobs(template._id);

    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId, payload });
    await session.awaitRunningJobs(template._id);

    const payloadQueryValue = Buffer.from(JSON.stringify(partialPayload)).toString('base64');
    const { data } = (
      await novuClient.subscribers.notifications.feed({ limit: 5, payload: payloadQueryValue, subscriberId })
    ).result;

    expect(data.length).to.equal(1);
    expect(data[0].payload).to.deep.equal(payload);
  });

  it('should allow filtering by custom nested data from the payload', async function () {
    const partialPayload = { foo: { bar: 123 } };
    const payload = { ...partialPayload, baz: 'baz' };

    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await session.awaitRunningJobs(template._id);

    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId, payload });
    await session.awaitRunningJobs(template._id);

    const payloadQueryValue = Buffer.from(JSON.stringify(partialPayload)).toString('base64');
    const { data } = (
      await novuClient.subscribers.notifications.feed({
        limit: 5,
        payload: payloadQueryValue,
        subscriberId,
      })
    ).result;

    expect(data.length).to.equal(1);
    expect(data[0].payload).to.deep.equal(payload);
  });
});
