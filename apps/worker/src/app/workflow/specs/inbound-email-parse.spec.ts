import { Test, TestingModule } from '@nestjs/testing';
import {
  AttachmentRehydrator,
  CompileTemplate,
  HttpClientService,
  InboundDomainRouteDelivery,
  PinoLogger,
  SendWebhookMessage,
} from '@novu/application-generic';

// The top-level @novu/application-generic re-exports helpers via Object.defineProperty
// getters, which sinon cannot replace. Stub the underlying source module instead — the
// re-export getter delegates to it so backend code picks up the stub.
const ssrfUrlValidationModule = require('@novu/application-generic/build/main/utils/ssrf-url-validation');

import {
  AgentIntegrationRepository,
  AgentRepository,
  DomainRepository,
  DomainRouteRepository,
  IntegrationRepository,
  JobRepository,
  MessageRepository,
} from '@novu/dal';
import axios, { AxiosResponse } from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';
import { InboundEmailParseCommand } from '../usecases/inbound-email-parse/inbound-email-parse.command';
import { InboundEmailParse } from '../usecases/inbound-email-parse/inbound-email-parse.usecase';
import { LogInboundEmailRequest } from '../usecases/inbound-email-parse/log-inbound-email-request.usecase';
import { DomainRouteStrategy } from '../usecases/inbound-email-parse/strategies/domain-route.strategy';
import { IUserWebhookPayload, ReplyToStrategy } from '../usecases/inbound-email-parse/strategies/reply-to.strategy';

const axiosInstance = axios.create();

const eventTriggerPath = '/v1/events/trigger';
const USER_MAIL_DOMAIN = 'mail.domain.com';
const USER_PARSE_WEBHOOK = 'https://example.com/webhook/{{compiledVariable}}';

