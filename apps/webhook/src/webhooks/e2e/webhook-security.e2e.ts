import { ExecutionDetailsRepository, IntegrationRepository, MessageRepository } from '@novu/dal';
import { ChannelTypeEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import axios from 'axios';
import { expect } from 'chai';

const axiosInstance = axios.create();

const callWebhook = async (
  environmentId: string,
  organizationId: string,
  webhookBody: object,
  headers: Record<string, string> = {}
) => {
  const serverUrl = `http://127.0.0.1:${process.env.PORT}`;

  return axiosInstance.post(
    `${serverUrl}/webhooks/organizations/${organizationId}/environments/${environmentId}/email/sendgrid`,
    webhookBody,
    { headers }
  );
};

const sendgridEvent = (id: unknown) => ({
  email: 'example@test.com',
  timestamp: 1513299569,
  event: 'delivered',
  sg_event_id: 'sg_event_id',
  sg_message_id: 'sg_message_id',
  response: '250 OK',
  attempt: '1',
  id,
});

describe('Email webhook - security', () => {
  const messageRepository = new MessageRepository();
  const integrationRepository = new IntegrationRepository();
  const executionDetailsRepository = new ExecutionDetailsRepository();

  let environmentId: string;
  let organizationId: string;
  let messageId: string;
  let notificationId: string;

  const createSendgridIntegration = (inboundWebhookSigningKey?: string) =>
    integrationRepository.create({
      _environmentId: environmentId,
      _organizationId: organizationId,
      providerId: 'sendgrid',
      channel: ChannelTypeEnum.EMAIL,
      credentials: { apiKey: 'SG.123' },
      ...(inboundWebhookSigningKey ? { configurations: { inboundWebhookSigningKey } } : {}),
      active: true,
    });

  beforeEach(async () => {
    environmentId = MessageRepository.createObjectId();
    organizationId = MessageRepository.createObjectId();
    messageId = MessageRepository.createObjectId();
    notificationId = MessageRepository.createObjectId();

    await messageRepository.create({
      _id: messageId,
      _notificationId: notificationId,
      _environmentId: environmentId,
      _organizationId: organizationId,
      _subscriberId: MessageRepository.createObjectId(),
      _templateId: MessageRepository.createObjectId(),
      _messageTemplateId: MessageRepository.createObjectId(),
      channel: ChannelTypeEnum.EMAIL,
      _feedId: MessageRepository.createObjectId(),
      transactionId: MessageRepository.createObjectId(),
      content: '',
      payload: {},
      templateIdentifier: '',
      identifier: messageId,
    });
  });

  afterEach(() => {
    delete process.env[FeatureFlagsKeysEnum.IS_LEGACY_WEBHOOK_SIGNATURE_VERIFICATION_ENABLED];
  });

  describe('message identifier injection', () => {
    for (const injectedId of [{ $ne: null }, { $regex: '.*' }, { $exists: true }]) {
      it(`should not match a message for identifier ${JSON.stringify(injectedId)}`, async () => {
        await createSendgridIntegration();

        const { status, data } = await callWebhook(environmentId, organizationId, sendgridEvent(injectedId));

        expect(status).to.equal(201);
        expect(data).to.eql([]);

        const executionDetails = await executionDetailsRepository.find({
          _environmentId: environmentId,
          _organizationId: organizationId,
          _notificationId: notificationId,
        });
        expect(executionDetails).to.have.length(0);
      });
    }

    it('should drop injected identifiers but still process valid ones in a batch', async () => {
      await createSendgridIntegration();

      const { data } = await callWebhook(environmentId, organizationId, [
        sendgridEvent({ $ne: null }),
        sendgridEvent(messageId),
      ] as unknown as object);

      expect(data).to.have.length(1);
      expect(data[0].id).to.equal(messageId);
    });
  });

  describe('signature verification', () => {
    const forgedSignatureHeaders = {
      'x-twilio-email-event-webhook-signature': 'forged-signature',
      'x-twilio-email-event-webhook-timestamp': '1513299569',
    };

    it('should keep accepting unverified requests while the flag is off', async () => {
      await createSendgridIntegration('not-a-real-public-key');

      const { status, data } = await callWebhook(
        environmentId,
        organizationId,
        sendgridEvent(messageId),
        forgedSignatureHeaders
      );

      expect(status).to.equal(201);
      expect(data).to.have.length(1);
    });

    it('should reject a request with an invalid signature when the flag is on', async () => {
      process.env[FeatureFlagsKeysEnum.IS_LEGACY_WEBHOOK_SIGNATURE_VERIFICATION_ENABLED] = 'true';
      await createSendgridIntegration('not-a-real-public-key');

      try {
        await callWebhook(environmentId, organizationId, sendgridEvent(messageId), forgedSignatureHeaders);
        expect.fail('should have thrown');
      } catch (error) {
        expect(error.response?.status).to.equal(401);
      }

      const executionDetails = await executionDetailsRepository.find({
        _environmentId: environmentId,
        _organizationId: organizationId,
        _notificationId: notificationId,
      });
      expect(executionDetails).to.have.length(0);
    });

    it('should follow provider semantics for unsigned requests when the flag is on', async () => {
      process.env[FeatureFlagsKeysEnum.IS_LEGACY_WEBHOOK_SIGNATURE_VERIFICATION_ENABLED] = 'true';
      await createSendgridIntegration();

      const { status, data } = await callWebhook(environmentId, organizationId, sendgridEvent(messageId));

      expect(status).to.equal(201);
      expect(data).to.have.length(1);
    });
  });
});
