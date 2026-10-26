import { SmsFactory } from '@novu/application-generic';
import { ChannelTypeEnum, SmsProviderIdEnum } from '@novu/shared';
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
    };

    const usecase = new SendMessageSms(
      {} as never,
      messageRepository as never,
      { execute: sinon.stub().resolves(undefined) } as never,
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

    return { usecase, messageRepository, sendStub };
  }

  function buildCommand(overrides: Record<string, unknown>) {
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
        subscriber: { subscriberId: 'sub_1', phone: '+15555555555', locale: 'en' },
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
});
