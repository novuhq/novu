import { ChannelTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { SendMessageChannelCommand } from './send-message-channel.command';
import { SendMessageInApp } from './send-message-in-app.usecase';

/**
 * Guards the environment-reuse optimization: the in-app channel sends two outbound webhooks
 * (MESSAGE_SENT + MESSAGE_DELIVERED). Both must reuse the already-loaded environment entity
 * (threaded via the channel command) instead of triggering separate DB reads.
 */
describe('SendMessageInApp - webhook environment reuse', () => {
  const environment = {
    _id: 'env_1',
    identifier: 'env-identifier',
    webhookAppId: 'app_1',
  } as never;

  function buildUsecase() {
    const sendWebhookMessage = { execute: sinon.stub().resolves({ eventId: 'evt_1' }) };
    const messageRepository = {
      findOne: sinon.stub().resolves(null),
      create: sinon.stub().resolves({ _id: 'msg_1' }),
      findOneAndUpdate: sinon.stub().resolves({ _id: 'msg_1' }),
    };
    const invalidateCache = { invalidateQuery: sinon.stub().resolves(undefined) };
    const webSocketsQueueService = { add: sinon.stub().resolves(undefined) };
    const createExecutionDetails = { execute: sinon.stub().resolves(undefined) };

    const usecase = new SendMessageInApp(
      invalidateCache as never,
      messageRepository as never,
      webSocketsQueueService as never,
      createExecutionDetails as never,
      {} as never, // subscriberRepository
      {} as never, // selectIntegration
      {} as never, // getNovuProviderCredentials
      {} as never, // selectVariant
      {} as never, // moduleRef
      {} as never, // compileInAppTemplate
      sendWebhookMessage as never
    );

    // Short-circuit inherited collaborators that would otherwise hit external services / DB.
    sinon.stub(usecase as never, 'getIntegration').resolves({ providerId: 'novu', _id: 'int_1' });
    sinon.stub(usecase as never, 'processVariants').resolves(undefined);
    sinon.stub(usecase as never, 'storeContent').returns(false);

    return { usecase, sendWebhookMessage, messageRepository };
  }

  function buildCommand() {
    return SendMessageChannelCommand.create({
      environmentId: 'env_1',
      organizationId: 'org_1',
      userId: 'user_1',
      identifier: 'wf-identifier',
      payload: {},
      overrides: {},
      transactionId: 'txn_1',
      notificationId: 'notif_1',
      _templateId: 'tpl_1',
      subscriberId: 'sub_1',
      _subscriberId: '_sub_1',
      jobId: 'job_1',
      tags: [],
      contextKeys: [],
      compileContext: { subscriber: { subscriberId: 'sub_1', locale: 'en' } } as never,
      // Truthy bridgeData skips the compile/translation path so we exercise the send branch.
      bridgeData: { outputs: {} } as never,
      environment,
      step: {
        stepId: 'step_1',
        template: {
          _id: 'mt_1',
          type: ChannelTypeEnum.IN_APP,
          content: '',
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
        type: ChannelTypeEnum.IN_APP,
        providerId: 'novu',
        step: { stepId: 'step_1' },
      } as never,
    });
  }

  afterEach(() => {
    sinon.restore();
  });

  it('forwards the loaded environment to both MESSAGE_SENT and MESSAGE_DELIVERED webhooks', async () => {
    const { usecase, sendWebhookMessage } = buildUsecase();
    const command = buildCommand();

    const result = await usecase.execute(command);

    expect(result.status).to.equal('success');
    expect(sendWebhookMessage.execute.callCount).to.equal(2);

    // Both webhook dispatches must reuse the single environment threaded on the command,
    // so SendWebhookMessage never falls back to its own DB lookup.
    expect(command.environment).to.not.equal(undefined);

    const [sentCall, deliveredCall] = sendWebhookMessage.execute.getCalls();
    expect(sentCall.args[0].eventType).to.equal('message.sent');
    expect(sentCall.args[0].environment).to.equal(command.environment);
    expect(deliveredCall.args[0].eventType).to.equal('message.delivered');
    expect(deliveredCall.args[0].environment).to.equal(command.environment);
  });
});
