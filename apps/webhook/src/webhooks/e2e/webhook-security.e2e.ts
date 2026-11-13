import { generateKeyPairSync, sign } from 'node:crypto';
import { ExecutionDetailsRepository, IntegrationRepository, MessageRepository } from '@novu/dal';
import { ChannelTypeEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { EmailEventStatusEnum } from '@novu/stateless';
import axios from 'axios';
import { expect } from 'chai';

const axiosInstance = axios.create();

const callWebhook = async (
  environmentId: string,
  organizationId: string,
  webhookBody: object | string,
  headers: Record<string, string> = {}
) => {
  const serverUrl = `http://127.0.0.1:${process.env.PORT}`;

  return axiosInstance.post(
    `${serverUrl}/webhooks/organizations/${organizationId}/environments/${environmentId}/email/sendgrid`,
    webhookBody,
    { headers: { 'Content-Type': 'application/json', ...headers } }
  );
};

const sendgridEvent = (id: unknown, event = 'delivered') => ({
  email: 'example@test.com',
  timestamp: 1513299569,
  event,
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

    it('should keep each event matched to its own batch entry after dropping one', async () => {
      await createSendgridIntegration();

      const { data } = await callWebhook(environmentId, organizationId, [
        sendgridEvent({ $ne: null }),
        sendgridEvent(messageId, 'delivered'),
        sendgridEvent(messageId, 'open'),
      ] as unknown as object);

      expect(data).to.have.length(2);
      expect(data[0].event.status).to.equal(EmailEventStatusEnum.DELIVERED);
      expect(data[1].event.status).to.equal(EmailEventStatusEnum.OPENED);
    });
  });

  describe('signature verification', () => {
    const forgedSignatureHeaders = {
      'x-twilio-email-event-webhook-signature': 'forged-signature',
      'x-twilio-email-event-webhook-timestamp': '1513299569',
    };

    it('should keep accepting unverified requests when the flag is turned off', async () => {
      process.env[FeatureFlagsKeysEnum.IS_LEGACY_WEBHOOK_SIGNATURE_VERIFICATION_ENABLED] = 'false';
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

    it('should accept a correctly signed request when the flag is on', async () => {
      process.env[FeatureFlagsKeysEnum.IS_LEGACY_WEBHOOK_SIGNATURE_VERIFICATION_ENABLED] = 'true';

      // SendGrid signs `timestamp + raw body` with ECDSA (secp256k1, SHA-256) and publishes the PEM public key.
      const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
      await createSendgridIntegration(publicKey.export({ type: 'spki', format: 'pem' }).toString());

      const rawBody = JSON.stringify([sendgridEvent(messageId)]);
      const timestamp = '1513299569';
      const signature = sign('sha256', Buffer.from(timestamp + rawBody), privateKey).toString('base64');

      const { status, data } = await callWebhook(environmentId, organizationId, rawBody, {
        'x-twilio-email-event-webhook-signature': signature,
        'x-twilio-email-event-webhook-timestamp': timestamp,
      });

      expect(status).to.equal(201);
      expect(data).to.have.length(1);
      expect(data[0].id).to.equal(messageId);

      const executionDetails = await executionDetailsRepository.find({
        _environmentId: environmentId,
        _organizationId: organizationId,
        _notificationId: notificationId,
      });
      expect(executionDetails).to.have.length(1);
    });

    it('should reject a request with an invalid signature by default (flag not set)', async () => {
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

    it('should reject an unsigned request when a signing key is stored and the flag is on', async () => {
      process.env[FeatureFlagsKeysEnum.IS_LEGACY_WEBHOOK_SIGNATURE_VERIFICATION_ENABLED] = 'true';
      const { publicKey } = generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
      await createSendgridIntegration(publicKey.export({ type: 'spki', format: 'pem' }).toString());

      try {
        await callWebhook(environmentId, organizationId, sendgridEvent(messageId));
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

    it('should accept unsigned requests when no signing key is stored and the flag is on', async () => {
      process.env[FeatureFlagsKeysEnum.IS_LEGACY_WEBHOOK_SIGNATURE_VERIFICATION_ENABLED] = 'true';
      await createSendgridIntegration();

      const { status, data } = await callWebhook(environmentId, organizationId, sendgridEvent(messageId));

      expect(status).to.equal(201);
      expect(data).to.have.length(1);
    });
  });
});
