import { PushFactory } from '@novu/application-generic';
import { ChannelTypeEnum, PushProviderIdEnum, TriggerOverrides } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { SendMessageChannelCommand } from './send-message-channel.command';
import {
  isSubscriberError,
  SendMessagePush,
  SUBSCRIBER_ERROR_PATTERNS,
  serializePushProviderError,
} from './send-message-push.usecase';
import { SendMessageStatus } from './send-message-type.usecase';

describe('isSubscriberError', () => {
  for (const pattern of SUBSCRIBER_ERROR_PATTERNS) {
    it(`should return true for error containing "${pattern}"`, () => {
      expect(isSubscriberError(`Sending message failed due to "${pattern}"`)).to.be.true;
    });
  }

  it('should return true when the pattern appears anywhere in the message', () => {
    expect(isSubscriberError('firebase: NotRegistered - token expired')).to.be.true;
  });

  it('should return false for generic provider errors', () => {
    expect(isSubscriberError('Internal server error')).to.be.false;
    expect(isSubscriberError('Connection timeout')).to.be.false;
    expect(isSubscriberError('Rate limit exceeded')).to.be.false;
  });

  it('should return false for empty string', () => {
    expect(isSubscriberError('')).to.be.false;
  });
});

describe('serializePushProviderError', () => {
  it('does not throw when the error object has circular references (e.g. Axios-style)', () => {
    const circular: Record<string, unknown> = { message: 'request failed' };
    circular.self = circular;

    const serialized = serializePushProviderError(circular);
    const parsed = JSON.parse(serialized) as { message?: string; self?: string };

    expect(parsed.message).to.equal('request failed');
    expect(parsed.self).to.equal('[Circular]');
  });

  it('falls back to message and name for plain Error (JSON.stringify yields empty object)', () => {
    const serialized = serializePushProviderError(new Error('boom'));
    const parsed = JSON.parse(serialized) as { message: string; name: string };

    expect(parsed.message).to.equal('boom');
    expect(parsed.name).to.equal('Error');
  });
});

