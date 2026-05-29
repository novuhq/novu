import { expect } from 'chai';
import sinon from 'sinon';
import { HandleAgentReplyCommand } from './handle-agent-reply.command';
import { HandleAgentReply } from './handle-agent-reply.usecase';

const ENV_ID = 'env-1';
const ORG_ID = 'org-1';
const AGENT_MONGO_ID = 'agent-mongo-id';
const CONVERSATION_ID = 'conversation-1';

/**
 * Characterization test: locks in the CURRENT behavior of HandleAgentReply so it can be
 * preserved when delivery+persistence is later rerouted through OutboundGateway. A successful
 * reply must both deliver via chatSdkService.postToConversation AND persist via
 * conversationService.persistAgentMessage, with the persisted platformMessageId equal to the
 * messageId returned by delivery.
 */
describe('HandleAgentReply (characterization)', () => {
  let agentRepository: { findOne: sinon.SinonStub };
  let subscriberRepository: { findBySubscriberId: sinon.SinonStub };
  let chatSdkService: { postToConversation: sinon.SinonStub; removeReaction: sinon.SinonStub };
  let bridgeExecutor: { execute: sinon.SinonStub };
  let agentConfigResolver: { resolve: sinon.SinonStub };
  let conversationService: {
    getConversation: sinon.SinonStub;
    getPrimaryChannel: sinon.SinonStub;
    persistAgentMessage: sinon.SinonStub;
  };
  let logger: { setContext: sinon.SinonStub; warn: sinon.SinonStub; error: sinon.SinonStub };
  let parseEventRequest: { execute: sinon.SinonStub };
  let analyticsService: { track: sinon.SinonStub };

  const channel = {
    platform: 'slack',
    _integrationId: 'int-1',
    platformThreadId: 'thread-1',
    firstPlatformMessageId: undefined,
  };

  function buildUsecase() {
    return new HandleAgentReply(
      agentRepository as any,
      subscriberRepository as any,
      chatSdkService as any,
      bridgeExecutor as any,
      agentConfigResolver as any,
      conversationService as any,
      logger as any,
      parseEventRequest as any,
      analyticsService as any
    );
  }

  function buildCommand() {
    return HandleAgentReplyCommand.create({
      userId: 'user-1',
      environmentId: ENV_ID,
      organizationId: ORG_ID,
      conversationId: CONVERSATION_ID,
      agentIdentifier: 'my-agent',
      integrationIdentifier: 'slack-int',
      reply: { markdown: 'Hello from the agent' },
    });
  }

  beforeEach(() => {
    agentRepository = {
      findOne: sinon.stub().resolves({ _id: AGENT_MONGO_ID, name: 'My Agent', identifier: 'my-agent' }),
    };
    subscriberRepository = { findBySubscriberId: sinon.stub().resolves(null) };
    chatSdkService = {
      postToConversation: sinon.stub().resolves({ messageId: 'msg-123', platformThreadId: 'thread-1' }),
      removeReaction: sinon.stub().resolves(undefined),
    };
    bridgeExecutor = { execute: sinon.stub().resolves(undefined) };
    agentConfigResolver = {
      resolve: sinon.stub().resolves({ acknowledgeOnReceived: false, integrationIdentifier: 'slack-int' }),
    };
    conversationService = {
      getConversation: sinon.stub().resolves({
        _id: CONVERSATION_ID,
        _agentId: AGENT_MONGO_ID,
        participants: [],
        metadata: {},
      }),
      getPrimaryChannel: sinon.stub().returns(channel),
      persistAgentMessage: sinon.stub().resolves({}),
    };
    logger = { setContext: sinon.stub(), warn: sinon.stub(), error: sinon.stub() };
    parseEventRequest = { execute: sinon.stub().resolves({ transactionId: 'txn-1' }) };
    analyticsService = { track: sinon.stub() };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('delivers a successful reply and persists it with the delivered messageId', async () => {
    const result = await buildUsecase().execute(buildCommand());

    expect(chatSdkService.postToConversation.calledOnce).to.equal(true);
    expect(conversationService.persistAgentMessage.calledOnce).to.equal(true);

    const deliverArgs = chatSdkService.postToConversation.firstCall.args;
    expect(deliverArgs[0]).to.equal(AGENT_MONGO_ID);
    expect(deliverArgs[1]).to.equal('slack-int');
    expect(deliverArgs[2]).to.equal('slack');
    expect(deliverArgs[3]).to.equal('thread-1');

    const persistArgs = conversationService.persistAgentMessage.firstCall.args[0];
    expect(persistArgs.conversationId).to.equal(CONVERSATION_ID);
    expect(persistArgs.platformMessageId).to.equal('msg-123');
    expect(persistArgs.content).to.equal('Hello from the agent');

    expect(result).to.deep.equal({ messageId: 'msg-123', platformThreadId: 'thread-1' });
  });
});
