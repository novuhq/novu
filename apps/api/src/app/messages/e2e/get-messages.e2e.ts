import { SubscribersService, UserSession } from '@novu/testing';
import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { expect } from 'chai';
import { Novu } from '@novu/api';
import { ChannelTypeEnum } from '@novu/api/models/components';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get Message - /messages (GET) #novu-v2', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  let novuClient: Novu;
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
    novuClient = initNovuClassSdk(session);
  });

  it('should fetch existing messages', async function () {
    const subscriber2 = await subscriberService.createSubscriber();
    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [
        { subscriberId: subscriber.subscriberId, email: 'gg@ff.com' },
        { subscriberId: subscriber2.subscriberId, email: 'john@doe.com' },
      ],
      payload: {
        email: 'new-test-email@gmail.com',
        firstName: 'Testing of User Name',
        urlVar: '/test/url/path',
      },
    });

    await session.awaitRunningJobs(template._id);

    let response = await novuClient.messages.retrieve({});
    expect(response.result.data.length).to.be.equal(4);

    response = await novuClient.messages.retrieve({ channel: ChannelTypeEnum.Email });
    expect(response.result.data.length).to.be.equal(2);

    response = await novuClient.messages.retrieve({ subscriberId: subscriber2.subscriberId });
    expect(response.result.data.length).to.be.equal(2);
  });

  it('should fetch messages using transactionId filter', async function () {
    const subscriber3 = await subscriberService.createSubscriber();

    const transactionId1 = '1566f9d0-6037-48c1-b356-42667921cadd';
    const transactionId2 = 'd2d9f9b5-4a96-403a-927f-1f8f40c6c7a9';

    await triggerEventWithTransactionId(template.triggers[0].identifier, subscriber3.subscriberId, transactionId1);
    await triggerEventWithTransactionId(template.triggers[0].identifier, subscriber3.subscriberId, transactionId2);
    await triggerEventWithTransactionId(template.triggers[0].identifier, subscriber3.subscriberId, transactionId1);

    await session.awaitRunningJobs(template._id);

    let response = await novuClient.messages.retrieve({ subscriberId: subscriber3.subscriberId });
    // here we are expecting 6 messages because workflow has 2 steps in-app and email
    expect(response.result.data.length).to.be.equal(6);
    response = await novuClient.messages.retrieve({ transactionId: [transactionId1] });
    expect(response.result.data.length).to.be.equal(4);

    response = await novuClient.messages.retrieve({ transactionId: [transactionId1, transactionId2] });
    expect(response.result.data.length).to.be.equal(6);

    response = await novuClient.messages.retrieve({ transactionId: [transactionId2] });
    expect(response.result.data.length).to.be.equal(2);
  });

  async function triggerEventWithTransactionId(
    templateIdentifier: string,
    subscriberId: string,
    transactionId: string
  ) {
    return await novuClient.trigger({
      workflowId: templateIdentifier,
      to: [{ subscriberId, email: 'gg@ff.com' }],
      payload: {},
      transactionId,
    });
  }
});
