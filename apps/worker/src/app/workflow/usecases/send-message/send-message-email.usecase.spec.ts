import { Logger } from '@nestjs/common';
import { DetailEnum, type IntegrationSelectionResult, MailFactory } from '@novu/application-generic';
import type { JobEntity } from '@novu/dal';
import {
  buildAgentReplyToAddress,
  ChannelTypeEnum,
  EmailProviderIdEnum,
  ExecutionDetailsStatusEnum,
  SeverityLevelEnum,
} from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { SendMessageChannelCommand } from './send-message-channel.command';
import { SendMessageEmail } from './send-message-email.usecase';
import { SendMessageStatus } from './send-message-type.usecase';

class TestSendMessageEmail extends SendMessageEmail {
  public logSelectedIntegration(job: JobEntity, selection: IntegrationSelectionResult): Promise<void> {
    return this.sendSelectedIntegrationExecution(job, selection);
  }

  public integrationFilterData(command: SendMessageChannelCommand) {
    return this.getIntegrationFilterData(command);
  }
}

describe('SendMessageEmail - email-webhook payloadDetails', () => {
  const renderedEmailBody = '<html><body><p>Hello Ada from email webhook test</p></body></html>';

  function buildUsecase(stubSelectionExecution = true) {
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

    const usecase = new TestSendMessageEmail(
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
      sendWebhookMessage as never,
      { resolveAgentEmailContext: sinon.stub().resolves({}) } as never,
      { findOne: sinon.stub().resolves(null) } as never
    );

    sinon.stub(usecase as never, 'getIntegration').resolves({
      integration: {
        _id: 'integration_1',
        providerId: EmailProviderIdEnum.EmailWebhook,
        credentials: {
          from: 'no-reply@test.com',
          webhookUrl: 'http://127.0.0.1:9999/email-webhook',
          secretKey: 'test-secret',
        },
      },
    });
    sinon.stub(usecase as never, 'processVariants').resolves(undefined);
    sinon.stub(usecase as never, 'getOverrideLayoutId').resolves(undefined);
    if (stubSelectionExecution) {
      sinon.stub(usecase as never, 'sendSelectedIntegrationExecution').resolves(undefined);
    }
    sinon.stub(usecase as never, 'initiateTranslations').resolves(undefined);
    sinon.stub(usecase as never, 'storeContent').returns(false);
    sinon.stub(usecase as never, 'buildEmailProviderOverrides').returns({});

    return { usecase, compileEmailTemplateUsecase, createExecutionDetails };
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
        : null,
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

  it('includes the supported workflow metadata in integration condition data', () => {
    const { usecase } = buildUsecase();
    const command = buildCommand({});
    command.workflow = {
      name: 'Order confirmation',
      description: 'Sent after an order is placed',
      tags: ['transactional'],
      severity: 'high',
      triggers: [{ identifier: 'order-confirmation' }],
    } as never;

    expect(usecase.integrationFilterData(command).workflow).to.deep.equal({
      workflowId: 'order-confirmation',
      name: 'Order confirmation',
      description: 'Sent after an order is placed',
      tags: ['transactional'],
      severity: 'high',
    });
  });

  it('builds workflow condition data from discovered metadata when no persisted workflow is available', () => {
    const { usecase } = buildUsecase();
    const command = buildCommand({});
    command.tags = ['bridge'];
    command.severity = SeverityLevelEnum.MEDIUM;
    command.job.step = {
      ...command.job.step,
      workflowMetadata: {
        name: 'Order confirmation',
        description: 'Sent after an order is placed',
      },
    } as never;

    expect(usecase.integrationFilterData(command).workflow).to.deep.equal({
      workflowId: 'wf-identifier',
      name: 'Order confirmation',
      description: 'Sent after an order is placed',
      tags: ['bridge'],
      severity: 'medium',
    });
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
    expect(command.step?.template?.content).to.equal('');
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

  it('should log the matched integration conditions in the activity feed', async () => {
    const { usecase, createExecutionDetails } = buildUsecase(false);
    const command = buildCommand({ bridgeBody: renderedEmailBody });
    const selection: IntegrationSelectionResult = {
      integration: {
        _id: 'integration_1',
        _environmentId: 'env_1',
        _organizationId: 'org_1',
        active: true,
        channel: ChannelTypeEnum.EMAIL,
        credentials: {},
        deleted: false,
        identifier: 'eu-provider',
        name: 'EU provider',
        primary: false,
        priority: 1,
        providerId: EmailProviderIdEnum.EmailWebhook,
      },
      matchedConditions: { type: 'rules', value: { '==': [{ var: 'subscriber.locale' }, 'fr'] } },
    };

    await usecase.logSelectedIntegration(command.job, selection);

    expect(createExecutionDetails.execute.callCount).to.equal(2);
    const matchedConditionLog = createExecutionDetails.execute.firstCall.args[0];

    expect(matchedConditionLog.detail).to.equal(DetailEnum.INTEGRATION_CONDITIONS_MATCHED);
    expect(matchedConditionLog.status).to.equal(ExecutionDetailsStatusEnum.SUCCESS);
    expect(JSON.parse(matchedConditionLog.raw)).to.deep.equal({
      integrationIdentifier: 'eu-provider',
      matchedConditions: selection.matchedConditions,
    });
  });

  it('should continue when logging matched integration conditions fails', async () => {
    const { usecase, createExecutionDetails } = buildUsecase(false);
    const command = buildCommand({ bridgeBody: renderedEmailBody });
    const loggerError = sinon.stub(Logger, 'error');
    const selection: IntegrationSelectionResult = {
      integration: {
        _id: 'integration_1',
        _environmentId: 'env_1',
        _organizationId: 'org_1',
        active: true,
        channel: ChannelTypeEnum.EMAIL,
        credentials: {},
        deleted: false,
        identifier: 'eu-provider',
        name: 'EU provider',
        primary: false,
        priority: 1,
        providerId: EmailProviderIdEnum.EmailWebhook,
      },
      matchedConditions: { type: 'rules', value: { '==': [{ var: 'subscriber.locale' }, 'fr'] } },
    };

    createExecutionDetails.execute.onFirstCall().rejects(new Error('activity log unavailable'));

    await usecase.logSelectedIntegration(command.job, selection);

    expect(createExecutionDetails.execute.callCount).to.equal(2);
    expect(createExecutionDetails.execute.secondCall.args[0].detail).to.not.equal(
      DetailEnum.INTEGRATION_CONDITIONS_MATCHED
    );
    expect(loggerError.calledOnce).to.equal(true);
  });

  it('should continue when logging the selected provider fails', async () => {
    const { usecase, createExecutionDetails } = buildUsecase(false);
    const command = buildCommand({ bridgeBody: renderedEmailBody });
    const loggerError = sinon.stub(Logger, 'error');
    const selection: IntegrationSelectionResult = {
      integration: {
        _id: 'integration_1',
        _environmentId: 'env_1',
        _organizationId: 'org_1',
        active: true,
        channel: ChannelTypeEnum.EMAIL,
        credentials: {},
        deleted: false,
        identifier: 'email-provider',
        name: 'Email provider',
        primary: true,
        priority: 1,
        providerId: EmailProviderIdEnum.EmailWebhook,
      },
    };

    createExecutionDetails.execute.rejects(new Error('activity log unavailable'));

    await usecase.logSelectedIntegration(command.job, selection);

    expect(createExecutionDetails.execute.calledOnce).to.equal(true);
    expect(loggerError.calledOnce).to.equal(true);
  });
});

describe('SendMessageEmail - agent sender / reply-to precedence', () => {
  const AGENT_ID = 'aaaaaaaaaaaaaaaaaaaaaaa1';
  const MESSAGE_ID = '65f1a2b3c4d5e6f7a8b9c0d1';

  function buildUsecase(agentStubs?: { replyTo?: string; senderName?: string; senderEmail?: string }) {
    const createExecutionDetails = { execute: sinon.stub().resolves(undefined) };
    const messageRepository = {
      create: sinon.stub().resolves({ _id: MESSAGE_ID }),
      update: sinon.stub().resolves(undefined),
    };
    const agentRepository = { findOne: sinon.stub().resolves({ _id: AGENT_ID }) };
    const resolveAgentInboundAddresses = {
      resolveAgentEmailContext: sinon.stub().resolves({
        replyTo: agentStubs?.replyTo,
        senderName: agentStubs?.senderName,
        senderEmail: agentStubs?.senderEmail,
      }),
      resolveAgentEmailContextById: sinon.stub().resolves({
        replyTo: agentStubs?.replyTo,
        senderName: agentStubs?.senderName,
        senderEmail: agentStubs?.senderEmail,
      }),
    };

    const usecase = new SendMessageEmail(
      {} as never,
      {} as never,
      messageRepository as never,
      {} as never,
      createExecutionDetails as never,
      { execute: sinon.stub() } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { getFlag: sinon.stub().resolves(true) } as never,
      {} as never,
      { execute: sinon.stub().resolves(undefined) } as never,
      resolveAgentInboundAddresses as never,
      agentRepository as never
    );

    sinon.stub(usecase as never, 'getIntegration').resolves({
      integration: {
        _id: 'integration_1',
        providerId: EmailProviderIdEnum.SendGrid,
        credentials: {
          from: 'integration@test.com',
          senderName: 'Integration Name',
        },
      },
    });
    sinon.stub(usecase as never, 'processVariants').resolves(undefined);
    sinon.stub(usecase as never, 'getOverrideLayoutId').resolves(undefined);
    sinon.stub(usecase as never, 'sendSelectedIntegrationExecution').resolves(undefined);
    sinon.stub(usecase as never, 'initiateTranslations').resolves(undefined);
    sinon.stub(usecase as never, 'storeContent').returns(false);
    sinon.stub(usecase as never, 'buildEmailProviderOverrides').returns({});

    return { usecase, resolveAgentInboundAddresses, messageRepository, agentRepository };
  }

  function buildCommand(
    outputs: Record<string, unknown> = {},
    options: { jobAgentId?: string | null; overrides?: Record<string, unknown> } = {}
  ) {
    return SendMessageChannelCommand.create({
      environmentId: 'env_1',
      organizationId: 'org_1',
      userId: 'user_1',
      identifier: 'wf-identifier',
      payload: {},
      overrides: options.overrides || {},
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
      bridgeData: {
        outputs: {
          subject: 'Hello',
          body: '<html><body>Hi</body></html>',
          ...outputs,
        },
      } as never,
      workflow: {
        agent: { identifier: 'support-bot' },
      } as never,
      step: {
        stepId: 'email-step',
        template: {
          _id: 'mt_1',
          type: ChannelTypeEnum.EMAIL,
          subject: 'Hello',
          content: '',
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
        ...(options.jobAgentId !== undefined && { _agentId: options.jobAgentId }),
      } as never,
    });
  }

  afterEach(() => {
    sinon.restore();
  });

  it('uses agent sender defaults when step from is unset', async () => {
    const { usecase, resolveAgentInboundAddresses } = buildUsecase({
      senderName: 'Support Agent',
      senderEmail: 'agent@inbox.com',
      replyTo: 'agent@inbox.com',
    });
    const sendStub = sinon.stub().resolves({ id: 'msg_1' });
    sinon.stub(MailFactory.prototype, 'getHandler').returns({ send: sendStub } as never);

    await usecase.execute(buildCommand());

    expect(resolveAgentInboundAddresses.resolveAgentEmailContext.calledOnce).to.equal(true);
    expect(resolveAgentInboundAddresses.resolveAgentEmailContext.firstCall.args[0].agent).to.deep.equal({
      identifier: 'support-bot',
    });
    expect(sendStub.firstCall.args[0].from).to.equal('agent@inbox.com');
    expect(sendStub.firstCall.args[0].senderName).to.equal('Support Agent');
    expect(sendStub.firstCall.args[0].replyTo).to.equal(buildAgentReplyToAddress('agent@inbox.com', MESSAGE_ID));
  });

  it('uses trigger agent ObjectId override over workflow agent', async () => {
    const { usecase, resolveAgentInboundAddresses } = buildUsecase({
      senderName: 'Trigger Agent',
      senderEmail: 'trigger@inbox.com',
      replyTo: 'trigger@inbox.com',
    });
    const sendStub = sinon.stub().resolves({ id: 'msg_1' });
    sinon.stub(MailFactory.prototype, 'getHandler').returns({ send: sendStub } as never);

    await usecase.execute(buildCommand({}, { jobAgentId: 'bbbbbbbbbbbbbbbbbbbbbbb1' }));

    expect(resolveAgentInboundAddresses.resolveAgentEmailContextById.calledOnce).to.equal(true);
    expect(resolveAgentInboundAddresses.resolveAgentEmailContextById.firstCall.args[0].agentId).to.equal(
      'bbbbbbbbbbbbbbbbbbbbbbb1'
    );
    expect(resolveAgentInboundAddresses.resolveAgentEmailContext.called).to.equal(false);
    expect(sendStub.firstCall.args[0].from).to.equal('trigger@inbox.com');
    expect(sendStub.firstCall.args[0].replyTo).to.equal(buildAgentReplyToAddress('trigger@inbox.com', MESSAGE_ID));
  });

  it('opts out of agent defaults when job _agentId is explicitly null', async () => {
    const { usecase, resolveAgentInboundAddresses } = buildUsecase({
      senderName: 'Support Agent',
      senderEmail: 'agent@inbox.com',
      replyTo: 'agent@inbox.com',
    });
    const sendStub = sinon.stub().resolves({ id: 'msg_1' });
    sinon.stub(MailFactory.prototype, 'getHandler').returns({ send: sendStub } as never);

    await usecase.execute(buildCommand({}, { jobAgentId: null }));

    expect(resolveAgentInboundAddresses.resolveAgentEmailContext.called).to.equal(false);
    expect(resolveAgentInboundAddresses.resolveAgentEmailContextById.called).to.equal(false);
    expect(sendStub.firstCall.args[0].from).to.equal('integration@test.com');
    expect(sendStub.firstCall.args[0].replyTo).to.equal(undefined);
  });

  it('prefers step from / replyTo overrides over agent defaults', async () => {
    const { usecase, resolveAgentInboundAddresses } = buildUsecase({
      senderName: 'Support Agent',
      senderEmail: 'agent@inbox.com',
      replyTo: 'agent@inbox.com',
    });
    const sendStub = sinon.stub().resolves({ id: 'msg_1' });
    sinon.stub(MailFactory.prototype, 'getHandler').returns({ send: sendStub } as never);

    await usecase.execute(
      buildCommand({
        from: { email: 'step@acme.com', name: 'Step Sender' },
        replyTo: 'step-reply@acme.com',
      })
    );

    expect(resolveAgentInboundAddresses.resolveAgentEmailContext.called).to.equal(false);
    expect(sendStub.firstCall.args[0].from).to.equal('step@acme.com');
    expect(sendStub.firstCall.args[0].senderName).to.equal('Step Sender');
    expect(sendStub.firstCall.args[0].replyTo).to.equal('step-reply@acme.com');
  });

  it('skips agent sender defaults when useProviderDefaults is true', async () => {
    const { usecase, resolveAgentInboundAddresses } = buildUsecase({
      senderName: 'Support Agent',
      senderEmail: 'agent@inbox.com',
    });
    const sendStub = sinon.stub().resolves({ id: 'msg_1' });
    sinon.stub(MailFactory.prototype, 'getHandler').returns({ send: sendStub } as never);

    await usecase.execute(buildCommand({ useProviderDefaults: true }));

    // Still resolves once for reply-to (sender is skipped via useProviderDefaults)
    expect(resolveAgentInboundAddresses.resolveAgentEmailContext.calledOnce).to.equal(true);
    expect(sendStub.firstCall.args[0].from).to.equal('integration@test.com');
  });

  describe('agent reply correlation', () => {
    it('stamps _agentId at creation and tokenizes the agent Reply-To', async () => {
      const { usecase, messageRepository, agentRepository } = buildUsecase({
        senderEmail: 'agent@inbox.com',
        replyTo: 'agent@inbox.com',
      });
      const sendStub = sinon.stub().resolves({ id: 'provider_send_1' });
      sinon.stub(MailFactory.prototype, 'getHandler').returns({ send: sendStub } as never);

      await usecase.execute(buildCommand());

      expect(agentRepository.findOne.firstCall.args[0]).to.deep.equal({
        identifier: 'support-bot',
        _environmentId: 'env_1',
        _organizationId: 'org_1',
      });
      expect(messageRepository.create.firstCall.args[0]._agentId).to.equal(AGENT_ID);
      expect(sendStub.firstCall.args[0].replyTo).to.equal(buildAgentReplyToAddress('agent@inbox.com', MESSAGE_ID));
    });

    it('resolves the agent from job _agentId without querying the repository', async () => {
      const { usecase, messageRepository, agentRepository } = buildUsecase({
        senderEmail: 'trigger@inbox.com',
        replyTo: 'trigger@inbox.com',
      });
      const sendStub = sinon.stub().resolves({ id: 'provider_send_1' });
      sinon.stub(MailFactory.prototype, 'getHandler').returns({ send: sendStub } as never);

      await usecase.execute(buildCommand({}, { jobAgentId: 'bbbbbbbbbbbbbbbbbbbbbbb1' }));

      expect(agentRepository.findOne.called).to.equal(false);
      expect(messageRepository.create.firstCall.args[0]._agentId).to.equal('bbbbbbbbbbbbbbbbbbbbbbb1');
      expect(sendStub.firstCall.args[0].replyTo).to.equal(buildAgentReplyToAddress('trigger@inbox.com', MESSAGE_ID));
    });

    it('leaves non-agent sends untouched', async () => {
      const { usecase, messageRepository } = buildUsecase();
      const sendStub = sinon.stub().resolves({ id: 'provider_send_1' });
      sinon.stub(MailFactory.prototype, 'getHandler').returns({ send: sendStub } as never);

      await usecase.execute(buildCommand({}, { jobAgentId: null }));

      expect(messageRepository.create.firstCall.args[0]).to.not.have.property('_agentId');
      expect(sendStub.firstCall.args[0].replyTo).to.equal(undefined);
    });

    it('keeps the post-send identifier update on the provider send id', async () => {
      const { usecase, messageRepository } = buildUsecase({ senderEmail: 'agent@inbox.com' });
      const sendStub = sinon.stub().resolves({ id: 'provider_send_1' });
      sinon.stub(MailFactory.prototype, 'getHandler').returns({ send: sendStub } as never);

      await usecase.execute(buildCommand());

      const updateCall = messageRepository.update
        .getCalls()
        .find((call) => call.args[1]?.$set?.identifier !== undefined);

      expect(updateCall?.args[1].$set.identifier).to.equal('provider_send_1');
    });
  });
});
