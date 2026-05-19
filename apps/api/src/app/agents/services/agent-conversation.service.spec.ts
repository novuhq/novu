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
      expect(getInboundActivityPreview('', { hasPlatformAttachments: true })).to.equal(
        INBOUND_ATTACHMENT_ONLY_PREVIEW
      );
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

    const service = new AgentConversationService(conversationRepository, {} as any, makeLogger() as any);

    await service.createOrGetConversation({
      ...baseCreateParams(),
      firstMessageText: '',
    });

    expect(create.calledOnce).to.equal(true);
    expect(create.firstCall.args[0].title).to.equal(DEFAULT_CONVERSATION_TITLE);
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

    const service = new AgentConversationService(conversationRepository, {} as any, makeLogger() as any);

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

    const service = new AgentConversationService(conversationRepository, {} as any, makeLogger() as any);

    await service.findByPlatformThread('e', 'o', 'agent-x', 'int-x', 'thread-z');

    expect(findByPlatformThread.calledOnceWithExactly('e', 'o', 'agent-x', 'int-x', 'thread-z')).to.equal(true);
  });
});
