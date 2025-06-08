import { MessageRepository, NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Novu } from '@novu/api';
import { expectSdkExceptionGeneric, initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Delete Messages By TransactionId - /messages/?transactionId= (DELETE) #novu-v2', function () {
  let session: UserSession;
  const messageRepository = new MessageRepository();
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

  it('should fail to delete non existing message', async function () {
    const { error } = await expectSdkExceptionGeneric(() => novuClient.messages.deleteByTransactionId('abc-1234'));
    expect(error?.statusCode).to.equal(404);
    expect(error?.ctx?.error, JSON.stringify(error)).to.equal('Not Found');
  });

  it('should delete messages by transactionId', async function () {
    await novuClient.subscribers.create({
      subscriberId: '123456',
      firstName: 'broadcast ',
      lastName: 'subscriber',
    });

    const res = await novuClient.triggerBroadcast({
      name: template.triggers[0].identifier,
      payload: {
        email: 'new-test-email@gmail.com',
        firstName: 'Testing of User Name',
        urlVar: '/test/url/path',
      },
    });
    await session.waitForJobCompletion(template._id);

    const { transactionId } = res.result;

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      transactionId,
    });

    expect(messages.length).to.be.greaterThan(0);
    expect(transactionId).to.be.ok;

    if (transactionId == null) {
      throw new Error('must have transaction id');
    }
    await novuClient.messages.deleteByTransactionId(transactionId);

    const result = await messageRepository.find({
      transactionId,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    expect(result.length).to.equal(0);
  });

  it('should delete messages by transactionId and channel', async function () {
    const response = await novuClient.triggerBroadcast({
      name: template.triggers[0].identifier,
      payload: {
        email: 'new-test-email@gmail.com',
        firstName: 'Testing of User Name',
        urlVar: '/test/url/path',
      },
    });

    await session.waitForJobCompletion(template._id);
    const { transactionId } = response.result;

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      transactionId,
    });

    const emailMessages = messages.filter((message) => message.channel === ChannelTypeEnum.EMAIL);
    const inAppMessages = messages.filter((message) => message.channel === ChannelTypeEnum.IN_APP);
    const inAppMessagesCount = inAppMessages.length;

    expect(messages.length).to.be.greaterThan(0);
    expect(emailMessages.length).to.be.greaterThan(0);
    expect(inAppMessagesCount).to.be.greaterThan(0);
    expect(transactionId).to.be.ok;
    if (transactionId == null) {
      throw new Error('must have transaction id');
    }
    await novuClient.messages.deleteByTransactionId(transactionId, ChannelTypeEnum.EMAIL);

    const result = await messageRepository.find({
      transactionId,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    const emailResult = result.filter((message) => message.channel === ChannelTypeEnum.EMAIL);
    const inAppResult = result.filter((message) => message.channel === ChannelTypeEnum.IN_APP);
    const inAppResultCount = inAppResult.length;

    expect(result.length).to.be.greaterThan(0);
    expect(emailResult.length).to.equal(0);
    expect(inAppResultCount).to.be.greaterThan(0);
    expect(inAppResultCount).to.equal(inAppMessagesCount);
  });
});