describe('SendMessagePush - provider content overrides', () => {
  const fcmIntegration = {
    _id: '507f1f77bcf86cd799439011',
    identifier: 'fcm-main',
    providerId: PushProviderIdEnum.FCM,
    channel: ChannelTypeEnum.PUSH,
    credentials: {},
  };

  const persistedFcmOverride = {
    data: { orderId: 'persisted-order' },
    android: { priority: 'normal' },
  };

  const fcmChannelWithTokens = {
    _integrationId: fcmIntegration._id,
    providerId: PushProviderIdEnum.FCM,
    credentials: { deviceTokens: ['device-token-1'] },
  };

  const fcmChannelWithEmptyTokens = {
    _integrationId: fcmIntegration._id,
    providerId: PushProviderIdEnum.FCM,
    credentials: { deviceTokens: [] as string[] },
  };

  afterEach(() => {
    sinon.restore();
  });

  function buildUsecase() {
    const usecase = new SendMessagePush(
      {} as never, // subscriberRepository
      {
        create: sinon.stub().resolves({ _id: 'message_1' }),
        update: sinon.stub().resolves(undefined),
      } as never,
      { execute: sinon.stub().resolves(undefined) } as never, // createExecutionDetails
      {} as never, // compileTemplate
      { execute: sinon.stub().resolves(fcmIntegration) } as never, // selectIntegration
      {} as never, // getNovuProviderCredentials
      { execute: sinon.stub().resolves({ messageTemplate: undefined }) } as never, // selectVariant
      {
        get: () => ({
          getTranslationsList: async () => ({ namespaces: [], resources: {}, defaultLocale: 'en' }),
        }),
      } as never,
      { execute: sinon.stub().resolves(undefined) } as never, // sendWebhookMessage
      {} as never, // invalidateCache
      { getFlag: sinon.stub().resolves(false) } as never // featureFlagsService
    );

    return usecase;
  }

  function buildCommand(
    options: {
      providerOverrides?: Record<string, unknown>;
      overrides?: TriggerOverrides;
      channels?: Array<{
        _integrationId: string;
        providerId: PushProviderIdEnum;
        credentials: { deviceTokens?: string[] };
      }>;
    } = {}
  ) {
    const { providerOverrides, overrides = {}, channels = [fcmChannelWithTokens] } = options;

    return SendMessageChannelCommand.create({
      environmentId: 'env_1',
      organizationId: 'org_1',
      userId: 'user_1',
      identifier: 'wf-identifier',
      payload: {},
      overrides: overrides as never,
      transactionId: 'txn_1',
      notificationId: 'notif_1',
      _templateId: 'tpl_1',
      subscriberId: 'sub_1',
      _subscriberId: '_sub_1',
      jobId: 'job_1',
      tags: [],
      contextKeys: [],
      compileContext: {
        subscriber: {
          subscriberId: 'sub_1',
          locale: 'en',
          channels,
        },
      } as never,
      bridgeData: {
        outputs: { subject: 'push title', body: 'push body' },
        ...(providerOverrides && { providers: { [PushProviderIdEnum.FCM]: providerOverrides } }),
      } as never,
      step: {
        stepId: 'step_1',
        template: {
          _id: 'mt_1',
          type: ChannelTypeEnum.PUSH,
          content: 'push body',
          title: 'push title',
        },
      } as never,
      job: {
        _id: 'job_1',
        _environmentId: 'env_1',
        _organizationId: 'org_1',
        _subscriberId: '_sub_1',
        subscriberId: 'sub_1',
        _notificationId: 'notif_1',
        _templateId: 'tpl_1',
        transactionId: 'txn_1',
        identifier: 'wf-identifier',
        type: ChannelTypeEnum.PUSH,
        step: { stepId: 'step_1' },
        tenant: undefined,
      } as never,
    });
  }

  it('delivers persisted FCM bridge provider overrides as bridgeProviderData', async () => {
    const sendStub = sinon.stub().resolves({ id: 'fcm_1' });
    sinon.stub(PushFactory.prototype, 'getHandler').returns({ send: sendStub } as never);

    const result = await buildUsecase().execute(buildCommand({ providerOverrides: persistedFcmOverride }));

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    sinon.assert.calledOnce(sendStub);
    expect(sendStub.firstCall.args[0].bridgeProviderData).to.deep.equal(persistedFcmOverride);
  });

  it('lets a step-scoped trigger override win over the persisted FCM bridge override', async () => {
    const sendStub = sinon.stub().resolves({ id: 'fcm_1' });
    sinon.stub(PushFactory.prototype, 'getHandler').returns({ send: sendStub } as never);
    const triggerFcmOverride = {
      data: { orderId: 'trigger-order' },
      android: { priority: 'high' },
    };

    const result = await buildUsecase().execute(
      buildCommand({
        providerOverrides: persistedFcmOverride,
        overrides: {
          steps: { step_1: { providers: { [PushProviderIdEnum.FCM]: triggerFcmOverride } } },
        } as unknown as TriggerOverrides,
      })
    );

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    expect(sendStub.firstCall.args[0].bridgeProviderData).to.deep.equal(triggerFcmOverride);
  });

  describe('token-less FCM routing overrides', () => {
    it('sends when bridge content override has topic and subscriber has no FCM channel', async () => {
      const sendStub = sinon.stub().resolves({ id: 'fcm_1' });
      sinon.stub(PushFactory.prototype, 'getHandler').returns({ send: sendStub } as never);

      const result = await buildUsecase().execute(
        buildCommand({
          channels: [],
          providerOverrides: { topic: 'orders' },
        })
      );

      expect(result.status).to.equal(SendMessageStatus.SUCCESS);
      sinon.assert.calledOnce(sendStub);
      expect(sendStub.firstCall.args[0].target).to.deep.equal(['']);
      expect(sendStub.firstCall.args[0].bridgeProviderData).to.deep.equal({ topic: 'orders' });
    });

    it('sends when subscriber FCM channel has empty deviceTokens and bridge has topic', async () => {
      const sendStub = sinon.stub().resolves({ id: 'fcm_1' });
      sinon.stub(PushFactory.prototype, 'getHandler').returns({ send: sendStub } as never);

      const result = await buildUsecase().execute(
        buildCommand({
          channels: [fcmChannelWithEmptyTokens],
          providerOverrides: { topic: 'orders' },
        })
      );

      expect(result.status).to.equal(SendMessageStatus.SUCCESS);
      sinon.assert.calledOnce(sendStub);
      expect(sendStub.firstCall.args[0].target).to.deep.equal(['']);
      expect(sendStub.firstCall.args[0].bridgeProviderData).to.deep.equal({ topic: 'orders' });
    });

    it('sends when bridge content override has condition and subscriber has no FCM channel', async () => {
      const sendStub = sinon.stub().resolves({ id: 'fcm_1' });
      sinon.stub(PushFactory.prototype, 'getHandler').returns({ send: sendStub } as never);

      const result = await buildUsecase().execute(
        buildCommand({
          channels: [],
          providerOverrides: { condition: "'stock' in topics" },
        })
      );

      expect(result.status).to.equal(SendMessageStatus.SUCCESS);
      sinon.assert.calledOnce(sendStub);
      expect(sendStub.firstCall.args[0].target).to.deep.equal(['']);
      expect(sendStub.firstCall.args[0].bridgeProviderData).to.deep.equal({
        condition: "'stock' in topics",
      });
    });

    it('sends when subscriber FCM channel has empty deviceTokens and bridge has token', async () => {
      const sendStub = sinon.stub().resolves({ id: 'fcm_1' });
      sinon.stub(PushFactory.prototype, 'getHandler').returns({ send: sendStub } as never);

      const result = await buildUsecase().execute(
        buildCommand({
          channels: [fcmChannelWithEmptyTokens],
          providerOverrides: { token: 'routing-token-1' },
        })
      );

      expect(result.status).to.equal(SendMessageStatus.SUCCESS);
      sinon.assert.calledOnce(sendStub);
      expect(sendStub.firstCall.args[0].target).to.deep.equal(['']);
      expect(sendStub.firstCall.args[0].bridgeProviderData).to.deep.equal({ token: 'routing-token-1' });
    });

    it('skips when subscriber FCM channel has empty deviceTokens and no routing override', async () => {
      const sendStub = sinon.stub().resolves({ id: 'fcm_1' });
      sinon.stub(PushFactory.prototype, 'getHandler').returns({ send: sendStub } as never);

      const result = await buildUsecase().execute(
        buildCommand({
          channels: [fcmChannelWithEmptyTokens],
          providerOverrides: persistedFcmOverride,
        })
      );

      expect(result.status).to.equal(SendMessageStatus.SKIPPED);
      sinon.assert.notCalled(sendStub);
    });
  });
});
