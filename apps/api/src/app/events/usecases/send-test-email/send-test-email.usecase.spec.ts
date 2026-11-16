import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  AnalyticsService,
  CompileEmailTemplate,
  GetNovuProviderCredentials,
  MailFactory,
  PreviewStep,
  SelectIntegration,
} from '@novu/application-generic';
import { IntegrationEntity, MessageRepository, OrganizationRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum, ICredentials } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { SendTestEmailCommand } from './send-test-email.command';
import { SendTestEmail } from './send-test-email.usecase';

const sharedCredentials: ICredentials = {
  apiKey: 'shared-key',
  from: 'no-reply@novu.co',
  senderName: 'Novu',
  ipPoolName: 'Demo',
};

describe('SendTestEmail', () => {
  let compileEmailTemplate: sinon.SinonStubbedInstance<CompileEmailTemplate>;
  let organizationRepository: sinon.SinonStubbedInstance<OrganizationRepository>;
  let selectIntegration: sinon.SinonStubbedInstance<SelectIntegration>;
  let analyticsService: sinon.SinonStubbedInstance<AnalyticsService>;
  let getNovuProviderCredentials: sinon.SinonStubbedInstance<GetNovuProviderCredentials>;
  let previewStep: sinon.SinonStubbedInstance<PreviewStep>;
  let messageRepository: sinon.SinonStubbedInstance<MessageRepository>;
  let useCase: SendTestEmail;
  let sendStub: sinon.SinonStub;
  let getHandlerStub: sinon.SinonStub;

  beforeEach(() => {
    compileEmailTemplate = sinon.createStubInstance(CompileEmailTemplate);
    organizationRepository = sinon.createStubInstance(OrganizationRepository);
    selectIntegration = sinon.createStubInstance(SelectIntegration);
    analyticsService = sinon.createStubInstance(AnalyticsService);
    getNovuProviderCredentials = sinon.createStubInstance(GetNovuProviderCredentials);
    previewStep = sinon.createStubInstance(PreviewStep);
    messageRepository = sinon.createStubInstance(MessageRepository);

    compileEmailTemplate.execute.resolves({
      html: '<p>Hello</p>',
      content: '<p>Hello</p>',
      subject: 'Hello',
      senderName: 'Novu',
    });
    organizationRepository.findById.resolves({ _id: 'org-1' } as never);
    getNovuProviderCredentials.execute.resolves(sharedCredentials);
    messageRepository.create.callsFake(async (data) => ({ _id: `msg-${data.email}` }) as never);
    messageRepository.delete.resolves({ acknowledged: true, deletedCount: 1 });
    analyticsService.track.resolves();

    sendStub = sinon.stub().resolves({});
    getHandlerStub = sinon.stub(MailFactory.prototype, 'getHandler').returns({ send: sendStub } as never);

    useCase = new SendTestEmail(
      compileEmailTemplate as unknown as CompileEmailTemplate,
      organizationRepository as unknown as OrganizationRepository,
      selectIntegration as unknown as SelectIntegration,
      analyticsService as unknown as AnalyticsService,
      getNovuProviderCredentials as unknown as GetNovuProviderCredentials,
      previewStep as unknown as PreviewStep,
      messageRepository as unknown as MessageRepository
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('validates every shared-provider recipient and reserves quota before sending', async () => {
    selectIntegration.execute.resolves({ integration: buildIntegration() } as never);
    const order: string[] = [];
    getNovuProviderCredentials.execute.callsFake(async (args) => {
      order.push(`credentials:${args.recipientEmail}`);

      return sharedCredentials;
    });
    messageRepository.create.callsFake(async (data) => {
      order.push(`persist:${data.email}`);

      return { _id: `msg-${data.email}` } as never;
    });
    sendStub.callsFake(async () => {
      order.push('send');

      return {};
    });

    await useCase.execute(
      buildCommand({
        to: [' member@novu.co ', 'member@novu.co'],
        payload: { $sender_email: 'phish@evil.com' },
      })
    );

    expect(order).to.deep.equal([
      'credentials:member@novu.co',
      'persist:member@novu.co',
      'credentials:member@novu.co',
      'persist:member@novu.co',
      'send',
    ]);
    expect(getNovuProviderCredentials.execute.firstCall.args[0]).to.include({
      recipientEmail: 'member@novu.co',
      requireRecipientMatch: true,
      userId: 'user-1',
    });
    expect(getHandlerStub.firstCall.args[1]).to.equal('no-reply@novu.co');
    expect(sendStub.firstCall.args[0]).to.include({
      from: 'no-reply@novu.co',
      subject: 'Hello',
      html: '<p>Hello</p>',
    });
    expect(sendStub.firstCall.args[0].to).to.deep.equal(['member@novu.co', 'member@novu.co']);
    expect(sendStub.firstCall.args[0].bridgeProviderData).to.deep.equal({});
    expect(messageRepository.create.firstCall.args[0]).to.include({
      _organizationId: 'org-1',
      _environmentId: 'env-1',
      channel: ChannelTypeEnum.EMAIL,
      providerId: EmailProviderIdEnum.Novu,
      email: 'member@novu.co',
      subject: 'Hello',
    });
    expect(messageRepository.create.firstCall.args[0].tags).to.deep.equal(['test-email']);
    expect(messageRepository.delete.called).to.equal(false);
    expect(getHandlerStub.firstCall.args[0].credentials.apiKey).to.equal('shared-key');
  });

  it('does not send when a shared-provider recipient is rejected and releases the reservation', async () => {
    selectIntegration.execute.resolves({ integration: buildIntegration() } as never);
    getNovuProviderCredentials.execute.onFirstCall().resolves(sharedCredentials);
    getNovuProviderCredentials.execute.onSecondCall().rejects(new ForbiddenException('recipient locked'));
    messageRepository.create.resolves({ _id: 'msg-1' } as never);

    try {
      await useCase.execute(buildCommand({ to: ['member@novu.co', 'victim@example.com'] }));
      expect.fail('expected the recipient lock to reject the send');
    } catch (error) {
      expect(error).to.be.instanceOf(ForbiddenException);
    }

    expect(sendStub.called).to.equal(false);
    expect(messageRepository.create.calledOnce).to.equal(true);
    expect(messageRepository.delete.calledOnce).to.equal(true);
    expect(messageRepository.delete.firstCall.args[0]).to.deep.equal({
      _id: { $in: ['msg-1'] },
      _organizationId: 'org-1',
      _environmentId: 'env-1',
    });
    expect(getNovuProviderCredentials.execute.secondCall.args[0].recipientEmail).to.equal('victim@example.com');
  });

  it('keeps the shared-provider reservation when the provider send fails', async () => {
    selectIntegration.execute.resolves({ integration: buildIntegration() } as never);
    sendStub.rejects(new Error('provider down'));

    try {
      await useCase.execute(buildCommand({ to: 'member@novu.co' }));
      expect.fail('expected the provider failure to surface');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect((error as BadRequestException).message).to.equal('Unexpected provider error');
    }

    expect(messageRepository.create.calledOnce).to.equal(true);
    expect(messageRepository.delete.called).to.equal(false);
  });

  it('forwards bridge provider overrides for a customer provider', async () => {
    selectIntegration.execute.resolves({
      integration: buildIntegration({
        providerId: EmailProviderIdEnum.SendGrid,
        credentials: { apiKey: 'customer-key', from: 'team@customer.com' },
      }),
    } as never);
    previewStep.execute.resolves({
      outputs: { body: '<p>Bridge</p>', subject: 'Bridge subject' },
      providers: {
        [EmailProviderIdEnum.SendGrid]: {
          from: 'founder@customer.com',
          templateId: 'tpl-1',
        },
      },
    } as never);

    await useCase.execute(
      buildCommand({
        bridge: true,
        workflowId: 'workflow-1',
        stepId: 'step-1',
        to: 'customer@example.com',
        payload: { $sender_email: 'founder@customer.com' },
      })
    );

    expect(getNovuProviderCredentials.execute.called).to.equal(false);
    expect(messageRepository.create.called).to.equal(false);
    expect(sendStub.firstCall.args[0].from).to.equal('founder@customer.com');
    expect(sendStub.firstCall.args[0].to).to.deep.equal(['customer@example.com']);
    expect(sendStub.firstCall.args[0].bridgeProviderData).to.deep.equal({
      from: 'founder@customer.com',
      templateId: 'tpl-1',
    });
  });

  it('keeps customer-provider recipients and sender overrides', async () => {
    selectIntegration.execute.resolves({
      integration: buildIntegration({
        providerId: EmailProviderIdEnum.SendGrid,
        credentials: { apiKey: 'customer-key', from: 'team@customer.com' },
      }),
    } as never);

    await useCase.execute(
      buildCommand({
        to: ['customer@example.com', 'second@example.com'],
        payload: { $sender_email: 'founder@customer.com' },
      })
    );

    expect(getNovuProviderCredentials.execute.called).to.equal(false);
    expect(messageRepository.create.called).to.equal(false);
    expect(getHandlerStub.firstCall.args[1]).to.equal('founder@customer.com');
    expect(sendStub.firstCall.args[0].to).to.deep.equal(['customer@example.com', 'second@example.com']);
    expect(sendStub.firstCall.args[0].from).to.equal('founder@customer.com');
  });

  it('does not forward bridge provider overrides through the shared provider', async () => {
    selectIntegration.execute.resolves({ integration: buildIntegration() } as never);
    previewStep.execute.resolves({
      outputs: { body: '<p>Bridge</p>', subject: 'Bridge subject' },
      providers: {
        [EmailProviderIdEnum.Novu]: {
          from: 'phish@evil.com',
          to: ['victim@example.com'],
          personalizations: [{ to: [{ email: 'victim@example.com' }] }],
        },
      },
    } as never);

    await useCase.execute(
      buildCommand({
        bridge: true,
        workflowId: 'workflow-1',
        stepId: 'step-1',
        to: 'member@novu.co',
        payload: { $sender_email: 'phish@evil.com' },
      })
    );

    expect(sendStub.firstCall.args[0].from).to.equal('no-reply@novu.co');
    expect(sendStub.firstCall.args[0].to).to.deep.equal(['member@novu.co']);
    expect(sendStub.firstCall.args[0].bridgeProviderData).to.deep.equal({});
    expect(sendStub.firstCall.args[0].subject).to.equal('Bridge subject');
  });

  it('does not send when every recipient is blank', async () => {
    selectIntegration.execute.resolves({ integration: buildIntegration() } as never);

    await useCase.execute(buildCommand({ to: [' ', ''] }));

    expect(getNovuProviderCredentials.execute.called).to.equal(false);
    expect(messageRepository.create.called).to.equal(false);
    expect(sendStub.called).to.equal(false);
  });
});

function buildIntegration(overrides: Partial<IntegrationEntity> = {}): IntegrationEntity {
  return {
    _environmentId: 'env-1',
    _organizationId: 'org-1',
    providerId: EmailProviderIdEnum.Novu,
    channel: ChannelTypeEnum.EMAIL,
    credentials: { from: 'stored@example.com' },
    ...overrides,
  } as IntegrationEntity;
}

function buildCommand(overrides: Partial<SendTestEmailCommand> = {}): SendTestEmailCommand {
  return SendTestEmailCommand.create({
    userId: 'user-1',
    environmentId: 'env-1',
    organizationId: 'org-1',
    contentType: 'customHtml',
    payload: {},
    subject: 'Hello',
    content: '<p>Hello</p>',
    to: 'member@novu.co',
    controls: {},
    ...overrides,
  });
}
