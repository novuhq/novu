import { Test, TestingModule } from '@nestjs/testing';
import { InboundEmailParse, IUserWebhookPayload } from '../usecases/inbound-email-parse/inbound-email-parse.usecase';
import { EnvironmentRepository, JobRepository, MessageRepository, SubscriberEntity } from '@novu/dal';
import { expect } from 'chai';
import { InboundEmailParseCommand } from '../usecases/inbound-email-parse/inbound-email-parse.command';
import { ChannelTypeEnum, EmailBlockTypeEnum, StepTypeEnum } from '@novu/shared';
import { sendTrigger } from '../../events/e2e/trigger-event.e2e';
import { UserSession } from '@novu/testing';
import { CreateTemplatePayload } from '@novu/testing/src/create-notification-template.interface';
import { SubscribersService } from '@novu/testing/src';
import axios from 'axios';
import * as sinon from 'sinon';
import { CompileTemplate } from '@novu/application-generic';

const USER_MAIL_DOMAIN = 'mail.domain.com';
const USER_PARSE_WEBHOOK = 'user-parse.com/webhook/{{compiledVariable}}';

describe('Should handle the new arrived mail', () => {
  let inboundEmailParseUsecase: InboundEmailParse;
  let session: UserSession;

  const environmentRepository = new EnvironmentRepository();
  const messageRepository = new MessageRepository();

  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;

  let sandbox;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();

    session = new UserSession();
    await session.initialize();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();

    const module: TestingModule = await Test.createTestingModule({
      providers: [InboundEmailParse, JobRepository, MessageRepository, CompileTemplate],
    }).compile();

    inboundEmailParseUsecase = module.get<InboundEmailParse>(InboundEmailParse);
  });

  afterEach(async () => {
    sandbox.restore();
  });

  it('should send webhook request to the users webhook', async () => {
    const message = await triggerEmail();

    const mail = getMailData(message);

    const getStub = sandbox.stub(axios, 'post').resolves();

    await inboundEmailParseUsecase.execute(InboundEmailParseCommand.create(mail));

    sinon.assert.calledOnce(getStub);
    getStub.calledWith(sinon.match.array);
    const args = getStub.getCall(0).args;

    const webhook: string = args[0];
    const payload: IUserWebhookPayload = args[1];

    // Should compile the payload variables
    expect(webhook).to.equal(USER_PARSE_WEBHOOK.replace('{{compiledVariable}}', 'test-env'));
    expect(payload.mail).to.be.ok;
    expect(payload.payload).to.ok;
    expect(payload.template).to.ok;
    expect(payload.message).to.ok;
    expect(payload.transactionId).to.ok;
    expect(payload.hmac).to.ok;
    expect(payload.notification).to.ok;
    expect(payload.templateIdentifier).to.ok;
  });

  it('should not send webhook request with missing transactionId', async () => {
    try {
      const message = await triggerEmail();
      const mail = getMailData(message, false);

      await inboundEmailParseUsecase.execute(InboundEmailParseCommand.create(mail));
    } catch (e) {
      expect(e.message).to.contains('Missing transactionId on address');
    }
  });

  it('should not send webhook request with when domain white list', async () => {
    try {
      const message = await triggerEmail(true, false);

      const mail = getMailData(message);

      await inboundEmailParseUsecase.execute(InboundEmailParseCommand.create(mail));
    } catch (e) {
      expect(e.message).to.equal('Domain is not in environment white list');
    }
  });

  it('should not send webhook request when missing replay callback url', async () => {
    try {
      const message = await triggerEmail(true, true, true, false);

      const mail = getMailData(message);

      await inboundEmailParseUsecase.execute(InboundEmailParseCommand.create(mail));
    } catch (e) {
      expect(e.message).to.contains('Missing parse webhook on template');
    }
  });

  async function triggerEmail(
    mxRecordConfigured = true,
    inboundParseDomain = true,
    replyCallbackActive = true,
    replyCallbackUrl = true
  ) {
    await environmentRepository.update(
      { _id: session.environment._id, _organizationId: session.organization._id },
      {
        $set: {
          dns: {
            mxRecordConfigured: mxRecordConfigured,
            inboundParseDomain: inboundParseDomain ? USER_MAIL_DOMAIN : undefined,
          },
        },
      }
    );

    const template = await createTemplate(session, replyCallbackActive, replyCallbackUrl);

    await sendTrigger(session, template, subscriber.subscriberId);

    await session.awaitRunningJobs(template._id);

    return await messageRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: subscriber._id,
      channel: ChannelTypeEnum.EMAIL,
    });
  }

  function getMailData(message, transactionId = true, environmentId = true) {
    const mail = JSON.parse(mailData) as InboundEmailParseCommand;
    mail.to[0].address = `parse+${transactionId ? message.transactionId : ''}-nv-e=${
      environmentId ? message._environmentId : ''
    }@${USER_MAIL_DOMAIN}`;

    return mail;
  }
});