describe('Should handle the new arrived mail', () => {
  let inboundEmailParseUsecase: InboundEmailParse;
  let replyToStrategy: ReplyToStrategy;
  let compileTemplate: sinon.SinonStubbedInstance<CompileTemplate>;

  let sandbox;
  let attachmentRehydrator: sinon.SinonStubbedInstance<AttachmentRehydrator>;
  let logInboundEmailRequest: sinon.SinonStubbedInstance<LogInboundEmailRequest>;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();

    compileTemplate = sandbox.createStubInstance(CompileTemplate);
    attachmentRehydrator = sandbox.createStubInstance(AttachmentRehydrator);
    logInboundEmailRequest = sandbox.createStubInstance(LogInboundEmailRequest);
    // Default: return empty array (no attachments to rehydrate)
    attachmentRehydrator.rehydrate.resolves([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboundEmailParse,
        ReplyToStrategy,
        DomainRouteStrategy,
        { provide: LogInboundEmailRequest, useValue: logInboundEmailRequest },
        { provide: JobRepository, useValue: sandbox.createStubInstance(JobRepository) },
        { provide: MessageRepository, useValue: sandbox.createStubInstance(MessageRepository) },
        { provide: DomainRepository, useValue: sandbox.createStubInstance(DomainRepository) },
        { provide: DomainRouteRepository, useValue: sandbox.createStubInstance(DomainRouteRepository) },
        { provide: AgentRepository, useValue: sandbox.createStubInstance(AgentRepository) },
        { provide: InboundDomainRouteDelivery, useValue: sandbox.createStubInstance(InboundDomainRouteDelivery) },
        { provide: SendWebhookMessage, useValue: sandbox.createStubInstance(SendWebhookMessage) },
        { provide: CompileTemplate, useValue: compileTemplate },
        { provide: HttpClientService, useValue: sandbox.createStubInstance(HttpClientService) },
        { provide: IntegrationRepository, useValue: sandbox.createStubInstance(IntegrationRepository) },
        { provide: AgentIntegrationRepository, useValue: sandbox.createStubInstance(AgentIntegrationRepository) },
        { provide: AttachmentRehydrator, useValue: attachmentRehydrator },
        { provide: PinoLogger, useValue: sandbox.createStubInstance(PinoLogger) },
      ],
    }).compile();

    inboundEmailParseUsecase = module.get<InboundEmailParse>(InboundEmailParse);
    replyToStrategy = module.get<ReplyToStrategy>(ReplyToStrategy);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should send webhook request to the users webhook', async () => {
    const mail = getMailData();

    const safeRequestStub = sandbox.stub(ssrfUrlValidationModule, 'safeOutboundJsonRequest').resolves({
      statusCode: 200,
      statusMessage: 'OK',
      headers: {},
      body: {},
    } as any);
    sandbox.stub(replyToStrategy as any, 'getEntities').resolves(getEntitiesStubObject);
    compileTemplate.execute.resolves(USER_PARSE_WEBHOOK.replace('{{compiledVariable}}', 'test-env'));

    await inboundEmailParseUsecase.execute(InboundEmailParseCommand.create(mail));

    sinon.assert.calledOnce(safeRequestStub);
    const callArgs = safeRequestStub.getCall(0).args[0] as {
      url: string;
      method: string;
      body: IUserWebhookPayload;
    };

    expect(callArgs.url).to.equal(USER_PARSE_WEBHOOK.replace('{{compiledVariable}}', 'test-env'));
    expect(callArgs.method).to.equal('POST');
    const payload = callArgs.body;
    expect(payload.mail).to.be.ok;
    expect(payload.payload).to.ok;
    expect(payload.template).to.ok;
    expect(payload.message).to.ok;
    expect(payload.transactionId).to.ok;
    expect(payload.hmac).to.ok;
    expect(payload.notification).to.ok;
    expect(payload.templateIdentifier).to.ok;

    // Successful reply-to delivery should emit a request log with a 200 outcome.
    sinon.assert.calledOnce(logInboundEmailRequest.execute);
    const logArg = logInboundEmailRequest.execute.getCall(0).args[0];
    expect(logArg.outcome.strategy).to.equal('reply-to');
    expect(logArg.outcome.status).to.equal(200);
    expect(logArg.outcome.organizationId).to.equal('657ec2402c5ac81fb1e0efb6');
  });

  it('should include rehydrated attachments in the reply-to webhook payload', async () => {
    const rehydratedAttachment = {
      filename: 'test.pdf',
      contentType: 'application/pdf',
      size: 1024,
      url: 'https://s3.example.com/inbound-mail/2024-01-01/msg-id/uuid-test.pdf?presigned=1',
      storagePath: 'inbound-mail/2024-01-01/msg-id/uuid-test.pdf',
      content: { type: 'Buffer' as const, data: [37, 80, 68, 70] },
      contentBytes: 1024,
    };
    attachmentRehydrator.rehydrate.resolves([rehydratedAttachment]);

    const mail = getMailData();
    const safeRequestStub = sandbox.stub(ssrfUrlValidationModule, 'safeOutboundJsonRequest').resolves({
      statusCode: 200,
      statusMessage: 'OK',
      headers: {},
      body: {},
    } as any);
    sandbox.stub(replyToStrategy as any, 'getEntities').resolves(getEntitiesStubObject);
    compileTemplate.execute.resolves(USER_PARSE_WEBHOOK.replace('{{compiledVariable}}', 'test-env'));

    // Inject a slim attachment into the command (as it would arrive from the queue)
    const slimAttachment = {
      filename: 'test.pdf',
      contentType: 'application/pdf',
      size: 1024,
      url: 'https://s3.example.com/inbound-mail/2024-01-01/msg-id/uuid-test.pdf?presigned=1',
      storagePath: 'inbound-mail/2024-01-01/msg-id/uuid-test.pdf',
    };
    (mail as any).attachments = [slimAttachment];

    await inboundEmailParseUsecase.execute(InboundEmailParseCommand.create(mail));

    sinon.assert.calledOnce(safeRequestStub);
    const callArgs = safeRequestStub.getCall(0).args[0] as { body: IUserWebhookPayload };
    const mailPayload = callArgs.body.mail;

    // Rehydrator should have been called with the slim queue attachment. We compare by
    // shape rather than reference because @Type(() => InboundParseAttachmentCommand) on
    // the command field causes plainToInstance to build a class instance, so the arg is
    // not === the original plain object.
    sinon.assert.calledOnce(attachmentRehydrator.rehydrate);
    const rehydrateArg = attachmentRehydrator.rehydrate.firstCall.args[0]!;
    expect(rehydrateArg).to.have.length(1);
    expect(rehydrateArg[0]).to.deep.include(slimAttachment);

    // Webhook should carry BOTH the new url/size AND the legacy content for backward compatibility
    expect(mailPayload.attachments).to.have.length(1);
    const att = mailPayload.attachments![0];
    expect(att.url).to.equal(rehydratedAttachment.url);
    expect(att.size).to.equal(1024);
    expect(att.storagePath).to.equal(rehydratedAttachment.storagePath);
    expect(att.content).to.deep.equal({ type: 'Buffer', data: [37, 80, 68, 70] });
    expect(att.contentBytes).to.equal(1024);
    // No raw Buffer-shaped content.data numeric arrays sitting directly in the queue fixture
    expect((slimAttachment as any).content).to.be.undefined;
  });

  it('should pass inline-mode attachments through to the reply-to webhook without S3 metadata', async () => {
    const inlineAttachment = {
      filename: 'inline.txt',
      contentType: 'text/plain',
      size: 5,
      content: { type: 'Buffer' as const, data: [104, 101, 108, 108, 111] },
      contentBytes: 5,
    };
    // Rehydrator is a no-op in inline mode (see AttachmentRehydrator.rehydrateSingle)
    attachmentRehydrator.rehydrate.resolves([inlineAttachment]);

    const mail = getMailData();
    const safeRequestStub = sandbox.stub(ssrfUrlValidationModule, 'safeOutboundJsonRequest').resolves({
      statusCode: 200,
      statusMessage: 'OK',
      headers: {},
      body: {},
    } as any);
    sandbox.stub(replyToStrategy as any, 'getEntities').resolves(getEntitiesStubObject);
    compileTemplate.execute.resolves(USER_PARSE_WEBHOOK.replace('{{compiledVariable}}', 'test-env'));

    // Inject an inline-shape attachment into the queue payload (no url / no storagePath).
    const inlineQueueAttachment = {
      filename: 'inline.txt',
      contentType: 'text/plain',
      size: 5,
      content: { type: 'Buffer', data: [104, 101, 108, 108, 111] },
    };
    (mail as any).attachments = [inlineQueueAttachment];

    await inboundEmailParseUsecase.execute(InboundEmailParseCommand.create(mail));

    sinon.assert.calledOnce(safeRequestStub);
    const callArgs = safeRequestStub.getCall(0).args[0] as { body: IUserWebhookPayload };
    const mailPayload = callArgs.body.mail;

    sinon.assert.calledOnce(attachmentRehydrator.rehydrate);
    const rehydrateArg = attachmentRehydrator.rehydrate.firstCall.args[0]!;
    expect(rehydrateArg).to.have.length(1);
    expect(rehydrateArg[0]).to.deep.include({ filename: 'inline.txt', size: 5 });

    expect(mailPayload.attachments).to.have.length(1);
    const att = mailPayload.attachments![0];
    expect(att.filename).to.equal('inline.txt');
    expect(att.size).to.equal(5);
    expect(att.content).to.deep.equal({ type: 'Buffer', data: [104, 101, 108, 108, 111] });
    expect(att.url).to.be.undefined;
    expect(att.storagePath).to.be.undefined;
  });

  it('should not send webhook request with missing transactionId', async () => {
    const mail = getMailData({ skipTransactionId: true });

    await inboundEmailParseUsecase.execute(InboundEmailParseCommand.create(mail));

    // Malformed addresses are non-retriable — log a warning trace and stop.
    sinon.assert.calledOnce(logInboundEmailRequest.logUnresolvedFailure);
    const logArg = logInboundEmailRequest.logUnresolvedFailure.getCall(0).args[0];
    expect(logArg.message).to.contain('Missing transactionId on address');
    expect(logArg.severity).to.equal('warning');
  });

  it('should not send webhook request with when domain white list', async () => {
    const mail = getMailData({ userDomain: 'invalid-domain.com' });
    sandbox.stub(replyToStrategy as any, 'getEntities').resolves(getEntitiesStubObject);

    await inboundEmailParseUsecase.execute(InboundEmailParseCommand.create(mail));

    // Post-resolution 422 failures are non-retriable — trace once and stop.
    sinon.assert.calledOnce(logInboundEmailRequest.execute);
    const logArg = logInboundEmailRequest.execute.getCall(0).args[0];
    expect(logArg.outcome.status).to.equal(422);
    expect(logArg.outcome.strategy).to.equal('reply-to');
    expect(logArg.outcome.message).to.equal('Domain is not in environment white list');
  });

  it('should not send webhook request when missing replay callback url', async () => {
    const entitiesWithMissingParseWebhook = getEntitiesStubObject;
    entitiesWithMissingParseWebhook.template.steps[0].replyCallback = {} as any;

    const mail = getMailData();
    sandbox.stub(replyToStrategy as any, 'getEntities').resolves(entitiesWithMissingParseWebhook);

    await inboundEmailParseUsecase.execute(InboundEmailParseCommand.create(mail));

    sinon.assert.calledOnce(logInboundEmailRequest.execute);
    const logArg = logInboundEmailRequest.execute.getCall(0).args[0];
    expect(logArg.outcome.status).to.equal(422);
    expect(logArg.outcome.message).to.contain('Missing parse webhook on template');
  });

  interface IMailData {
    message?: any;
    transactionId?: string;
    environmentId?: string;
    userDomain?: string;
    skipTransactionId?: boolean;
  }

  function getMailData({ transactionId, environmentId, userDomain, skipTransactionId }: IMailData = {}) {
    const mail = JSON.parse(mailData) as InboundEmailParseCommand;

    const userNameDelimiter = '-nv-e=';

    const [user, domain] = mail.to[0].address.split('@');
    const toMetaIds = user.split('+')[1];
    const [mailTransactionId, mailEnvironmentId] = toMetaIds.split(userNameDelimiter);

    const parsedTransactionId = skipTransactionId ? '' : transactionId || mailTransactionId;

    mail.to[0].address = `parse+${parsedTransactionId}-nv-e=${environmentId || mailTransactionId}@${
      userDomain || USER_MAIL_DOMAIN
    }`;

    return mail;
  }
});

