import axios, { AxiosResponse } from 'axios';
import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';
import * as sinon from 'sinon';

import { JobRepository, MessageRepository } from '@novu/dal';
import { CompileTemplate } from '@novu/application-generic';

import { InboundEmailParse, IUserWebhookPayload } from '../usecases/inbound-email-parse/inbound-email-parse.usecase';
import { InboundEmailParseCommand } from '../usecases/inbound-email-parse/inbound-email-parse.command';
const axiosInstance = axios.create();

const eventTriggerPath = '/v1/events/trigger';
const USER_MAIL_DOMAIN = 'mail.domain.com';
const USER_PARSE_WEBHOOK = 'user-parse.com/webhook/{{compiledVariable}}';

describe('Should handle the new arrived mail', () => {
  let inboundEmailParseUsecase: InboundEmailParse;

  let sandbox;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();

    const module: TestingModule = await Test.createTestingModule({
      providers: [InboundEmailParse, JobRepository, MessageRepository, CompileTemplate],
    }).compile();

    inboundEmailParseUsecase = module.get<InboundEmailParse>(InboundEmailParse);
  });

  afterEach(async () => {
    sandbox.restore();
  });

  it('should send webhook request to the users webhook', async () => {
    const mail = getMailData();

    const axiosPostStub = sandbox.stub(axios, 'post').resolves();
    const getEntitiesStub = sandbox.stub(inboundEmailParseUsecase, 'getEntities').resolves(getEntitiesStubObject);

    await inboundEmailParseUsecase.execute(InboundEmailParseCommand.create(mail));

    sinon.assert.calledOnce(axiosPostStub);
    axiosPostStub.calledWith(sinon.match.array);
    const args = axiosPostStub.getCall(0).args;

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
      // const message = await triggerEmail();
      const mail = getMailData({ skipTransactionId: true });

      await inboundEmailParseUsecase.execute(InboundEmailParseCommand.create(mail));

      throw new Error('Should not reach here, en error should be thrown');
    } catch (e) {
      expect(e.message).to.contains('Missing transactionId on address');
    }
  });

  it('should not send webhook request with when domain white list', async () => {
    try {
      const mail = getMailData({ userDomain: 'invalid-domain.com' });
      const getEntitiesStub = sandbox.stub(inboundEmailParseUsecase, 'getEntities').resolves(getEntitiesStubObject);

      await inboundEmailParseUsecase.execute(InboundEmailParseCommand.create(mail));

      throw new Error('Should not reach here, en error should be thrown');
    } catch (e) {
      expect(e.message).to.equal('Domain is not in environment white list');
    }
  });

  it('should not send webhook request when missing replay callback url', async () => {
    try {
      const entitiesWithMissingParseWebhook = getEntitiesStubObject;
      entitiesWithMissingParseWebhook.template.steps[0].replyCallback = {} as any;

      const mail = getMailData();
      const getEntitiesStub = sandbox
        .stub(inboundEmailParseUsecase, 'getEntities')
        .resolves(entitiesWithMissingParseWebhook);

      await inboundEmailParseUsecase.execute(InboundEmailParseCommand.create(mail));

      throw new Error('Should not reach here, en error should be thrown');
    } catch (e) {
      expect(e.message).to.contains('Missing parse webhook on template');
    }
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

    const parsedTransactionId = skipTransactionId ? '' : transactionId ? transactionId : mailTransactionId;

    mail.to[0].address = `parse+${parsedTransactionId}-nv-e=${environmentId ? environmentId : mailTransactionId}@${
      userDomain ? userDomain : USER_MAIL_DOMAIN
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
          url: 'user-parse.com/webhook/{{compiledVariable}}',
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
    expireAt: '2024-01-16T09:41:20.863Z',
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
        url: 'user-parse.com/webhook/{{compiledVariable}}',
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
    expireAt: '2024-01-16T09:41:20.863Z',
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
    expireAt: '2024-01-16T09:41:20.940Z',
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
