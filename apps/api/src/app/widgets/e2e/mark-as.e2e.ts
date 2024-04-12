import { MessageRepository, NotificationTemplateEntity, SubscriberRepository, MessageEntity } from '@novu/dal';
import { UserSession } from '@novu/testing';
import axios from 'axios';
import { ChannelTypeEnum } from '@novu/shared';
import { expect } from 'chai';

describe('Mark as Seen - /widgets/messages/markAs (POST)', async () => {
  const messageRepository = new MessageRepository();
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriberId;

  before(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberId = SubscriberRepository.createObjectId();
    template = await session.createTemplate();
  });

  it('should change the seen status', async function () {
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

    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.awaitRunningJobs(template._id);
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
});