const mailData =
  '{"html":"<b>This is a test email sent to a local SMTP server.</b>","text":"This is a test email sent to a local SMTP server.","headers":{"content-type":"multipart/alternative; boundary=\\"--_NmP-f7fda3731bcaef89-Part_1\\"","from":"sender@example.com","to":"parse+c50420f2-6aef-48f5-9a41-3c9dd1a81ba5-nv-e=63945d20068f12be94e79cb0@local-demo.com","subject":"Test email","message-id":"<705c2187-b2ad-2b1e-e3fc-9f40a840e736@example.com>","date":"Wed, 25 Jan 2023 20:37:24 +0000","mime-version":"1.0"},"subject":"Test email","messageId":"705c2187-b2ad-2b1e-e3fc-9f40a840e736@example.com","priority":"normal","from":[{"address":"sender@example.com","name":""}],"to":[{"address":"parse+c50420f2-6aef-48f5-9a41-3c9dd1a81ba5-nv-e=63945d20068f12be94e79cb0@local-demo.com","name":""}],"date":"2023-01-25T20:37:24.000Z","dkim":"failed","spf":"failed","spamScore":0,"language":"english","cc":[],"connection":{"id":"bb49053e-a142-4492-9459-61d7960b0857","remoteAddress":"127.0.0.1","remotePort":55722,"clientHostname":"[127.0.0.1]","openingCommand":"HELLO","hostNameAppearsAs":"[127.0.0.1]","xClient":{},"xForward":{},"transmissionType":"ESMTPS","tlsOptions":{"name":"TLS_AES_256_GCM_SHA384","standardName":"TLS_AES_256_GCM_SHA384","version":"TLSv1.3"},"envelope":{"mailFrom":{"address":"sender@example.com","args":false},"rcptTo":[{"address":"parse+c50420f2-6aef-48f5-9a41-3c9dd1a81ba5@local-demo.com","args":false}]},"transaction":1,"mailPath":".tmp/bb49053e-a142-4492-9459-61d7960b0857"},"envelopeFrom":{"address":"sender@example.com","args":false},"envelopeTo":[{"address":"parse+c50420f2-6aef-48f5-9a41-3c9dd1a81ba5-nv-e=63945d20068f12be94e79cb0@local-demo.com","args":false}]}\n';

