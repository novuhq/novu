import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEvent, type AgentEventEnvelope } from '@novu/agent-event-protocol';
import { WebSocketsQueueService } from '@novu/application-generic';
import { type ActivityView, ConversationActivityTypeEnum, ConversationStatusEnum } from '@novu/dal';
import { NOVU_RESOLVE_SCHEMA, WebSocketEventEnum } from '@novu/shared';
import { testServer } from '@novu/testing';
import type { StreamPart } from '@novu/thalamus';
import { expect } from 'chai';
import sinon from 'sinon';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import { HandlePlanProgress } from '../conversation-runtime/reply/handle-plan-progress/handle-plan-progress.usecase';
import { ManagedAgentEventHandler } from '../managed-runtime/managed-agent-event-handler.service';
import {
  AgentTestContext,
  activityRepository,
  conversationRepository,
  seedConversation,
  setupAgentTestContext,
} from './helpers/agent-test-setup';

const LARGE_OUTPUT = 'x'.repeat(70_000);

const MANAGED_TOOL_PARTS: StreamPart[] = [
  { type: 'run-start' },
  { type: 'tool-use-start', toolUseId: 'toolu_search', toolName: 'search_docs' },
  { type: 'tool-use-done', toolUseId: 'toolu_search', toolName: 'search_docs', input: { query: 'pricing' } },
  { type: 'tool-use-result', toolUseId: 'toolu_search', content: [{ type: 'text', text: LARGE_OUTPUT }] },
  {
    type: 'tool-use-done',
    toolUseId: 'toolu_charge',
    toolName: 'charge_card',
    input: { amount: 10 },
    source: { type: 'mcp', serverName: 'stripe' },
  },
  {
    type: 'tool-use-result',
    toolUseId: 'toolu_charge',
    content: [{ type: 'text', text: 'card declined' }],
    isError: true,
  },
  { type: 'tool-use-done', toolUseId: 'toolu_resolve', toolName: NOVU_RESOLVE_SCHEMA.name, input: { summary: 'x' } },
  { type: 'tool-use-result', toolUseId: 'toolu_resolve', content: [{ type: 'text', text: 'resolved' }] },
];

