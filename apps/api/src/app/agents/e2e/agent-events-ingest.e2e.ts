import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEvent, type AgentEventEnvelope } from '@novu/agent-event-protocol';
import { ConversationActivitySenderTypeEnum, ConversationActivityTypeEnum } from '@novu/dal';
import { testServer } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import {
  AgentTestContext,
  activityRepository,
  seedConversation,
  setupAgentTestContext,
} from './helpers/agent-test-setup';

const NONEXISTENT_CONVERSATION_ID = '507f1f77bcf86cd799439011';

describe('Agent Events Ingest - /agents/events/ingest #novu-v2', () => {
  let ctx: AgentTestContext;

  before(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    process.env.IS_AGENT_EVENT_PROTOCOL_ENABLED = 'true';
  });

  after(() => {
    delete process.env.IS_AGENT_EVENT_PROTOCOL_ENABLED;
  });

  beforeEach(async () => {
    ctx = await setupAgentTestContext();

    const outboundGateway = testServer.getService(OutboundGateway);
    sinon
      .stub(outboundGateway, 'postToConversation')
      .resolves({ messageId: 'platform-msg-1', platformThreadId: 'platform-thread-1' });
    sinon.stub(outboundGateway, 'startTypingInConversation').resolves();
    sinon.stub(outboundGateway, 'stopTypingInConversation').resolves();
  });

  function buildEnvelope(
    conversationId: string,
    event: AgentEvent,
    overrides: Partial<Omit<AgentEventEnvelope, 'event'>> = {}
  ): AgentEventEnvelope {
    return {
      version: AGENT_EVENT_PROTOCOL_VERSION,
      conversationId,
      agentId: ctx.agentIdentifier,
      runId: 'run-1',
      turnId: 'turn-1',
      sequence: 1,
      timestamp: new Date().toISOString(),
      event,
      ...overrides,
    };
  }

  function messageEnvelope(
    conversationId: string,
    messageId: string,
    overrides: Partial<Omit<AgentEventEnvelope, 'event'>> = {}
  ): AgentEventEnvelope {
    return buildEnvelope(
      conversationId,
      { type: 'message', role: 'assistant', messageId, content: { markdown: `Content for ${messageId}` } },
      overrides
    );
  }

  function postIngest(events: unknown[]) {
    return ctx.session.testAgent.post('/v1/agents/events/ingest').send({ events });
  }

  it('should accept a message envelope and persist the message activity', async () => {
    const conversationId = await seedConversation(ctx);
    const messageId = `msg-happy-${Date.now()}`;

    const res = await postIngest([messageEnvelope(conversationId, messageId)]);

    expect(res.status).to.equal(200);

    const activities = await activityRepository.findByConversation(ctx.session.environment._id, conversationId);
    const messageActivity = activities.find(
      (a) =>
        a.senderType === ConversationActivitySenderTypeEnum.AGENT && a.type === ConversationActivityTypeEnum.MESSAGE
    );
    expect(messageActivity).to.exist;
    expect(messageActivity!.identifier).to.equal(messageId);
    expect(messageActivity!.content).to.equal(`Content for ${messageId}`);
  });

  it('should accept a replayed message envelope as idempotent and not persist a second activity', async () => {
    const conversationId = await seedConversation(ctx);
    const messageId = `msg-dupe-${Date.now()}`;
    const envelope = messageEnvelope(conversationId, messageId);

    const firstRes = await postIngest([envelope]);
    expect(firstRes.status).to.equal(200);

    const secondRes = await postIngest([envelope]);
    expect(secondRes.status).to.equal(200);

    const activities = await activityRepository.findByConversation(ctx.session.environment._id, conversationId);
    const messageActivities = activities.filter((a) => a.identifier === messageId);
    expect(messageActivities).to.have.length(1);
  });

  it('should persist all message activities from a batch', async () => {
    const conversationId = await seedConversation(ctx);
    const messageId1 = `msg-batch-1-${Date.now()}`;
    const messageId2 = `msg-batch-2-${Date.now()}`;

    const res = await postIngest([
      messageEnvelope(conversationId, messageId1, { sequence: 1 }),
      messageEnvelope(conversationId, messageId2, { sequence: 2 }),
    ]);

    expect(res.status).to.equal(200);

    const activities = await activityRepository.findByConversation(ctx.session.environment._id, conversationId);
    expect(activities.some((a) => a.identifier === messageId1)).to.be.true;
    expect(activities.some((a) => a.identifier === messageId2)).to.be.true;
  });

  it('should reject an invalid envelope with a 400 naming the invalid index', async () => {
    const conversationId = await seedConversation(ctx);

    const res = await postIngest([messageEnvelope(conversationId, 'msg-valid'), { not: 'an-envelope' }]);

    expect(res.status).to.equal(400);
    expect(res.body.message).to.include('Invalid event envelopes at indexes: 1');
  });

  it('should reject a batch mixing conversations with a 400', async () => {
    const conversationId = await seedConversation(ctx);
    const otherConversationId = await seedConversation(ctx);

    const res = await postIngest([
      messageEnvelope(conversationId, 'msg-mixed-1', { sequence: 1 }),
      messageEnvelope(otherConversationId, 'msg-mixed-2', { sequence: 2 }),
    ]);

    expect(res.status).to.equal(400);
    expect(res.body.message).to.equal('All events in a batch must belong to the same conversation');
  });

  it('should reject a batch mixing agents with a 400', async () => {
    const conversationId = await seedConversation(ctx);

    const otherAgentIdentifier = `e2e-mixed-agent-${Date.now()}`;
    const createRes = await ctx.session.testAgent.post('/v1/agents').send({
      name: 'Other Agent',
      identifier: otherAgentIdentifier,
    });
    expect(createRes.status).to.equal(201);

    const res = await postIngest([
      messageEnvelope(conversationId, 'msg-mixed-agent-1', { sequence: 1 }),
      messageEnvelope(conversationId, 'msg-mixed-agent-2', {
        sequence: 2,
        agentId: otherAgentIdentifier,
      }),
    ]);

    expect(res.status).to.equal(400);
    expect(res.body.message).to.equal('All events in a batch must belong to the same agent');

    const activities = await activityRepository.findByConversation(ctx.session.environment._id, conversationId);
    expect(activities.filter((a) => a.identifier?.startsWith('msg-mixed-agent-'))).to.have.length(0);
  });

  it('should reject an unknown conversation with a 404', async () => {
    const res = await postIngest([messageEnvelope(NONEXISTENT_CONVERSATION_ID, 'msg-unknown-conv')]);

    expect(res.status).to.equal(404);
  });

  it('should reject envelopes whose agentId does not match the conversation agent with a 400', async () => {
    const conversationId = await seedConversation(ctx);

    const otherAgentIdentifier = `e2e-other-agent-${Date.now()}`;
    const createRes = await ctx.session.testAgent.post('/v1/agents').send({
      name: 'Other Agent',
      identifier: otherAgentIdentifier,
    });
    expect(createRes.status).to.equal(201);

    const res = await postIngest([
      messageEnvelope(conversationId, 'msg-agent-mismatch', { agentId: otherAgentIdentifier }),
    ]);

    expect(res.status).to.equal(400);
    expect(res.body.message).to.equal('Agent does not match conversation');

    const activities = await activityRepository.findByConversation(ctx.session.environment._id, conversationId);
    expect(activities.filter((a) => a.identifier === 'msg-agent-mismatch')).to.have.length(0);
  });

  it('should return 404 when the agent event protocol flag is off', async () => {
    const conversationId = await seedConversation(ctx);
    const previousFlag = process.env.IS_AGENT_EVENT_PROTOCOL_ENABLED;
    delete process.env.IS_AGENT_EVENT_PROTOCOL_ENABLED;

    try {
      const res = await postIngest([messageEnvelope(conversationId, 'msg-flag-off')]);

      expect(res.status).to.equal(404);
    } finally {
      process.env.IS_AGENT_EVENT_PROTOCOL_ENABLED = previousFlag;
    }
  });

  it('should accept a bridge tool-approval-request, persist the activity, and deliver the approval card', async () => {
    const conversationId = await seedConversation(ctx);
    const outboundGateway = testServer.getService(OutboundGateway);
    const approvalId = `approval-${Date.now()}`;

    const res = await postIngest([
      buildEnvelope(conversationId, {
        type: 'tool-approval-request',
        approvalId,
        toolUseId: 'tool-use-1',
        toolName: 'delete_records',
        input: { table: 'users' },
        deliverCard: true,
      }),
    ]);

    expect(res.status).to.equal(200);

    const activities = await activityRepository.findByConversation(ctx.session.environment._id, conversationId);
    const approvalActivity = activities.find((a) => a.type === ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST);
    expect(approvalActivity).to.exist;

    // A bridge tool-approval-request with deliverCard auto-delivers the approval card to the platform.
    expect((outboundGateway.postToConversation as sinon.SinonStub).called).to.be.true;
  });

  it('should persist run-start and run-finish as sequenced lifecycle activities', async () => {
    const conversationId = await seedConversation(ctx);
    const runId = `run-lifecycle-${Date.now()}`;

    const res = await postIngest([
      buildEnvelope(conversationId, { type: 'run-start' }, { runId, sequence: 1 }),
      buildEnvelope(
        conversationId,
        { type: 'run-finish', outcome: 'completed', finishReason: 'stop' },
        { runId, sequence: 2 }
      ),
    ]);

    expect(res.status).to.equal(200);

    const activities = await activityRepository.findByConversation(ctx.session.environment._id, conversationId);
    const runStart = activities.find((a) => a.type === ConversationActivityTypeEnum.RUN_START);
    const runFinish = activities.find((a) => a.type === ConversationActivityTypeEnum.RUN_FINISH);

    expect(runStart).to.exist;
    expect(runStart!.identifier).to.equal(`run_${runId}_start`);
    expect(runStart!.sequence).to.be.a('number');

    expect(runFinish).to.exist;
    expect(runFinish!.identifier).to.equal(`run_${runId}_finish`);
    expect(runFinish!.sequence).to.be.a('number');
    expect(runFinish!.richContent).to.deep.include({
      lifecycle: { outcome: 'completed', finishReason: 'stop' },
    });

    const handoff = await activityRepository.listForView({
      view: 'agent_handoff',
      environmentId: ctx.session.environment._id,
      organizationId: ctx.session.organization._id,
      conversationId,
      limit: 50,
    });
    expect(handoff.data.some((a) => a.type === ConversationActivityTypeEnum.RUN_START)).to.equal(false);
    expect(handoff.data.some((a) => a.type === ConversationActivityTypeEnum.RUN_FINISH)).to.equal(false);
  });

  it('should accept a tool-approval-request without deliverCard and persist the activity without posting a card', async () => {
    const conversationId = await seedConversation(ctx);
    const outboundGateway = testServer.getService(OutboundGateway);
    const approvalId = `approval-no-card-${Date.now()}`;

    const res = await postIngest([
      buildEnvelope(conversationId, {
        type: 'tool-approval-request',
        approvalId,
        toolUseId: 'tool-use-1',
        toolName: 'delete_records',
        input: { table: 'users' },
      }),
    ]);

    expect(res.status).to.equal(200);

    const activities = await activityRepository.findByConversation(ctx.session.environment._id, conversationId);
    const approvalActivity = activities.find((a) => a.type === ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST);
    expect(approvalActivity).to.exist;

    // Without deliverCard the SDK owns the approval UI — no default card is posted.
    expect((outboundGateway.postToConversation as sinon.SinonStub).called).to.be.false;
  });
});
