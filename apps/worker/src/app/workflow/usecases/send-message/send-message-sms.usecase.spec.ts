import { DetailEnum, SmsFactory } from '@novu/application-generic';
import { ChannelTypeEnum, DeliveryLifecycleDetail, DeliveryLifecycleStatusEnum, SmsProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { SendMessageChannelCommand } from './send-message-channel.command';
import { SendMessageSms } from './send-message-sms.usecase';
import { SendMessageStatus } from './send-message-type.usecase';

describe('SendMessageSms - trigger provider overrides', () => {
  const STEP_ID = 'sms-step';
  const PROVIDER_ID = SmsProviderIdEnum.Twilio;

  function buildUsecase() {
    const messageRepository = {
      create: sinon.stub().resolves({ _id: 'msg_1' }),
      update: sinon.stub().resolves(undefined),
      updateMessageStatus: sinon.stub().resolves(undefined),
    };

    const createExecutionDetails = { execute: sinon.stub().resolves(undefined) };

    const usecase = new SendMessageSms(
      {} as never,
      messageRepository as never,
      createExecutionDetails as never,
      { execute: sinon.stub() } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { execute: sinon.stub().resolves(undefined) } as never
    );

    sinon.stub(usecase as never, 'getIntegration').resolves({
      integration: {
        _id: 'integration_1',
        channel: ChannelTypeEnum.SMS,
        providerId: PROVIDER_ID,
        credentials: { from: '+10000000000' },
      },
    });
    sinon.stub(usecase as never, 'processVariants').resolves(undefined);
    sinon.stub(usecase as never, 'initiateTranslations').resolves(undefined);
    sinon.stub(usecase as never, 'sendSelectedIntegrationExecution').resolves(undefined);
    sinon.stub(usecase as never, 'storeContent').returns(false);

    const sendStub = sinon.stub().resolves({ id: 'provider_msg_1' });
    sinon.stub(SmsFactory.prototype, 'getHandler').returns({ send: sendStub } as never);

    return { usecase, messageRepository, sendStub, createExecutionDetails };
  }

  function buildCommand(
    overrides: Record<string, unknown>,
    options: { subscriberPhone?: string | null; payload?: Record<string, unknown> } = {}
  ) {
    const subscriberPhone = 'subscriberPhone' in options ? options.subscriberPhone : '+15555555555';

    return SendMessageChannelCommand.create({
      environmentId: 'env_1',
      organizationId: 'org_1',
      userId: 'user_1',
      identifier: 'wf-identifier',
      payload: options.payload ?? {},
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
          ...(subscriberPhone ? { phone: subscriberPhone } : {}),
        },
      } as never,
      bridgeData: { outputs: { body: 'compiled sms body' } } as never,
      step: {
        stepId: STEP_ID,
        template: { _id: 'mt_1', type: ChannelTypeEnum.SMS, content: '' },
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
        type: ChannelTypeEnum.SMS,
        step: { stepId: STEP_ID },
      } as never,
    });
  }

  afterEach(() => {
    sinon.restore();
  });

  it('falls back to the subscriber phone and integration sender without overrides', async () => {
    const { usecase, sendStub } = buildUsecase();

    const result = await usecase.execute(buildCommand({}));

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    expect(sendStub.firstCall.args[0].to).to.equal('+15555555555');
    expect(sendStub.firstCall.args[0].from).to.equal('+10000000000');
    expect(sendStub.firstCall.args[0].customData).to.deep.equal({});
  });

  it('applies legacy channel and flat provider overrides', async () => {
    const { usecase, sendStub } = buildUsecase();

    await usecase.execute(
      buildCommand({
        sms: { to: '+11111111111' },
        [PROVIDER_ID]: { from: '+12222222222' },
      })
    );

    expect(sendStub.firstCall.args[0].to).to.equal('+11111111111');
    expect(sendStub.firstCall.args[0].from).to.equal('+12222222222');
  });

  it('applies overrides.providers.<providerId>', async () => {
    const { usecase, sendStub, messageRepository } = buildUsecase();

    await usecase.execute(
      buildCommand({
        providers: {
          [PROVIDER_ID]: { to: '+13333333333', from: '+14444444444', customData: { campaign: 'spring' } },
        },
      })
    );

    const sendArgs = sendStub.firstCall.args[0];
    expect(sendArgs.to).to.equal('+13333333333');
    expect(sendArgs.from).to.equal('+14444444444');
    expect(sendArgs.customData).to.deep.equal({ campaign: 'spring' });
    expect(messageRepository.create.firstCall.args[0].overrides).to.include({
      to: '+13333333333',
      from: '+14444444444',
    });
  });

  it('lets step-scoped provider overrides win over every other shape', async () => {
    const { usecase, sendStub } = buildUsecase();

    await usecase.execute(
      buildCommand({
        sms: { from: '+10000000001' },
        [PROVIDER_ID]: { from: '+10000000002' },
        providers: { [PROVIDER_ID]: { from: '+10000000003', to: '+16666666666' } },
        steps: { [STEP_ID]: { providers: { [PROVIDER_ID]: { from: '+17777777777' } } } },
      })
    );

    expect(sendStub.firstCall.args[0].from).to.equal('+17777777777');
    expect(sendStub.firstCall.args[0].to).to.equal('+16666666666');
  });

  it('ignores step-scoped overrides addressed to a different step', async () => {
    const { usecase, sendStub } = buildUsecase();

    await usecase.execute(
      buildCommand({
        steps: { 'other-step': { providers: { [PROVIDER_ID]: { from: '+18888888888' } } } },
      })
    );

    expect(sendStub.firstCall.args[0].from).to.equal('+10000000000');
  });

  it('sends to overrides.sms.to when the subscriber has no phone', async () => {
    const { usecase, sendStub, messageRepository } = buildUsecase();

    const result = await usecase.execute(buildCommand({ sms: { to: '+52134234' } }, { subscriberPhone: null }));

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    expect(sendStub.firstCall.args[0].to).to.equal('+52134234');
    expect(messageRepository.create.firstCall.args[0].phone).to.equal('+52134234');
  });

  it('sends to a step provider override when the subscriber has no phone', async () => {
    const { usecase, sendStub } = buildUsecase();

    const result = await usecase.execute(
      buildCommand(
        { steps: { [STEP_ID]: { providers: { [PROVIDER_ID]: { to: '+19998887777' } } } } },
        { subscriberPhone: null }
      )
    );

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    expect(sendStub.firstCall.args[0].to).to.equal('+19998887777');
  });

  it('uses payload.phone when the subscriber has no phone and no override', async () => {
    const { usecase, sendStub } = buildUsecase();

    const result = await usecase.execute(
      buildCommand({}, { subscriberPhone: null, payload: { phone: '+14445556666' } })
    );

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    expect(sendStub.firstCall.args[0].to).to.equal('+14445556666');
  });

  it('skips the step when the subscriber has no phone and no sms destination override', async () => {
    const { usecase, sendStub, createExecutionDetails } = buildUsecase();

    const result = await usecase.execute(buildCommand({}, { subscriberPhone: null }));

    expect(result.status).to.equal(SendMessageStatus.SKIPPED);
    if (result.status === SendMessageStatus.SKIPPED) {
      expect(result.deliveryLifecycleState).to.deep.equal({
        status: DeliveryLifecycleStatusEnum.SKIPPED,
        detail: DeliveryLifecycleDetail.USER_MISSING_PHONE,
      });
    }
    expect(sendStub.called).to.equal(false);

    const missingPhoneTrace = createExecutionDetails.execute
      .getCalls()
      .map((call) => call.args[0])
      .find((detail) => detail.detail === DetailEnum.SUBSCRIBER_MISSING_PHONE_NUMBER);

    expect(missingPhoneTrace).to.exist;
  });

  it('ignores a blank sms to override and keeps the subscriber phone', async () => {
    const { usecase, sendStub } = buildUsecase();

    const result = await usecase.execute(buildCommand({ sms: { to: '   ' } }));

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    expect(sendStub.firstCall.args[0].to).to.equal('+15555555555');
  });

  it('drops a blank provider to so the provider keeps the subscriber phone', async () => {
    const { usecase, sendStub } = buildUsecase();

    const result = await usecase.execute(
      buildCommand({
        providers: {
          [PROVIDER_ID]: { to: '   ', statusCallback: 'https://example.com/sms' },
        },
      })
    );

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    const sendArgs = sendStub.firstCall.args[0];
    expect(sendArgs.to).to.equal('+15555555555');
    expect(sendArgs.bridgeProviderData).to.not.have.property('to');
    expect(sendArgs.bridgeProviderData.statusCallback).to.equal('https://example.com/sms');
  });

  it('drops a blank step-scoped provider to and a blank passthrough to', async () => {
    const { usecase, sendStub } = buildUsecase();

    const result = await usecase.execute(
      buildCommand({
        steps: {
          [STEP_ID]: {
            providers: {
              [PROVIDER_ID]: {
                to: '   ',
                _passthrough: { body: { to: '  ', messagingServiceSid: 'MG123' } },
              },
            },
          },
        },
      })
    );

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    const sendArgs = sendStub.firstCall.args[0];
    expect(sendArgs.to).to.equal('+15555555555');
    expect(sendArgs.bridgeProviderData).to.not.have.property('to');
    expect(sendArgs.bridgeProviderData._passthrough.body).to.deep.equal({ messagingServiceSid: 'MG123' });
  });

  it('records the selected provider on the sent trace when the job snapshot is Novu SMS', async () => {
    const { usecase, createExecutionDetails } = buildUsecase();
    const command = buildCommand({});
    command.job.providerId = SmsProviderIdEnum.Novu;

    const result = await usecase.execute(command);

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);

    const sentTrace = createExecutionDetails.execute
      .getCalls()
      .map((call) => call.args[0])
      .find((detail) => detail.detail === DetailEnum.MESSAGE_SENT);

    expect(sentTrace?.providerId).to.equal(SmsProviderIdEnum.Twilio);
  });
});