describe('Agent tool ledger #novu-v2', () => {
  let ctx: AgentTestContext;
  let wsAdd: sinon.SinonStub;

  before(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
  });

  beforeEach(async () => {
    ctx = await setupAgentTestContext();

    const outboundGateway = testServer.getService(OutboundGateway);
    sinon
      .stub(outboundGateway, 'postToConversation')
      .resolves({ messageId: 'platform-msg-1', platformThreadId: 'platform-thread-1' });
    sinon.stub(outboundGateway, 'startTypingInConversation').resolves();
    sinon.stub(outboundGateway, 'stopTypingInConversation').resolves();
    sinon.stub(testServer.getService(HandlePlanProgress), 'execute').resolves();
    wsAdd = sinon.stub(testServer.getService(WebSocketsQueueService), 'add').resolves();
  });

  async function deliverManagedParts(conversationId: string, platform: string, runId: string, parts: StreamPart[]) {
    const conversation = await conversationRepository.findOne(
      { _id: conversationId, _environmentId: ctx.session.environment._id },
      '*'
    );
    const channel = conversation?.channels[0];
    if (!channel) {
      throw new Error('seeded conversation has no channel');
    }

    const handlers = testServer.getService(ManagedAgentEventHandler).createHandlers({
      sessionId: 'session-1',
      turnId: 'turn-1',
      runId,
      metadata: {
        conversationId,
        environmentId: ctx.session.environment._id,
        organizationId: ctx.session.organization._id,
        agentId: ctx.agentId,
        agentIdentifier: ctx.agentIdentifier,
        integrationIdentifier: ctx.integrationIdentifier,
        integrationId: channel._integrationId,
        platform,
        platformThreadId: channel.platformThreadId,
      },
    });

    for (const part of parts) {
      await handlers.onPart?.(part);
    }
  }

  async function toolRows(conversationId: string) {
    const activities = await activityRepository.findByConversation(ctx.session.environment._id, conversationId);

    return {
      calls: activities.filter((activity) => activity.type === ConversationActivityTypeEnum.TOOL_CALL),
      results: activities.filter((activity) => activity.type === ConversationActivityTypeEnum.TOOL_RESULT),
    };
  }

  async function viewTypes(conversationId: string, view: ActivityView) {
    const page = await activityRepository.listForView({
      view,
      environmentId: ctx.session.environment._id,
      organizationId: ctx.session.organization._id,
      conversationId,
      limit: 50,
    });

    return page.data.map((activity) => `${activity.type}:${activity.toolData?.toolCallId ?? ''}`);
  }

  function liveEventTypes(): string[] {
    return wsAdd
      .getCalls()
      .map((call) => call.args[0]?.data)
      .filter((data) => data?.event === WebSocketEventEnum.AGENT_EVENT)
      .map((data) => (data.payload as AgentEventEnvelope).event.type);
  }

  async function seedWebChatConversation(): Promise<string> {
    const subscriberId = `web-chat-sub-${Date.now()}`;
    const subscriberRes = await ctx.session.testAgent.post('/v1/subscribers').send({ subscriberId });
    expect(subscriberRes.status).to.equal(201);

    const conversation = await conversationRepository.create({
      identifier: `conv-web-${Date.now()}`,
      _agentId: ctx.agentId,
      participants: [
        { type: 'agent' as const, id: ctx.agentId },
        { type: 'subscriber' as const, id: subscriberId },
      ],
      channels: [{ platform: 'web_chat', _integrationId: ctx.integrationId, platformThreadId: `web-${Date.now()}` }],
      status: ConversationStatusEnum.ACTIVE,
      title: 'Web chat tool ledger',
      metadata: {},
      _environmentId: ctx.session.environment._id,
      _organizationId: ctx.session.organization._id,
      lastActivityAt: new Date().toISOString(),
    });

    return conversation._id;
  }

  it('records every managed tool call and result once on Slack, even when the webhooks are redelivered', async () => {
    const conversationId = await seedConversation(ctx);

    await deliverManagedParts(conversationId, 'slack', 'run-managed', MANAGED_TOOL_PARTS);
    await deliverManagedParts(conversationId, 'slack', 'run-managed', MANAGED_TOOL_PARTS);

    const { calls, results } = await toolRows(conversationId);

    expect(calls.map((call) => call.identifier).sort()).to.deep.equal([
      `tool-call:${conversationId}:run-managed:toolu_charge`,
      `tool-call:${conversationId}:run-managed:toolu_search`,
    ]);
    const charge = calls.find((call) => call.toolData?.toolCallId === 'toolu_charge');
    expect(charge?.content).to.equal('Called charge_card');
    expect(charge?.toolData).to.deep.equal({
      toolCallId: 'toolu_charge',
      toolName: 'charge_card',
      input: { amount: 10 },
      mcpServerName: 'stripe',
    });
    expect(charge?.sequence).to.be.a('number');

    expect(results).to.have.length(3);
    const search = results.find((result) => result.toolData?.toolCallId === 'toolu_search');
    expect(search?.identifier).to.equal(`tool-result:${conversationId}:run-managed:toolu_search`);
    expect(search?.toolData?.isError).to.equal(false);
    expect(search?.toolData?.truncated).to.equal(true);
    expect(search?.toolData).to.not.have.property('output');
    const [searchPart] = search?.toolData?.content ?? [];
    expect(searchPart?.type === 'text' && searchPart.text.length).to.equal(65536);

    const failed = results.find((result) => result.toolData?.toolCallId === 'toolu_charge');
    expect(failed?.toolData?.isError).to.equal(true);
    expect(failed?.toolData?.content).to.deep.equal([{ type: 'text', text: 'card declined' }]);

    const timeline = await viewTypes(conversationId, 'operator_timeline');
    expect(timeline).to.include.members(['tool_call:toolu_search', 'tool_result:toolu_search']);
    for (const view of ['agent_handoff', 'client_events', 'approval_activities', 'llm_transcript'] as const) {
      const types = await viewTypes(conversationId, view);
      expect(types.some((entry) => entry.startsWith('tool_call:') || entry.startsWith('tool_result:'))).to.equal(
        false,
        view
      );
    }
  });

  it('records managed tool rows on web chat without sending them to the browser', async () => {
    const conversationId = await seedWebChatConversation();

    await deliverManagedParts(conversationId, 'web_chat', 'run-web', MANAGED_TOOL_PARTS);

    const { calls, results } = await toolRows(conversationId);
    expect(calls).to.have.length(2);
    expect(results).to.have.length(3);

    const live = liveEventTypes();
    expect(live).to.include('run-start');
    expect(live.filter((type) => type.startsWith('tool-use'))).to.deep.equal([]);
  });

  describe('bridge ingest', () => {
    function envelope(conversationId: string, event: AgentEvent, sequence: number): AgentEventEnvelope {
      return {
        version: AGENT_EVENT_PROTOCOL_VERSION,
        conversationId,
        agentId: ctx.agentIdentifier,
        runId: 'run-bridge',
        turnId: 'turn-1',
        sequence,
        timestamp: new Date().toISOString(),
        event,
      };
    }

    it('records the call and keeps the result model-facing, idempotent across a retried ingest', async () => {
      const conversationId = await seedConversation(ctx);
      const events = [
        envelope(
          conversationId,
          { type: 'tool-use-done', toolUseId: 'call_1', toolName: 'lookup_order', input: { id: 'ORD-42' } },
          1
        ),
        envelope(
          conversationId,
          {
            type: 'tool-use-result',
            toolUseId: 'call_1',
            content: [
              { type: 'text', text: 'Order is shipped' },
              { type: 'json', value: { status: 'shipped' } },
            ],
          },
          2
        ),
      ];

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const res = await ctx.session.testAgent.post('/v1/agents/events/ingest').send({ events });
        expect(res.status).to.equal(200);
      }

      const { calls, results } = await toolRows(conversationId);
      expect(calls.map((call) => call.identifier)).to.deep.equal([`tool-call:${conversationId}:run-bridge:call_1`]);
      expect(results).to.have.length(1);
      expect(results[0].identifier).to.equal(`tool-result:${conversationId}:run-bridge:call_1`);
      expect(results[0].content).to.equal('Order is shipped');
      expect(results[0].toolData).to.deep.equal({
        toolCallId: 'call_1',
        output: { status: 'shipped' },
        content: [
          { type: 'text', text: 'Order is shipped' },
          { type: 'json', value: { status: 'shipped' } },
        ],
        isError: false,
      });

      const handoff = await viewTypes(conversationId, 'agent_handoff');
      expect(handoff).to.include('tool_result:call_1');
      expect(handoff).to.not.include('tool_call:call_1');
    });
  });
});
