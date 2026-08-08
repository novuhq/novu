import { ChatProviderIdEnum, EmailProviderIdEnum } from '@novu/shared';
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
const SLACK_WORKSPACE_ID = 'T-INTENDED';

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
  let channelConnectionRepository: { findOne: sinon.SinonStub };
  let subscriberRepository: { findBySubscriberId: sinon.SinonStub };
  let conversationService: {
    createOrGetConversation: sinon.SinonStub;
    findByAgentIntegrationParticipant: sinon.SinonStub;
    getPrimaryChannel: sinon.SinonStub;
    persistAgentMessage: sinon.SinonStub;
  };
  let analyticsService: { track: sinon.SinonStub };
  let outboundGateway: {
    sendDirectMessage: sinon.SinonStub;
    setSlackSuggestedPrompts: sinon.SinonStub;
  };
  let connectClaimTokenService: { issueOrGetForEnvironment: sinon.SinonStub };
  let logger: { setContext: sinon.SinonStub; warn: sinon.SinonStub };

  function buildUsecase() {
    return new SendAgentWelcomeMessage(
      agentRepository as any,
      integrationRepository as any,
      channelEndpointRepository as any,
      channelConnectionRepository as any,
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
    channelConnectionRepository = {
      findOne: stub().resolves(null),
    };
    subscriberRepository = {
      findBySubscriberId: stub().resolves({
        subscriberId: USER_ID,
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
      persistAgentMessage: stub().resolves({ activity: { _id: 'activity-1' }, created: true }),
    };
    analyticsService = {
      track: stub(),
    };
    outboundGateway = {
      sendDirectMessage: stub().resolves({ messageId: 'msg-1', platformThreadId: 'email:user@example.com:hash' }),
      setSlackSuggestedPrompts: stub().resolves(undefined),
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

  it('sends a welcome email to the dashboard subscriber address', async () => {
    const result = await buildUsecase().execute(buildCommand());

    expect(result).to.deep.equal({ sent: true, conversationId: 'conversation-id', claimToken: undefined });
    expect(subscriberRepository.findBySubscriberId.calledOnceWith(ENV_ID, USER_ID)).to.equal(true);
    expect(channelEndpointRepository.findOne.called).to.equal(false);
    expect(
      outboundGateway.sendDirectMessage.calledOnceWith(
        AGENT_ID,
        INTEGRATION_IDENTIFIER,
        'user@example.com',
        sinon.match({ markdown: 'Connected! Reply to this email to try it out.' }),
        undefined
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
    expect(outboundGateway.setSlackSuggestedPrompts.called).to.equal(false);
  });

  it('binds the Slack workspace from the endpoint connection for welcome DM and prompts', async () => {
    integrationRepository.findOne.resolves({
      _id: 'integration-id',
      providerId: ChatProviderIdEnum.Slack,
    });
    channelEndpointRepository.findOne.resolves({
      endpoint: { userId: 'U123456' },
      connectionIdentifier: 'conn-intended',
    });
    channelConnectionRepository.findOne.resolves({
      identifier: 'conn-intended',
      workspace: { id: SLACK_WORKSPACE_ID, name: 'Intended Workspace' },
    });
    conversationService.createOrGetConversation.resolves({
      _id: 'conversation-id',
      channels: [
        {
          platform: AgentPlatformEnum.SLACK,
          platformThreadId: 'slack:D123:msg-1',
          workspace: { id: SLACK_WORKSPACE_ID },
        },
      ],
    });
    conversationService.getPrimaryChannel.returns({
      platform: AgentPlatformEnum.SLACK,
      platformThreadId: 'slack:D123:msg-1',
      workspace: { id: SLACK_WORKSPACE_ID },
    });
    outboundGateway.sendDirectMessage.resolves({
      messageId: 'msg-1',
      platformThreadId: 'slack:D123:msg-1',
    });

    const result = await buildUsecase().execute(buildCommand({ integrationIdentifier: 'slack-integration' }));

    expect(result).to.deep.equal({ sent: true, conversationId: 'conversation-id', claimToken: undefined });
    expect(
      channelConnectionRepository.findOne.calledOnceWith(
        sinon.match({
          _environmentId: ENV_ID,
          _organizationId: ORG_ID,
          identifier: 'conn-intended',
        }),
        'workspace'
      )
    ).to.equal(true);
    expect(
      conversationService.findByAgentIntegrationParticipant.calledOnceWith(
        sinon.match({
          participantId: 'slack:U123456',
          workspaceId: SLACK_WORKSPACE_ID,
        })
      )
    ).to.equal(true);
    expect(
      outboundGateway.sendDirectMessage.calledOnceWith(
        AGENT_ID,
        'slack-integration',
        'U123456',
        sinon.match.object,
        SLACK_WORKSPACE_ID
      )
    ).to.equal(true);
    expect(
      conversationService.createOrGetConversation.calledOnceWith(
        sinon.match({
          workspaceId: SLACK_WORKSPACE_ID,
          platformUserId: 'U123456',
        })
      )
    ).to.equal(true);
    expect(
      outboundGateway.setSlackSuggestedPrompts.calledOnceWith(
        AGENT_ID,
        'slack-integration',
        'slack:D123:msg-1',
        sinon.match.array,
        sinon.match.string,
        SLACK_WORKSPACE_ID
      )
    ).to.equal(true);
  });

  it('still sends a Slack welcome when only another workspace has an existing welcome conversation', async () => {
    integrationRepository.findOne.resolves({
      _id: 'integration-id',
      providerId: ChatProviderIdEnum.Slack,
    });
    channelEndpointRepository.findOne.resolves({
      endpoint: { userId: 'U123456' },
      connectionIdentifier: 'conn-intended',
    });
    channelConnectionRepository.findOne.resolves({
      identifier: 'conn-intended',
      workspace: { id: SLACK_WORKSPACE_ID },
    });
    // Dedup is workspace-scoped: a welcome in another workspace must not suppress this one.
    conversationService.findByAgentIntegrationParticipant.resolves(null);
    conversationService.createOrGetConversation.resolves({
      _id: 'conversation-id',
      channels: [
        {
          platform: AgentPlatformEnum.SLACK,
          platformThreadId: 'slack:D999:msg-1',
          workspace: { id: SLACK_WORKSPACE_ID },
        },
      ],
    });
    conversationService.getPrimaryChannel.returns({
      platform: AgentPlatformEnum.SLACK,
      platformThreadId: 'slack:D999:msg-1',
      workspace: { id: SLACK_WORKSPACE_ID },
    });
    outboundGateway.sendDirectMessage.resolves({
      messageId: 'msg-1',
      platformThreadId: 'slack:D999:msg-1',
    });

    const result = await buildUsecase().execute(buildCommand({ integrationIdentifier: 'slack-integration' }));

    expect(result.sent).to.equal(true);
    expect(
      conversationService.findByAgentIntegrationParticipant.calledOnceWith(
        sinon.match({ workspaceId: SLACK_WORKSPACE_ID })
      )
    ).to.equal(true);
    expect(outboundGateway.sendDirectMessage.calledOnce).to.equal(true);
  });

  it('returns sent:false when the dashboard subscriber has no email', async () => {
    subscriberRepository.findBySubscriberId.resolves({ subscriberId: USER_ID, email: '' });

    const result = await buildUsecase().execute(buildCommand());

    expect(result).to.deep.equal({ sent: false });
    expect(outboundGateway.sendDirectMessage.called).to.equal(false);
    expect(logger.warn.calledOnce).to.equal(true);
  });

  it('returns sent:false when the dashboard subscriber does not exist', async () => {
    subscriberRepository.findBySubscriberId.resolves(null);

    const result = await buildUsecase().execute(buildCommand());

    expect(result).to.deep.equal({ sent: false });
    expect(outboundGateway.sendDirectMessage.called).to.equal(false);
    expect(logger.warn.called).to.equal(false);
  });
});
