import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEvent, type AgentEventEnvelope } from '@novu/agent-event-protocol';
import { ConversationActivityTypeEnum } from '@novu/dal';
import type { AgentHistoryEntry } from '@novu/framework';
import { testServer } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentConfigResolver } from '../channels/agent-config-resolver.service';
import { AGENT_HISTORY_LIMIT } from '../conversation-runtime/conversation/agent-conversation.helpers';
import { TOOL_OUTPUT_MAX_BYTES } from '../conversation-runtime/conversation/tool-result-content';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import {
  BRIDGE_HISTORY_MAX_BYTES,
  BridgeExecutorService,
} from '../conversation-runtime/runtime/bridge-executor.service';
import { AgentEventEnum } from '../shared/enums/agent-event.enum';
import {
  AgentTestContext,
  activityRepository,
  conversationRepository,
  must,
  seedConversation,
  setupAgentTestContext,
} from './helpers/agent-test-setup';

/** One ~100KB tool output; ten cycles far exceed the 512KB history budget and the 16KB per-output cap. */
const LARGE_OUTPUT = 'x'.repeat(100_000);
const GATED_CYCLES = 10;

function byteLength(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

describe('Bridge history slimming #novu-v2', () => {
  let ctx: AgentTestContext;

  before(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
  });

  beforeEach(async () => {
    ctx = await setupAgentTestContext();

    const outboundGateway = testServer.getService(OutboundGateway);
    sinon.stub(outboundGateway, 'postToConversation').resolves({
      messageId: 'platform-msg-1',
      platformThreadId: 'platform-thread-1',
    });
    sinon.stub(outboundGateway, 'startTypingInConversation').resolves();
    sinon.stub(outboundGateway, 'stopTypingInConversation').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

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

  async function ingest(events: AgentEventEnvelope[]): Promise<void> {
    const res = await ctx.session.testAgent.post('/v1/agents/events/ingest').send({ events });
    expect(res.status).to.equal(200);
  }

  /** Ingest `GATED_CYCLES` approval-gated tool cycles, each with a large result, as a bridge agent would. */
  async function ingestLargeGatedCycles(conversationId: string): Promise<void> {
    let sequence = 1;

    for (let i = 0; i < GATED_CYCLES; i += 1) {
      await ingest([
        envelope(
          conversationId,
          {
            type: 'tool-approval-request',
            approvalId: `appr_${i}`,
            toolUseId: `call_${i}`,
            toolName: 'notion_search',
            input: { query: `report ${i}` },
          },
          sequence++
        ),
      ]);
      await ingest([
        envelope(
          conversationId,
          { type: 'tool-use-result', toolUseId: `call_${i}`, content: [{ type: 'text', text: LARGE_OUTPUT }] },
          sequence++
        ),
      ]);
    }
  }

  async function buildBridgeHistory(conversationId: string): Promise<AgentHistoryEntry[]> {
    const conversation = must(
      await conversationRepository.findOne({ _id: conversationId, _environmentId: ctx.session.environment._id }, '*'),
      'conversation'
    );
    const config = await testServer.getService(AgentConfigResolver).resolve(ctx.agentId, ctx.integrationIdentifier);
    const bridgeExecutor = testServer.getService(BridgeExecutorService);

    const payload = await (bridgeExecutor as any).buildPayload({
      event: AgentEventEnum.ON_MESSAGE,
      config,
      conversation,
      subscriber: null,
      message: null,
      platformContext: {},
    });

    return payload.history as AgentHistoryEntry[];
  }

  it('caps each tool output and keeps the whole history under the byte budget', async () => {
    const conversationId = await seedConversation(ctx);
    await ingestLargeGatedCycles(conversationId);

    const history = await buildBridgeHistory(conversationId);

    expect(byteLength(history)).to.be.at.most(BRIDGE_HISTORY_MAX_BYTES);

    const toolResults = history.filter((entry) => entry.type === 'tool_result');
    expect(toolResults.length, 'at least one tool result survives trimming').to.be.greaterThan(0);

    for (const result of toolResults) {
      // The per-output cap plus its truncation marker; allow a small margin for the marker overhead.
      expect(byteLength(result.toolData?.output)).to.be.at.most(TOOL_OUTPUT_MAX_BYTES + 128);
      expect(typeof result.toolData?.output === 'string' && result.toolData.output).to.contain('truncated');
    }
  });

  it('never strands a tool result without its approval request when trimming the oldest rows', async () => {
    const conversationId = await seedConversation(ctx);
    await ingestLargeGatedCycles(conversationId);

    const history = await buildBridgeHistory(conversationId);

    const requestedCallIds = new Set(
      history.filter((entry) => entry.type === 'tool_approval_request').map((entry) => entry.toolData?.toolCallId)
    );
    const resultCallIds = new Set(
      history.filter((entry) => entry.type === 'tool_result').map((entry) => entry.toolData?.toolCallId)
    );

    expect(resultCallIds.size, 'some cycles survive').to.be.greaterThan(0);
    expect([...resultCallIds].sort()).to.deep.equal([...requestedCallIds].sort());
  });

  it('drops the decision and result of a cycle whose request falls outside the history window', async () => {
    const conversationId = await seedConversation(ctx);
    const conversation = must(
      await conversationRepository.findOne({ _id: conversationId, _environmentId: ctx.session.environment._id }, '*'),
      'conversation'
    );
    const channel = conversation.channels[0];
    let sequence = 1;
    let rowIndex = 0;

    const createRow = (params: { type?: ConversationActivityTypeEnum; content: string; toolData?: object }) =>
      activityRepository.createAgentActivity({
        identifier: `history-window-${rowIndex++}`,
        conversationId,
        platform: channel.platform,
        integrationId: channel._integrationId,
        platformThreadId: channel.platformThreadId,
        agentId: ctx.agentIdentifier,
        environmentId: ctx.session.environment._id,
        organizationId: ctx.session.organization._id,
        ...params,
      });

    const ingestApprovedCycle = async (index: number) => {
      await ingest([
        envelope(
          conversationId,
          {
            type: 'tool-approval-request',
            approvalId: `appr_${index}`,
            toolUseId: `call_${index}`,
            toolName: 'notion_search',
            input: { query: `report ${index}` },
          },
          sequence++
        ),
      ]);
      await createRow({
        type: ConversationActivityTypeEnum.TOOL_APPROVAL_DECISION,
        content: 'Approved notion_search',
        toolData: { approvalId: `appr_${index}`, approved: true, toolName: 'notion_search' },
      });
      await ingest([
        envelope(
          conversationId,
          { type: 'tool-use-result', toolUseId: `call_${index}`, content: [{ type: 'text', text: `pages ${index}` }] },
          sequence++
        ),
      ]);
    };

    // Oldest to newest: old cycle (3 rows), 45 replies, new cycle (3 rows) = 51 rows. The old cycle's
    // request is the one row outside the newest-50 window; its decision and result are inside.
    await ingestApprovedCycle(0);
    for (let i = 0; i < AGENT_HISTORY_LIMIT - 5; i += 1) {
      await createRow({ content: `reply ${i}` });
    }
    await ingestApprovedCycle(1);

    const window = await activityRepository.listForView({
      view: 'agent_handoff',
      environmentId: ctx.session.environment._id,
      organizationId: ctx.session.organization._id,
      conversationId,
      limit: AGENT_HISTORY_LIMIT,
    });
    const windowTypes = window.data.map((row) => `${row.type}:${row.toolData?.approvalId ?? row.toolData?.toolCallId}`);
    expect(windowTypes, 'precondition: the window cuts the old cycle').to.include.members([
      'tool_approval_decision:appr_0',
      'tool_result:call_0',
    ]);
    expect(windowTypes, 'precondition: the old request is outside the window').not.to.include(
      'tool_approval_request:appr_0'
    );

    const history = await buildBridgeHistory(conversationId);
    const toolRows = history
      .filter((entry) => entry.type !== ConversationActivityTypeEnum.MESSAGE)
      .map((entry) => ({
        type: entry.type,
        approvalId: entry.toolData?.approvalId,
        callId: entry.toolData?.toolCallId,
      }));

    expect(toolRows).to.deep.equal([
      { type: 'tool_approval_request', approvalId: 'appr_1', callId: 'call_1' },
      { type: 'tool_approval_decision', approvalId: 'appr_1', callId: undefined },
      { type: 'tool_result', approvalId: undefined, callId: 'call_1' },
    ]);
    expect(history.filter((entry) => entry.type === ConversationActivityTypeEnum.MESSAGE)).to.have.length(
      AGENT_HISTORY_LIMIT - 5
    );
  });
});
