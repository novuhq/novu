import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { SendblueChatProvider } from '@novu/providers/dist/cjs/lib/chat/sendblue/sendblue.provider';
import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import { restore, stub } from 'sinon';
import { SendSendblueTestMessageCommand } from './send-sendblue-test-message.command';
import { SendAgentSendblueTestMessage } from './send-sendblue-test-message.usecase';

const ENV_ID = 'env-id';
const ORG_ID = 'org-id';
const AGENT_ID = 'agent-mongo-id';
const INTEGRATION_ID = 'integration-mongo-id';
const SUBSCRIBER_ID = 'user-123';

function buildCommand(overrides: Partial<SendSendblueTestMessageCommand> = {}) {
  return SendSendblueTestMessageCommand.create({
    userId: 'user-id',
    environmentId: ENV_ID,
    organizationId: ORG_ID,
    agentIdentifier: 'my-agent',
    integrationIdentifier: 'sendblue-int',
    subscriberId: SUBSCRIBER_ID,
    ...overrides,
  });
}

describe('SendAgentSendblueTestMessage usecase', () => {
  let agentRepository: { findOne: sinon.SinonStub };
  let integrationRepository: { findOne: sinon.SinonStub };
  let agentIntegrationRepository: { findOne: sinon.SinonStub };
  let subscriberRepository: { findBySubscriberId: sinon.SinonStub };
  let logger: { setContext: sinon.SinonStub; warn: sinon.SinonStub };
  let sendMessageStub: sinon.SinonStub;

  function buildUsecase() {
    return new SendAgentSendblueTestMessage(
      agentRepository as any,
      integrationRepository as any,
      agentIntegrationRepository as any,
      subscriberRepository as any,
      logger as any
    );
  }

  beforeEach(() => {
    agentRepository = {
      findOne: stub().resolves({ _id: AGENT_ID, identifier: 'my-agent' }),
    };
    integrationRepository = {
      findOne: stub().resolves({
        _id: INTEGRATION_ID,
        providerId: ChatProviderIdEnum.Sendblue,
        credentials: {
          apiKey: 'key',
          secretKey: 'secret',
          from: '+15559990000',
        },
      }),
    };
    agentIntegrationRepository = {
      findOne: stub().resolves({ _id: 'link-id' }),
    };
    subscriberRepository = {
      findBySubscriberId: stub().resolves({ subscriberId: SUBSCRIBER_ID, phone: '+14155551234' }),
    };
    logger = {
      setContext: stub(),
      warn: stub(),
    };
    sendMessageStub = stub(SendblueChatProvider.prototype, 'sendMessage').resolves({
      id: 'sb-message-handle',
      date: '2023-10-01T12:00:00Z',
    });
  });

  afterEach(() => {
    restore();
  });

  it('throws when the subscriber is missing', async () => {
    subscriberRepository.findBySubscriberId.resolves(null);

    try {
      await buildUsecase().execute(buildCommand());
      expect.fail('Expected NotFoundException');
    } catch (error) {
      expect(error).to.be.instanceOf(NotFoundException);
    }
  });

  it('throws when the subscriber has no phone number', async () => {
    subscriberRepository.findBySubscriberId.resolves({ subscriberId: SUBSCRIBER_ID, phone: '' });

    try {
      await buildUsecase().execute(buildCommand());
      expect.fail('Expected UnprocessableEntityException');
    } catch (error) {
      expect(error).to.be.instanceOf(UnprocessableEntityException);
    }

    expect(sendMessageStub.called).to.equal(false);
  });

  it('returns missing_credentials when Sendblue credentials are incomplete', async () => {
    integrationRepository.findOne.resolves({
      _id: INTEGRATION_ID,
      providerId: ChatProviderIdEnum.Sendblue,
      credentials: { apiKey: 'key' },
    });

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(false);
    expect(result.error?.code).to.equal('missing_credentials');
    expect(sendMessageStub.called).to.equal(false);
  });

  it('sends using the subscriber phone number', async () => {
    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(true);
    expect(result.messageId).to.equal('sb-message-handle');
    expect(subscriberRepository.findBySubscriberId.calledOnceWithExactly(ENV_ID, SUBSCRIBER_ID)).to.equal(true);
    expect(sendMessageStub.calledOnce).to.equal(true);
    expect(sendMessageStub.firstCall.args[0].channelData.endpoint.phoneNumber).to.equal('+14155551234');
    expect((sendMessageStub.firstCall.thisValue as any).config.from).to.equal('+15559990000');
  });

  it('classifies a Sendblue-rejected send', async () => {
    sendMessageStub.rejects(new Error('Invalid number format'));

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(false);
    expect(result.error?.code).to.equal('invalid_recipient');
  });

  it('classifies an unverified recipient on a shared-line plan', async () => {
    sendMessageStub.rejects(new Error('Recipient must be verified as a contact before sending'));

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(false);
    expect(result.error?.code).to.equal('recipient_not_verified');
  });

  it('keeps transport failures generic', async () => {
    sendMessageStub.rejects(Object.assign(new Error('timeout of 10000ms exceeded'), { code: 'ECONNABORTED' }));

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(false);
    expect(result.error?.code).to.equal('unknown');
  });
});
