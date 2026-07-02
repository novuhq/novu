import { EmailProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon, { restore, stub } from 'sinon';

import { AgentPlatformEnum } from '../../../shared/enums/agent-platform.enum';
import { SendAgentWelcomeMessageCommand } from './send-agent-welcome-message.command';
import { SendAgentWelcomeMessage } from './send-agent-welcome-message.usecase';

const ENV_ID = 'env-id';
const ORG_ID = 'org-id';
const USER_ID = 'user-123';
const AGENT_ID = 'agent-mongo-id';
const INTEGRATION_IDENTIFIER = 'novu-email-agent';

function buildCommand(overrides: Partial<SendAgentWelcomeMessageCommand> = {}) {
  return SendAgentWelcomeMessageCommand.create({
    userId: USER_ID,
    environmentId: ENV_ID,
    organizationId: ORG_ID,
    agentIdentifier: 'my-agent',
    integrationIdentifier: INTEGRATION_IDENTIFIER,
    ...overrides,
  });
}

describe('SendAgentWelcomeMessage usecase', () => {
  let agentRepository: { findOne: sinon.SinonStub };
  let integrationRepository: { findOne: sinon.SinonStub };
  let channelEndpointRepository: { findOne: sinon.SinonStub };
  let subscriberRepository: { findBySubscriberId: sinon.SinonStub };
  let conversationService: {
    createOrGetConversation: sinon.SinonStub;
    findByAgentIntegrationParticipant: sinon.SinonStub;
    getPrimaryChannel: sinon.SinonStub;
    persistAgentMessage: sinon.SinonStub;
  };
  let analyticsService: { track: sinon.SinonStub };
  let outboundGateway: { sendDirectMessage: sinon.SinonStub };
  let connectClaimTokenService: { issueOrGetForEnvironment: sinon.SinonStub };
  let logger: { setContext: sinon.SinonStub; warn: sinon.SinonStub };

  function buildUsecase() {
    return new SendAgentWelcomeMessage(
      agentRepository as any,
      integrationRepository as any,
      channelEndpointRepository as any,
      subscriberRepository as any,
      conversationService as any,
      analyticsService as any,
      outboundGateway as any,
      connectClaimTokenService as any,
      logger as any
    );
  }

  beforeEach(() => {
    agentRepository = {
      findOne: stub().resolves({ _id: AGENT_ID, identifier: 'my-agent' }),
    };
    integrationRepository = {
      findOne: stub().resolves({
        _id: 'integration-id',
        providerId: EmailProviderIdEnum.NovuAgent,
      }),
    };
    channelEndpointRepository = {
      findOne: stub().resolves(null),
    };
    subscriberRepository = {
      findBySubscriberId: stub().resolves({
        subscriberId: `connect:${USER_ID}`,
        email: 'user@example.com',
      }),
    };
    conversationService = {
      createOrGetConversation: stub().resolves({
        _id: 'conversation-id',
        channels: [{ platform: AgentPlatformEnum.EMAIL, platformThreadId: 'thread-1' }],
      }),
      findByAgentIntegrationParticipant: stub().resolves(null),
      getPrimaryChannel: stub().returns({ platform: AgentPlatformEnum.EMAIL, platformThreadId: 'thread-1' }),
      persistAgentMessage: stub().resolves(undefined),
    };
    analyticsService = {
      track: stub(),
    };
    outboundGateway = {
      sendDirectMessage: stub().resolves({ messageId: 'msg-1', platformThreadId: 'email:user@example.com:hash' }),
    };
    connectClaimTokenService = {
      issueOrGetForEnvironment: stub().resolves({ token: 'claim-token' }),
    };
    logger = {
      setContext: stub(),
      warn: stub(),
    };
  });

  afterEach(() => {
    restore();
  });

  it('sends a welcome email to the connect subscriber address', async () => {
    const result = await buildUsecase().execute(buildCommand());

    expect(result).to.deep.equal({ sent: true, conversationId: 'conversation-id' });
    expect(subscriberRepository.findBySubscriberId.calledOnceWith(ENV_ID, `connect:${USER_ID}`)).to.equal(true);
    expect(channelEndpointRepository.findOne.called).to.equal(false);
    expect(
      outboundGateway.sendDirectMessage.calledOnceWith(
        AGENT_ID,
        INTEGRATION_IDENTIFIER,
        'user@example.com',
        sinon.match({ markdown: 'Connected! Reply to this email to try it out.' })
      )
    ).to.equal(true);
  });

  it('returns sent:true without resending when a welcome conversation already exists', async () => {
    conversationService.findByAgentIntegrationParticipant.resolves({
      _id: 'existing-conversation-id',
      title: 'Connected! Reply to this email to try it out.',
    });

    const result = await buildUsecase().execute(buildCommand());

    expect(result).to.deep.equal({ sent: true, conversationId: 'existing-conversation-id' });
    expect(
      conversationService.findByAgentIntegrationParticipant.calledOnceWith(
        sinon.match({
          participantId: `email:user@example.com`,
          title: 'Connected! Reply to this email to try it out.',
        })
      )
    ).to.equal(true);
    expect(outboundGateway.sendDirectMessage.called).to.equal(false);
    expect(conversationService.createOrGetConversation.called).to.equal(false);
  });

  it('returns sent:false when the connect subscriber has no email', async () => {
    subscriberRepository.findBySubscriberId.resolves({ subscriberId: `connect:${USER_ID}`, email: '' });

    const result = await buildUsecase().execute(buildCommand());

    expect(result).to.deep.equal({ sent: false });
    expect(outboundGateway.sendDirectMessage.called).to.equal(false);
    expect(logger.warn.calledOnce).to.equal(true);
  });

  it('returns sent:false when the connect subscriber does not exist', async () => {
    subscriberRepository.findBySubscriberId.resolves(null);

    const result = await buildUsecase().execute(buildCommand());

    expect(result).to.deep.equal({ sent: false });
    expect(outboundGateway.sendDirectMessage.called).to.equal(false);
    expect(logger.warn.called).to.equal(false);
  });
});