async function createTemplate(session: UserSession, replyCallbackActive = true, replyCallbackUrl = true) {
  const test: Partial<CreateTemplatePayload> = {
    steps: [
      {
        replyCallback: { active: replyCallbackActive, url: replyCallbackUrl ? USER_PARSE_WEBHOOK : '' },
        type: StepTypeEnum.EMAIL,
        name: 'Message Name',
        subject: 'Test email {{nested.subject}}',
        content: [
          {
            type: EmailBlockTypeEnum.TEXT,
            content: 'Hello {{subscriber.lastName}}, Welcome to {{organizationName}}' as string,
          },
        ],
      },
    ],
  };

  return await session.createTemplate(test);
}

const mailData =
  '{"html":"<b>This is a test email sent to a local SMTP server.</b>","text":"This is a test email sent to a local SMTP server.","headers":{"content-type":"multipart/alternative; boundary=\\"--_NmP-f7fda3731bcaef89-Part_1\\"","from":"sender@example.com","to":"parse+c50420f2-6aef-48f5-9a41-3c9dd1a81ba5-nv-e=63945d20068f12be94e79cb0@local-demo.com","subject":"Test email","message-id":"<705c2187-b2ad-2b1e-e3fc-9f40a840e736@example.com>","date":"Wed, 25 Jan 2023 20:37:24 +0000","mime-version":"1.0"},"subject":"Test email","messageId":"705c2187-b2ad-2b1e-e3fc-9f40a840e736@example.com","priority":"normal","from":[{"address":"sender@example.com","name":""}],"to":[{"address":"parse+c50420f2-6aef-48f5-9a41-3c9dd1a81ba5-nv-e=63945d20068f12be94e79cb0@local-demo.com","name":""}],"date":"2023-01-25T20:37:24.000Z","dkim":"failed","spf":"failed","spamScore":0,"language":"english","cc":[],"connection":{"id":"bb49053e-a142-4492-9459-61d7960b0857","remoteAddress":"127.0.0.1","remotePort":55722,"clientHostname":"[127.0.0.1]","openingCommand":"HELLO","hostNameAppearsAs":"[127.0.0.1]","xClient":{},"xForward":{},"transmissionType":"ESMTPS","tlsOptions":{"name":"TLS_AES_256_GCM_SHA384","standardName":"TLS_AES_256_GCM_SHA384","version":"TLSv1.3"},"envelope":{"mailFrom":{"address":"sender@example.com","args":false},"rcptTo":[{"address":"parse+c50420f2-6aef-48f5-9a41-3c9dd1a81ba5@local-demo.com","args":false}]},"transaction":1,"mailPath":".tmp/bb49053e-a142-4492-9459-61d7960b0857"},"envelopeFrom":{"address":"sender@example.com","args":false},"envelopeTo":[{"address":"parse+c50420f2-6aef-48f5-9a41-3c9dd1a81ba5-nv-e=63945d20068f12be94e79cb0@local-demo.com","args":false}]}\n';
