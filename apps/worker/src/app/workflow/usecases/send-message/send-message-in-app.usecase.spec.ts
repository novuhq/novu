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
    sinon.stub(usecase as never, 'getIntegration').resolves({
      integration: { providerId: 'novu', _id: 'int_1' },
    });
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

/**
 * SendMessageChannelCommand skips the deep copy, so `command.step.template` can be the very object
 * held by the in-memory workflow cache. Compiling one subscriber's CTA must not write into it.
 */
describe('SendMessageInApp - compiled CTA copy-on-write', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('keeps the shared step template untouched and sends the compiled CTA', async () => {
    const cachedTemplate = {
      _id: 'mt_1',
      type: ChannelTypeEnum.IN_APP,
      content: 'Hello {{subscriber.subscriberId}}',
      cta: {
        type: 'redirect',
        data: { url: 'https://app.test/{{subscriber.subscriberId}}' },
        action: { buttons: [{ type: 'primary', content: 'Open {{subscriber.subscriberId}}' }] },
      },
    };
    const compiled = {
      content: 'Hello sub_1',
      url: 'https://app.test/sub_1',
      ctaButtons: [{ type: 'primary', content: 'Open sub_1' }],
    };

    const messageRepository = {
      findOne: sinon.stub().resolves(null),
      create: sinon.stub().resolves({ _id: 'msg_1' }),
      findOneAndUpdate: sinon.stub().resolves({ _id: 'msg_1' }),
    };
    const usecase = new SendMessageInApp(
      { invalidateQuery: sinon.stub().resolves(undefined) } as never,
      messageRepository as never,
      { add: sinon.stub().resolves(undefined) } as never,
      { execute: sinon.stub().resolves(undefined) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { execute: sinon.stub().resolves(compiled) } as never,
      { execute: sinon.stub().resolves({ eventId: 'evt_1' }) } as never
    );
    sinon.stub(usecase as never, 'getIntegration').resolves({ integration: { providerId: 'novu', _id: 'int_1' } });
    sinon.stub(usecase as never, 'processVariants').resolves(undefined);
    sinon.stub(usecase as never, 'storeContent').returns(false);
    sinon.stub(usecase as never, 'initiateTranslations').resolves(undefined);

    const step = { stepId: 'step_1', template: cachedTemplate };
    const command = SendMessageChannelCommand.create({
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
      // Null bridgeData takes the non-bridge compile path, which writes the compiled CTA.
      bridgeData: null,
      compileContext: { subscriber: { subscriberId: 'sub_1', locale: 'en' } } as never,
      environment: { _id: 'env_1', identifier: 'env-identifier' } as never,
      step: step as never,
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
        step,
      } as never,
    });
    expect(command.step.template).to.equal(cachedTemplate);

    const result = await usecase.execute(command);

    expect(result.status).to.equal('success');
    expect(cachedTemplate.cta.data.url).to.equal('https://app.test/{{subscriber.subscriberId}}');
    expect(cachedTemplate.cta.action.buttons).to.deep.equal([
      { type: 'primary', content: 'Open {{subscriber.subscriberId}}' },
    ]);
    const createdMessage = messageRepository.create.firstCall.args[0];
    expect(createdMessage.cta.data.url).to.equal(compiled.url);
    expect(createdMessage.cta.action.buttons).to.deep.equal(compiled.ctaButtons);
  });
});
