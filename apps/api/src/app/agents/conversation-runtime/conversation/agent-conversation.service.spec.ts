import { ConversationParticipantTypeEnum, ConversationRepository, ConversationStatusEnum } from '@novu/dal';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  AgentConversationService,
  DEFAULT_CONVERSATION_TITLE,
  getConversationTitle,
  getInboundActivityPreview,
  INBOUND_ATTACHMENT_ONLY_PREVIEW,
} from './agent-conversation.service';
import { ConversationActivityLedger } from './conversation-activity-ledger.service';

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

  function makeLedger(overrides: Partial<Record<keyof ConversationActivityLedger, sinon.SinonStub>> = {}) {
    return {
      persistAgentMessage: sinon.stub().resolves({ activity: {}, created: true }),
      persistWorkflowOriginHydration: sinon.stub().resolves(undefined),
      isWorkflowOriginHydrated: sinon.stub().resolves(false),
      persistMcpConnectionRequest: sinon.stub().resolves({}),
      persistMcpConnectionResult: sinon.stub().resolves({}),
      persistToolResult: sinon.stub().resolves(undefined),
      persistInboundMessage: sinon.stub().resolves({}),
      persistResolveSignal: sinon.stub().resolves(undefined),
      persistTriggerSignal: sinon.stub().resolves(undefined),
      persistRunLifecycle: sinon.stub().resolves(null),
      listForView: sinon.stub().resolves({ data: [], hasMore: false }),
      mint: sinon.stub().resolves(1),
      ...overrides,
    } as unknown as ConversationActivityLedger;
  }

  function makeService(
    conversationRepository: ConversationRepository,
    ledger: ConversationActivityLedger = makeLedger()
  ) {
    return new AgentConversationService(conversationRepository, ledger, makeLogger() as any);
  }

  describe('delegation', () => {
    it('delegates persistAgentMessage to the ledger', async () => {
      const ledger = makeLedger();
      const service = makeService({} as unknown as ConversationRepository, ledger);
      const params = {
        conversationId: 'conv-1',
        channel: { platform: 'slack', _integrationId: 'int-1', platformThreadId: 'thread-1' },
        agentIdentifier: 'agent-a',
        content: 'hello',
        environmentId: 'env-1',
        organizationId: 'org-1',
      };

      await service.persistAgentMessage(params);

      expect(ledger.persistAgentMessage.calledOnceWithExactly(params)).to.equal(true);
    });

    it('delegates mintEventSequence to the ledger', async () => {
      const ledger = makeLedger();
      const service = makeService({} as unknown as ConversationRepository, ledger);
      const params = { environmentId: 'env-1', organizationId: 'org-1', conversationId: 'conv-1' };

      await service.mintEventSequence(params);

      expect(ledger.mint.calledOnceWithExactly(params)).to.equal(true);
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

    const service = makeService(conversationRepository);

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

    const service = makeService(conversationRepository);

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

    const service = makeService(conversationRepository);

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

    const service = makeService(conversationRepository);

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

    const service = makeService(conversationRepository);

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

    const service = makeService(conversationRepository);

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

    const service = makeService(conversationRepository);

    await service.findByPlatformThread('e', 'o', 'agent-x', 'int-x', 'thread-z');

    expect(findByPlatformThread.calledOnceWithExactly('e', 'o', 'agent-x', 'int-x', 'thread-z')).to.equal(true);
  });

  it('orchestrates resolveConversation across repository and ledger', async () => {
    const updateStatus = sinon.stub().resolves(undefined);
    const markBillingResolved = sinon.stub().resolves(undefined);
    const clearExternalSessionId = sinon.stub().resolves(undefined);
    const persistResolveSignal = sinon.stub().resolves(undefined);
    const conversationRepository = {
      updateStatus,
      markBillingResolved,
      clearExternalSessionId,
    } as unknown as ConversationRepository;
    const ledger = makeLedger({ persistResolveSignal });
    const service = makeService(conversationRepository, ledger);
    const params = {
      conversationId: 'conv-1',
      channel: { platform: 'slack', _integrationId: 'int-1', platformThreadId: 'thread-1' },
      agentIdentifier: 'agent-a',
      environmentId: 'env-1',
      organizationId: 'org-1',
      summary: 'done',
    };

    await service.resolveConversation(params);

    expect(updateStatus.calledOnce).to.equal(true);
    expect(markBillingResolved.calledOnce).to.equal(true);
    expect(clearExternalSessionId.calledOnce).to.equal(true);
    expect(persistResolveSignal.calledOnce).to.equal(true);
    expect(persistResolveSignal.firstCall.args[0]).to.include({
      content: 'done',
      summary: 'done',
    });
  });
});
