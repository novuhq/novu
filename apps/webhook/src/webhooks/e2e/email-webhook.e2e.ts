import { IntegrationRepository, MessageRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import axios from 'axios';
import { IEmailEventBody } from '@novu/stateless';
const axiosInstance = axios.create();

describe('Email webhook - /organizations/:organizationId/environments/:environmentId/email/:providerId (POST)', function () {
  const serverUrl = `http://localhost:${process.env.PORT}`;
  const messageRepository = new MessageRepository();
  const integrationRepository = new IntegrationRepository();

  it('should handle webhook', async function () {
    const envId = MessageRepository.createObjectId();
    const orgId = MessageRepository.createObjectId();
    const id = MessageRepository.createObjectId();

    const message = await messageRepository.create({
      _id: id,
      _notificationId: MessageRepository.createObjectId(),
      _environmentId: envId,
      _organizationId: orgId,
      _subscriberId: MessageRepository.createObjectId(),
      _templateId: MessageRepository.createObjectId(),
      _messageTemplateId: MessageRepository.createObjectId(),
      channel: ChannelTypeEnum.EMAIL,
      _feedId: MessageRepository.createObjectId(),
      transactionId: MessageRepository.createObjectId(),
      content: '',
      payload: {},
      templateIdentifier: '',
      identifier: id,
    });

    await integrationRepository.create({
      _environmentId: envId,
      _organizationId: orgId,
      providerId: 'sendgrid',
      channel: ChannelTypeEnum.EMAIL,
      credentials: {
        apiKey: '',
      },
      active: true,
    });

    const webhookBody = {
      email: 'example@test.com',
      timestamp: 1513299569,
      'smtp-id': '<14c5d75ce93.dfd.64b469@ismtpd-555>',
      event: 'delivered',
      ip: '168.1.1.1',
      category: 'cat facts',
      sg_event_id: 'sg_event_id',
      sg_message_id: 'sg_message_id',
      response: '400 try again later',
      attempt: '5',
      id: message._id,
    };

    const { data: body } = await axiosInstance.post(
      `${serverUrl}/webhooks/organizations/${orgId}/environments/${envId}/email/sendgrid`,
      webhookBody
    );

    const event: IEmailEventBody = body[0].event;
    expect(body[0].id).to.equal(webhookBody.id);
    expect(event.externalId).to.equal(webhookBody.id);
    expect(event.attempts).to.equal(5);
    expect(event.response).to.equal('400 try again later');
    expect(event.row).to.eql(webhookBody);
  });
});
