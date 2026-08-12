import {
  ConversationActivityTypeEnum,
  ConversationParticipantTypeEnum,
  ConversationRepository,
  ConversationStatusEnum,
} from '@novu/dal';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  AgentConversationService,
  DEFAULT_CONVERSATION_TITLE,
  getConversationTitle,
  getInboundActivityPreview,
  INBOUND_ATTACHMENT_ONLY_PREVIEW,
} from './agent-conversation.service';
import { ConversationEventSequenceService } from './conversation-event-sequence.service';

describe('AgentConversationService', () => {
  function makeLogger() {
    return {
      setContext: sinon.stub(),
      debug: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      info: sinon.stub(),
    };
  }

  function baseCreateParams() {
    return {
      environmentId: 'env-1',
      organizationId: 'org-1',
      agentId: 'agent-a',
      platform: 'telegram',
      integrationId: 'integration-a',
      platformThreadId: '999888777',
      participantId: 'telegram:111',
      participantType: ConversationParticipantTypeEnum.PLATFORM_USER,
      platformUserId: '111',
      firstMessageText: 'hello',
    };
  }

  function makeActivityRepository() {
    return {
      createAgentActivity: sinon.stub().resolves({ _id: 'activity-1', identifier: 'act_generated' }),
      findOne: sinon.stub().resolves(null),
    };
  }

  function basePersistParams() {
    return {
      conversationId: 'conv-1',
      channel: {
        platform: 'slack',
        _integrationId: 'integration-a',
        platformThreadId: 'thread-1',
      },
      platformMessageId: 'msg-1',
      agentIdentifier: 'agent-a',
      content: 'hello',
      environmentId: 'env-1',
      organizationId: 'org-1',
    };
  }

  function makeEventSequenceService(mint = sinon.stub().resolves(undefined)) {
    return { mint } as unknown as ConversationEventSequenceService;
  }

  function makeService(
    conversationRepository: ConversationRepository,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activityRepository: any = makeActivityRepository(),
    eventSequenceService = makeEventSequenceService(),
    webChatLiveActivityPublisher = { emitPersistedClientEvent: sinon.stub().resolves(undefined) }
  ) {
    return new AgentConversationService(
      conversationRepository,
      activityRepository as any,
      eventSequenceService,
      webChatLiveActivityPublisher as any,
      makeLogger() as any
    );
  }

  describe('persistAgentMessage', () => {
    it('uses the caller-supplied identifier when provided', async () => {
      const activityRepository = makeActivityRepository();
      const conversationRepository = {
        touchActivity: sinon.stub().resolves(undefined),
      } as unknown as ConversationRepository;
      const service = makeService(conversationRepository, activityRepository);

      const result = await service.persistAgentMessage({
        ...basePersistParams(),
        identifier: 'client-msg-123',
      });

      expect(result.created).to.equal(true);
      expect(activityRepository.createAgentActivity.calledOnce).to.equal(true);
      expect(activityRepository.createAgentActivity.firstCall.args[0].identifier).to.equal('client-msg-123');
      expect(activityRepository.createAgentActivity.firstCall.args[0].type).to.equal(
        ConversationActivityTypeEnum.MESSAGE
      );
    });

    it('mints an act_ identifier when none is supplied', async () => {
      const activityRepository = makeActivityRepository();
      const conversationRepository = {
        touchActivity: sinon.stub().resolves(undefined),
      } as unknown as ConversationRepository;
      const service = makeService(conversationRepository, activityRepository);

      await service.persistAgentMessage(basePersistParams());

      const identifier = activityRepository.createAgentActivity.firstCall.args[0].identifier;

      expect(identifier).to.match(/^act_/);
    });

    it('logs and returns the existing activity on duplicate identifier races', async () => {
      const duplicateError = Object.assign(new Error('duplicate key'), { code: 11000 });
      const existingActivity = { _id: 'existing-1', identifier: 'client-msg-123' };
      const activityRepository = {
        createAgentActivity: sinon.stub().rejects(duplicateError),
        findOne: sinon.stub().resolves(existingActivity),
      };
      const conversationRepository = {
        touchActivity: sinon.stub().resolves(undefined),
      } as unknown as ConversationRepository;
      const logger = makeLogger();
      const service = new AgentConversationService(
        conversationRepository,
        activityRepository as any,
        makeEventSequenceService(),
        { emitPersistedClientEvent: sinon.stub().resolves(undefined) } as any,
        logger as any
      );

      const result = await service.persistAgentMessage({
        ...basePersistParams(),
        identifier: 'client-msg-123',
      });

      expect(result.activity).to.equal(existingActivity);
      expect(result.created).to.equal(false);
      expect(logger.warn.calledOnce).to.equal(true);
    });
  });

  describe('MCP connection activities', () => {
    it('persists request and result activities and publishes both to web chat', async () => {
      const activityRepository = makeActivityRepository();
      activityRepository.createAgentActivity.callsFake(async (params: Record<string, unknown>) => ({
        _id: `activity-${activityRepository.createAgentActivity.callCount}`,
        ...params,
      }));
      const conversationRepository = {
        touchActivity: sinon.stub().resolves(undefined),
      } as unknown as ConversationRepository;
      const publisher = { emitPersistedClientEvent: sinon.stub().resolves(undefined) };
      const service = makeService(
        conversationRepository,
        activityRepository,
        makeEventSequenceService(sinon.stub().onFirstCall().resolves(10).onSecondCall().resolves(11)),
        publisher
      );
      const context = {
        ...basePersistParams(),
        channel: {
          platform: 'web_chat',
          _integrationId: 'integration-a',
          platformThreadId: 'thread-1',
        },
      };

      await service.persistMcpConnectionRequest({
        ...context,
        actionId: 'tool-use-1',
        mcpId: 'stripe',
        displayName: 'Stripe',
        authorizeUrl: 'https://example.com/authorize',
      });
      await service.persistMcpConnectionResult({
        ...context,
        actionId: 'tool-use-1',
        mcpId: 'stripe',
        status: 'connected',
      });

      expect(activityRepository.createAgentActivity.firstCall.args[0]).to.deep.include({
        identifier: 'mcp-connection:tool-use-1:request',
        type: ConversationActivityTypeEnum.MCP_CONNECTION_REQUEST,
        sequence: 10,
        richContent: {
          mcpConnection: {
            actionId: 'tool-use-1',
            mcpId: 'stripe',
            displayName: 'Stripe',
            authorizeUrl: 'https://example.com/authorize',
            authorizeUrlWithAutoApprove: undefined,
          },
        },
      });
      expect(activityRepository.createAgentActivity.secondCall.args[0]).to.deep.include({
        identifier: 'mcp-connection:tool-use-1:result',
        type: ConversationActivityTypeEnum.MCP_CONNECTION_RESULT,
        sequence: 11,
        richContent: {
          mcpConnection: {
            actionId: 'tool-use-1',
            mcpId: 'stripe',
            status: 'connected',
            message: undefined,
          },
        },
      });
      expect(publisher.emitPersistedClientEvent.callCount).to.equal(2);
    });
  });

  describe('event sequencing', () => {
    it('allocates a sequence for durable tool activities on any channel', async () => {
      const conversationRepository = {} as unknown as ConversationRepository;
      const activityRepository = {
        createToolActivity: sinon.stub().resolves({ _id: 'tool-activity' }),
      };
      const mint = sinon.stub().resolves(4);
      const service = makeService(conversationRepository, activityRepository, makeEventSequenceService(mint));

      await service.persistToolResult({
        conversationId: 'conv-1',
        channel: {
          platform: 'slack',
          _integrationId: 'integration-a',
          platformThreadId: 'thread-1',
        },
        agentIdentifier: 'agent-a',
        environmentId: 'env-1',
        organizationId: 'org-1',
        toolCallId: 'tool-call-1',
        output: 'done',
      });

      expect(activityRepository.createToolActivity.firstCall.args[0].sequence).to.equal(4);
      expect(
        mint.calledOnceWithExactly({
          environmentId: 'env-1',
          organizationId: 'org-1',
          conversationId: 'conv-1',
        })
      ).to.equal(true);
    });
  });

  describe('getConversationTitle', () => {
    it('returns trimmed text truncated to 200 characters', () => {
      const longText = 'a'.repeat(250);

      expect(getConversationTitle(`  ${longText}  `)).to.equal('a'.repeat(200));
    });

    it('returns default title when preview text is empty', () => {
      expect(getConversationTitle('')).to.equal(DEFAULT_CONVERSATION_TITLE);
      expect(getConversationTitle('   ')).to.equal(DEFAULT_CONVERSATION_TITLE);
    });
  });

  describe('getInboundActivityPreview', () => {
    it('returns attachment preview when message has no text but has attachments', () => {
      expect(getInboundActivityPreview('', { hasPlatformAttachments: true })).to.equal(INBOUND_ATTACHMENT_ONLY_PREVIEW);
    });

    it('returns empty string when there is no text and no attachments', () => {
      expect(getInboundActivityPreview('')).to.equal('');
      expect(getInboundActivityPreview('   ')).to.equal('');
    });
  });

  it('uses a non-empty title when creating a conversation from empty inbound text', async () => {
    const findByPlatformThread = sinon.stub().resolves(null);
    const create = sinon.stub().resolves({
      _id: 'new-conv',
      participants: [],
      channels: [],
      status: ConversationStatusEnum.ACTIVE,
    });

    const conversationRepository = {
      findByPlatformThread,
      create,
      updateStatus: sinon.stub(),
      updateParticipants: sinon.stub(),
    } as unknown as ConversationRepository;

    const service = new AgentConversationService(
      conversationRepository,
      {} as any,
      makeEventSequenceService(),
      { emitPersistedClientEvent: sinon.stub().resolves(undefined) } as any,
      makeLogger() as any
    );

    await service.createOrGetConversation({
      ...baseCreateParams(),
      firstMessageText: '',
    });

    expect(create.calledOnce).to.equal(true);
    expect(create.firstCall.args[0].title).to.equal(DEFAULT_CONVERSATION_TITLE);
  });

  it('stamps sorted contextKeys on create when provided', async () => {
    const create = sinon.stub().resolves({
      _id: 'new-conv',
      participants: [],
      channels: [],
      status: ConversationStatusEnum.ACTIVE,
    });

    const conversationRepository = {
      findByPlatformThread: sinon.stub().resolves(null),
      create,
      updateStatus: sinon.stub(),
      updateParticipants: sinon.stub(),
    } as unknown as ConversationRepository;

    const service = new AgentConversationService(
      conversationRepository,
      {} as any,
      makeEventSequenceService(),
      { emitPersistedClientEvent: sinon.stub().resolves(undefined) } as any,
      makeLogger() as any
    );

    await service.createOrGetConversation({
      ...baseCreateParams(),
      platform: 'web_chat',
      contextKeys: ['tenant:acme', 'app:billing'],
    });

    expect(create.calledOnce).to.equal(true);
    expect(create.firstCall.args[0].contextKeys).to.deep.equal(['app:billing', 'tenant:acme']);
  });

  it('rejects reuse when stored conversation has contextKeys but caller omits them', async () => {
    const existing = {
      _id: 'existing-conv',
      status: ConversationStatusEnum.ACTIVE,
      participants: [{ type: ConversationParticipantTypeEnum.SUBSCRIBER, id: 'sub-1' }],
      channels: [],
      contextKeys: ['tenant:acme'],
    };

    const conversationRepository = {
      findByPlatformThread: sinon.stub().resolves(existing),
      updateStatus: sinon.stub(),
      updateParticipants: sinon.stub(),
    } as unknown as ConversationRepository;

    const service = new AgentConversationService(
      conversationRepository,
      {} as any,
      makeEventSequenceService(),
      { emitPersistedClientEvent: sinon.stub().resolves(undefined) } as any,
      makeLogger() as any
    );

    let threw = false;
    try {
      await service.createOrGetConversation({
        ...baseCreateParams(),
        platform: 'web_chat',
      });
    } catch (err) {
      threw = true;
      expect((err as Error).message).to.equal('Conversation context mismatch');
    }
    expect(threw).to.equal(true);
  });

  it('rejects reuse when session contextKeys do not match stored conversation', async () => {
    const existing = {
      _id: 'existing-conv',
      status: ConversationStatusEnum.ACTIVE,
      participants: [{ type: ConversationParticipantTypeEnum.SUBSCRIBER, id: 'sub-1' }],
      channels: [],
      contextKeys: ['tenant:acme'],
    };

    const findOne = sinon.stub().resolves(null);
    const conversationRepository = {
      findByPlatformThread: sinon.stub().resolves(existing),
      findOne,
      buildContextExactMatchQuery: sinon.stub().returns({ contextKeys: { $all: ['tenant:globex'], $size: 1 } }),
      updateStatus: sinon.stub(),
      updateParticipants: sinon.stub(),
    } as unknown as ConversationRepository;

    const service = new AgentConversationService(
      conversationRepository,
      {} as any,
      makeEventSequenceService(),
      { emitPersistedClientEvent: sinon.stub().resolves(undefined) } as any,
      makeLogger() as any
    );

    let threw = false;
    try {
      await service.createOrGetConversation({
        ...baseCreateParams(),
        platform: 'web_chat',
        contextKeys: ['tenant:globex'],
      });
    } catch (err) {
      threw = true;
      expect((err as Error).message).to.equal('Conversation context mismatch');
    }
    expect(threw).to.equal(true);
    expect(findOne.calledOnce).to.equal(true);
  });

  it('omits contextKeys on create when not provided', async () => {
    const create = sinon.stub().resolves({
      _id: 'new-conv',
      participants: [],
      channels: [],
      status: ConversationStatusEnum.ACTIVE,
    });

    const conversationRepository = {
      findByPlatformThread: sinon.stub().resolves(null),
      create,
      updateStatus: sinon.stub(),
      updateParticipants: sinon.stub(),
    } as unknown as ConversationRepository;

    const service = new AgentConversationService(
      conversationRepository,
      {} as any,
      makeEventSequenceService(),
      { emitPersistedClientEvent: sinon.stub().resolves(undefined) } as any,
      makeLogger() as any
    );

    await service.createOrGetConversation(baseCreateParams());

    expect(create.calledOnce).to.equal(true);
    expect(create.firstCall.args[0]).to.not.have.property('contextKeys');
  });

  it('scopes createOrGetConversation lookup by agent id and integration id', async () => {
    const findByPlatformThread = sinon.stub().resolves(null);
    const create = sinon.stub().resolves({
      _id: 'new-conv',
      participants: [],
      channels: [],
      status: ConversationStatusEnum.ACTIVE,
    });

    const conversationRepository = {
      findByPlatformThread,
      create,
      updateStatus: sinon.stub(),
      updateParticipants: sinon.stub(),
    } as unknown as ConversationRepository;

    const service = new AgentConversationService(
      conversationRepository,
      {} as any,
      makeEventSequenceService(),
      { emitPersistedClientEvent: sinon.stub().resolves(undefined) } as any,
      makeLogger() as any
    );

    await service.createOrGetConversation(baseCreateParams());

    expect(findByPlatformThread.calledOnce).to.equal(true);
    expect(findByPlatformThread.firstCall.args).to.deep.equal([
      'env-1',
      'org-1',
      'agent-a',
      'integration-a',
      '999888777',
    ]);
  });

  it('delegates findByPlatformThread to the repository with agent and integration', async () => {
    const findByPlatformThread = sinon.stub().resolves(null);
    const conversationRepository = {
      findByPlatformThread,
      create: sinon.stub(),
      updateStatus: sinon.stub(),
      updateParticipants: sinon.stub(),
    } as unknown as ConversationRepository;

    const service = new AgentConversationService(
      conversationRepository,
      {} as any,
      makeEventSequenceService(),
      { emitPersistedClientEvent: sinon.stub().resolves(undefined) } as any,
      makeLogger() as any
    );

    await service.findByPlatformThread('e', 'o', 'agent-x', 'int-x', 'thread-z');

    expect(findByPlatformThread.calledOnceWithExactly('e', 'o', 'agent-x', 'int-x', 'thread-z')).to.equal(true);
  });
});
