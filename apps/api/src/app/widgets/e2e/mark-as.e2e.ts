import { Novu } from '@novu/api';
import { MessageEntity, MessageRepository, NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Mark as Seen - /widgets/messages/markAs (POST) #novu-v0', async () => {
  const messageRepository = new MessageRepository();
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriberId;
  let novuClient: Novu;
  before(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberId = SubscriberRepository.createObjectId();
    template = await session.createTemplate();
    novuClient = initNovuClassSdk(session);
  });

  it('should change the seen status', async () => {
    const { body } = await session.testAgent
      .post('/v1/widgets/session/initialize')
      .send({
        applicationIdentifier: session.environment.identifier,
        subscriberId,
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      })
      .expect(201);

    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await session.waitForJobCompletion(template._id);
    const { token } = body.data;
    const messages = await messageRepository.findBySubscriberChannel(
      session.environment._id,
      body.data.profile._id,
      ChannelTypeEnum.IN_APP
    );
    const messageId = messages[0]._id;

    expect(messages[0].seen).to.equal(false);
    await axios.post(
      `http://127.0.0.1:${process.env.PORT}/v1/widgets/messages/markAs`,
      { messageId, mark: { seen: true } },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const modifiedMessage = (await messageRepository.findOne({
      _id: messageId,
      _environmentId: session.environment._id,
    })) as MessageEntity;

    expect(modifiedMessage.seen).to.equal(true);
    expect(modifiedMessage.lastSeenDate).to.be.ok;
  });

  it('should not leak another subscribers message via markAs response', async () => {
    const attackerSubscriberId = SubscriberRepository.createObjectId();
    const victimSubscriberId = SubscriberRepository.createObjectId();

    const attackerInit = await session.testAgent
      .post('/v1/widgets/session/initialize')
      .send({
        applicationIdentifier: session.environment.identifier,
        subscriberId: attackerSubscriberId,
        firstName: 'Attacker',
        lastName: 'User',
        email: 'attacker@example.com',
      })
      .expect(201);
    const attackerToken = attackerInit.body.data.token;

    const victimInit = await session.testAgent
      .post('/v1/widgets/session/initialize')
      .send({
        applicationIdentifier: session.environment.identifier,
        subscriberId: victimSubscriberId,
        firstName: 'Victim',
        lastName: 'User',
        email: 'victim@example.com',
      })
      .expect(201);
    const victimInternalId = victimInit.body.data.profile._id;

    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: attackerSubscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: victimSubscriberId });
    await session.waitForJobCompletion(template._id);

    const victimMessages = await messageRepository.findBySubscriberChannel(
      session.environment._id,
      victimInternalId,
      ChannelTypeEnum.IN_APP
    );
    const victimMessageId = victimMessages[0]._id;

    expect(victimMessages[0].seen).to.equal(false);

    const response = await axios.post(
      `http://127.0.0.1:${process.env.PORT}/v1/widgets/messages/markAs`,
      { messageId: victimMessageId, mark: { seen: true } },
      {
        headers: {
          Authorization: `Bearer ${attackerToken}`,
        },
      }
    );

    expect(response.data.data).to.be.an('array').that.is.empty;

    const victimMessageAfter = (await messageRepository.findOne({
      _id: victimMessageId,
      _environmentId: session.environment._id,
    })) as MessageEntity;

    expect(victimMessageAfter.seen).to.equal(false);
    expect(victimMessageAfter.lastSeenDate).to.be.not.ok;
  });
});
