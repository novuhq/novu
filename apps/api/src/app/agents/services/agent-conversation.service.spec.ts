import { ConversationParticipantTypeEnum, ConversationRepository, ConversationStatusEnum } from '@novu/dal';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentConversationService } from './agent-conversation.service';

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
