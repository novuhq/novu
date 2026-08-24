import { AGENT_EVENT_PROTOCOL_VERSION } from '@novu/agent-event-protocol';
import { ConversationParticipantTypeEnum } from '@novu/dal';
import { WebSocketEventEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentChatLiveActivityPublisher } from './agent-chat-live-activity.publisher';

describe('AgentChatLiveActivityPublisher', () => {
  const conversation = {
    _id: 'conv-mongo-id',
    _agentId: 'agent-mongo-id',
    identifier: 'conv_public',
    participants: [{ type: ConversationParticipantTypeEnum.SUBSCRIBER, id: 'sub-ext' }],
    contextKeys: ['ctx'],
  };

  function makePublisher(options: { mintedSequence?: number } = {}) {
    const mintedSequence = options.mintedSequence ?? 42;
    const subscriberRepository = {
      findBySubscriberId: sinon.stub().resolves({ _id: 'sub-mongo', subscriberId: 'sub-ext' }),
    };
    const conversationRepository = { findOne: sinon.stub() };
    const conversationService = {
      mintEventSequence: sinon.stub().resolves(mintedSequence),
    };
    const emittedEnvelope = {
      version: AGENT_EVENT_PROTOCOL_VERSION,
      conversationId: conversation._id,
      conversationIdentifier: conversation.identifier,
      agentId: 'public-agent-id',
      runId: 'run-managed',
      turnId: 'turn-managed',
      sequence: mintedSequence,
      timestamp: '2026-08-24T00:00:00.000Z',
      event: {
        type: 'provider-event' as const,
        provider: 'anthropic',
        event: 'content_block_delta',
        data: { index: 0 },
      },
    };
    const eventFactory = {
      createEphemeralEnvelope: sinon.stub().returns(emittedEnvelope),
    };
    const webSocketsQueueService = {
      add: sinon.stub().resolves(undefined),
    };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
    };

    const publisher = new AgentChatLiveActivityPublisher(
      subscriberRepository as any,
      conversationRepository as any,
      conversationService as any,
      eventFactory as any,
      webSocketsQueueService as any,
      logger as any
    );

    return {
      publisher,
      conversationService,
      eventFactory,
      webSocketsQueueService,
      emittedEnvelope,
    };
  }

  it('emitEphemeralEvent mints sequence and stamps the public agent identifier', async () => {
    const { publisher, conversationService, eventFactory, webSocketsQueueService, emittedEnvelope } = makePublisher({
      mintedSequence: 99,
    });

    await publisher.emitEphemeralEvent({
      agentIdentifier: 'public-agent-id',
      environmentId: 'env-1',
      organizationId: 'org-1',
      conversation: conversation as any,
      event: {
        type: 'provider-event',
        provider: 'anthropic',
        event: 'content_block_delta',
        data: { index: 0 },
      },
      runId: 'run-managed',
      turnId: 'turn-managed',
    });

    expect(
      conversationService.mintEventSequence.calledOnceWith({
        environmentId: 'env-1',
        organizationId: 'org-1',
        conversationId: conversation._id,
      })
    ).to.equal(true);

    expect(
      eventFactory.createEphemeralEnvelope.calledOnceWith({
        conversationId: conversation._id,
        conversationIdentifier: conversation.identifier,
        agentId: 'public-agent-id',
        sequence: 99,
        event: {
          type: 'provider-event',
          provider: 'anthropic',
          event: 'content_block_delta',
          data: { index: 0 },
        },
        runId: 'run-managed',
        turnId: 'turn-managed',
      })
    ).to.equal(true);

    expect(webSocketsQueueService.add.calledOnce).to.equal(true);
    const job = webSocketsQueueService.add.firstCall.args[0];
    expect(job.data.event).to.equal(WebSocketEventEnum.AGENT_EVENT);
    expect(job.data.payload).to.deep.equal(emittedEnvelope);
  });
});
