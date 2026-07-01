import { MailFactory } from '@novu/application-generic';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { SendMessageChannelCommand } from './send-message-channel.command';
import { SendMessageEmail } from './send-message-email.usecase';
import { SendMessageStatus } from './send-message-type.usecase';

describe('SendMessageEmail - email-webhook payloadDetails', () => {
  const renderedEmailBody = '<html><body><p>Hello Ada from email webhook test</p></body></html>';

  function buildUsecase() {
    const createExecutionDetails = { execute: sinon.stub().resolves(undefined) };
    const messageRepository = {
      create: sinon.stub().resolves({ _id: 'msg_1' }),
      update: sinon.stub().resolves(undefined),
    };
    const compileEmailTemplateUsecase = { execute: sinon.stub() };
    const sendWebhookMessage = { execute: sinon.stub().resolves(undefined) };
    const featureFlagService = {
      getFlag: sinon.stub().resolves(true),
    };

    const usecase = new SendMessageEmail(
      {} as never,
      {} as never,
      messageRepository as never,
      {} as never,
      createExecutionDetails as never,
      compileEmailTemplateUsecase as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      featureFlagService as never,
      {} as never,
      sendWebhookMessage as never
    );

    sinon.stub(usecase as never, 'getIntegration').resolves({
      _id: 'integration_1',
      providerId: EmailProviderIdEnum.EmailWebhook,
      credentials: {
        from: 'no-reply@test.com',
        webhookUrl: 'http://127.0.0.1:9999/email-webhook',
        secretKey: 'test-secret',
      },
    });
    sinon.stub(usecase as never, 'processVariants').resolves(undefined);
    sinon.stub(usecase as never, 'getOverrideLayoutId').resolves(undefined);
    sinon.stub(usecase as never, 'sendSelectedIntegrationExecution').resolves(undefined);
    sinon.stub(usecase as never, 'initiateTranslations').resolves(undefined);
    sinon.stub(usecase as never, 'storeContent').returns(false);
    sinon.stub(usecase as never, 'buildEmailProviderOverrides').returns({});

    return { usecase, compileEmailTemplateUsecase };
  }

  function buildCommand({
    bridgeBody,
    templateContent = '',
    templateSubject = 'Welcome {{payload.name}}!',
  }: {
    bridgeBody?: string;
    templateContent?: string;
    templateSubject?: string;
  }) {
    return SendMessageChannelCommand.create({
      environmentId: 'env_1',
      organizationId: 'org_1',
      userId: 'user_1',
      identifier: 'wf-identifier',
      payload: { name: 'Ada' },
      overrides: {},
      transactionId: 'txn_1',
      notificationId: 'notif_1',
      _templateId: 'tpl_1',
      subscriberId: 'sub_1',
      _subscriberId: '_sub_1',
      jobId: 'job_1',
      tags: [],
      contextKeys: [],
      compileContext: {
        subscriber: { subscriberId: 'sub_1', email: 'subscriber@test.com', locale: 'en' },
      } as never,
      bridgeData: bridgeBody
        ? ({
            outputs: {
              subject: 'Welcome Ada!',
              body: bridgeBody,
            },
          } as never)
        : undefined,
      step: {
        stepId: 'email-step',
        template: {
          _id: 'mt_1',
          type: ChannelTypeEnum.EMAIL,
          subject: templateSubject,
          content: templateContent,
          contentType: 'editor',
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
        type: ChannelTypeEnum.EMAIL,
        step: { stepId: 'email-step' },
      } as never,
    });
  }

  afterEach(() => {
    sinon.restore();
  });

  it('should populate payloadDetails.content with rendered bridge body for v2 workflows', async () => {
    const { usecase } = buildUsecase();
    const command = buildCommand({ bridgeBody: renderedEmailBody });
    const sendStub = sinon.stub().resolves({ id: 'msg_1' });

    sinon.stub(MailFactory.prototype, 'getHandler').returns({
      send: sendStub,
    } as never);

    const result = await usecase.execute(command);

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    expect(sendStub.calledOnce).to.equal(true);

    const mailData = sendStub.firstCall.args[0];

    expect(mailData.payloadDetails).to.exist;
    expect(mailData.payloadDetails.content).to.equal(renderedEmailBody);
    expect(mailData.payloadDetails.subject).to.equal('Welcome Ada!');
  });

  it('should preserve legacy payloadDetails content for v0 workflows without bridge output', async () => {
    const templateContent = 'Hello {{payload.name}}';
    const templateSubject = 'Template subject {{payload.name}}';
    const compiledContent = '<p>Compiled legacy HTML for Ada</p>';
    const { usecase, compileEmailTemplateUsecase } = buildUsecase();
    const command = buildCommand({
      templateContent,
      templateSubject,
    });

    compileEmailTemplateUsecase.execute.resolves({
      html: `<html><body>${compiledContent}</body></html>`,
      content: compiledContent,
      subject: 'Final legacy compiled subject for Ada',
      senderName: 'Novu',
    });

    const sendStub = sinon.stub().resolves({ id: 'msg_1' });

    sinon.stub(MailFactory.prototype, 'getHandler').returns({
      send: sendStub,
    } as never);

    const result = await usecase.execute(command);

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);

    const mailData = sendStub.firstCall.args[0];

    expect(mailData.payloadDetails.content).to.equal(templateContent);
    expect(mailData.payloadDetails.subject).to.equal(templateSubject);
  });
});