const getEntitiesStubObject = {
  template: {
    _id: '657ec2402c5ac81fb1e0f007',
    steps: [
      {
        active: true,
        replyCallback: {
          active: true,
          url: 'https://example.com/webhook/{{compiledVariable}}',
        },
        shouldStopOnFail: false,
        filters: [],
        _templateId: '657ec2402c5ac81fb1e0f005',
        metadata: {
          timed: {
            weekDays: [],
            monthDays: [],
          },
        },
        variants: [],
        _id: '657ec2402c5ac81fb1e0f00c',
      },
    ],
  },
  notification: {
    _id: '657ec24013bdfd2ae0785f3f',
    _templateId: '657ec2402c5ac81fb1e0f007',
    _environmentId: '657ec2402c5ac81fb1e0efbc',
    _organizationId: '657ec2402c5ac81fb1e0efb6',
    _subscriberId: '657ec2402c5ac81fb1e0efff',
    transactionId: 'ec7d3f9b-ede7-4287-8761-0b192d473f7c',
    channels: ['email'],
    to: {
      subscriberId: '657ec2402c5ac81fb1e0effe',
      lastName: 'Smith',
      email: 'test@email.novu',
    },
    payload: {
      organizationName: 'Umbrella Corp',
      compiledVariable: 'test-env',
    },
    createdAt: '2023-12-17T09:41:20.863Z',
    updatedAt: '2023-12-17T09:41:20.863Z',
    __v: 0,
  },
  subscriber: {
    _id: '657ec2402c5ac81fb1e0efff',
    subscriberId: '657ec2402c5ac81fb1e0effe',
  },
  environment: {
    _id: '657ec2402c5ac81fb1e0efbc',
    apiKeys: [
      {
        key: 'e088ccce-d18c-42d6-9acb-a40b232b846f',
        _userId: '657ec2402c5ac81fb1e0efb4',
        _id: '657ec2402c5ac81fb1e0efbd',
      },
    ],
    dns: {
      mxRecordConfigured: true,
      inboundParseDomain: 'mail.domain.com',
    },
  },
  job: {
    _id: '657ec24013bdfd2ae0785f41',
    identifier: 'test-event-6f1b2973-d4bd-44fc-889e-4b9024eb2bea',
    status: 'completed',
    payload: {
      organizationName: 'Umbrella Corp',
      compiledVariable: 'test-env',
    },
    tenant: null,
    step: {
      replyCallback: {
        active: true,
        url: 'https://example.com/webhook/{{compiledVariable}}',
      },
      metadata: {
        timed: {
          weekDays: [],
          monthDays: [],
        },
      },
      active: true,
      shouldStopOnFail: false,
      filters: [],
      _templateId: '657ec2402c5ac81fb1e0f005',
      variants: [],
      _id: '657ec2402c5ac81fb1e0f00c',
      id: '657ec2402c5ac81fb1e0f00c',
      template: {
        _id: '657ec2402c5ac81fb1e0f005',
        type: 'email',
        active: true,
        name: 'Message Name',
        subject: 'Test email {{nested.subject}}',
        variables: [],
        content: [
          {
            type: 'text',
            content: 'Hello {{subscriber.lastName}}, Welcome to {{organizationName}}',
          },
        ],
        _environmentId: '657ec2402c5ac81fb1e0efbc',
        _organizationId: '657ec2402c5ac81fb1e0efb6',
        _creatorId: '657ec2402c5ac81fb1e0efb4',
        _feedId: '657ec2402c5ac81fb1e0efeb',
        _layoutId: '657ec2402c5ac81fb1e0efc1',
        deleted: false,
        createdAt: '2023-12-17T09:41:20.768Z',
        updatedAt: '2023-12-17T09:41:20.768Z',
        __v: 0,
        id: '657ec2402c5ac81fb1e0f005',
      },
    },
    _templateId: '657ec2402c5ac81fb1e0f007',
    transactionId: 'ec7d3f9b-ede7-4287-8761-0b192d473f7c',
    _notificationId: '657ec24013bdfd2ae0785f3f',
    subscriberId: '657ec2402c5ac81fb1e0effe',
    _subscriberId: '657ec2402c5ac81fb1e0efff',
    _userId: '657ec2402c5ac81fb1e0efb4',
    _organizationId: '657ec2402c5ac81fb1e0efb6',
    _environmentId: '657ec2402c5ac81fb1e0efbc',
    digest: {
      events: [],
      timed: {
        weekDays: [],
        monthDays: [],
      },
    },
    type: 'email',
    providerId: 'sendgrid',
    createdAt: '2023-12-17T09:41:20.866Z',
    __v: 0,
    updatedAt: '2023-12-17T09:41:20.978Z',
  },
  message: {
    cta: {
      action: {
        buttons: [],
      },
    },
    _id: '657ec24013bdfd2ae0785f54',
    _templateId: '657ec2402c5ac81fb1e0f007',
    _environmentId: '657ec2402c5ac81fb1e0efbc',
    _messageTemplateId: '657ec2402c5ac81fb1e0f005',
    _notificationId: '657ec24013bdfd2ae0785f3f',
    _organizationId: '657ec2402c5ac81fb1e0efb6',
    _subscriberId: '657ec2402c5ac81fb1e0efff',
    _jobId: '657ec24013bdfd2ae0785f41',
    templateIdentifier: 'test-event-6f1b2973-d4bd-44fc-889e-4b9024eb2bea',
    email: 'test@email.novu',
    subject: 'Test email',
    channel: 'email',
    providerId: 'sendgrid',
    deviceTokens: [],
    seen: false,
    read: false,
    status: 'sent',
    transactionId: 'ec7d3f9b-ede7-4287-8761-0b192d473f7c',
    payload: {
      organizationName: 'Umbrella Corp',
      compiledVariable: 'test-env',
    },
    deleted: false,
    createdAt: '2023-12-17T09:41:20.940Z',
    updatedAt: '2023-12-17T09:41:20.970Z',
    __v: 0,
    content: [
      {
        type: 'text',
        content: 'Hello Smith, Welcome to Umbrella Corp',
        url: '',
      },
    ],
    id: '657ec24013bdfd2ae0785f54',
  },
};
export async function sendTrigger(
  session,
  template,
  newSubscriberIdInAppNotification: string,
  payload: Record<string, unknown> = {},
  overrides: Record<string, unknown> = {},
  tenant?: string,
  actor?: string
): Promise<AxiosResponse> {
  return await axiosInstance.post(
    `${session.serverUrl}${eventTriggerPath}`,
    {
      name: template.triggers[0].identifier,
      to: [{ subscriberId: newSubscriberIdInAppNotification, lastName: 'Smith', email: 'test@email.novu' }],
      payload: {
        organizationName: 'Umbrella Corp',
        compiledVariable: 'test-env',
        ...payload,
      },
      overrides,
      tenant,
      actor,
    },
    {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    }
  );
}
