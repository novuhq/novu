import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
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
import { BridgeExecutorService } from '../conversation-runtime/runtime/bridge-executor.service';
import { BRIDGE_HISTORY_MAX_BYTES } from '../conversation-runtime/runtime/bridge-history';
import { AgentEventEnum } from '../shared/enums/agent-event.enum';
import {
  AgentTestContext,
  activityRepository,
  conversationRepository,
  must,
  seedConversation,
  setupAgentTestContext,
} from './helpers/agent-test-setup';

/** One ~100KB tool output, over the 16KB per-output cap. A capped cycle is ~17.5KB on the wire. */
const LARGE_OUTPUT = 'x'.repeat(100_000);
/** Ten capped cycles (~175KB) fit the 512KB history budget. */
const FITTING_CYCLES = 10;
/** Twenty capped cycles (~350KB) plus two newer ~120KB messages do not, and still fit the newest-50 row window. */
const TRIMMED_CYCLES = 20;
const LARGE_MESSAGE = 'm'.repeat(120_000);

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

  /** Ingest approval-gated tool cycles, each with a large result, as a bridge agent would. */
  async function ingestLargeGatedCycles(conversationId: string, cycles: number): Promise<void> {
    let sequence = 1;

    for (let i = 0; i < cycles; i += 1) {
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

  async function createAgentMessage(conversationId: string, identifier: string, content: string): Promise<void> {
    const conversation = must(
      await conversationRepository.findOne({ _id: conversationId, _environmentId: ctx.session.environment._id }, '*'),
      'conversation'
    );
    const channel = conversation.channels[0];
    await activityRepository.createAgentActivity({
      identifier,
      conversationId,
      platform: channel.platform,
      integrationId: channel._integrationId,
      platformThreadId: channel.platformThreadId,
      agentId: ctx.agentIdentifier,
      environmentId: ctx.session.environment._id,
      organizationId: ctx.session.organization._id,
      content,
    });
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

  it('caps each tool output to its byte budget, truncation marker included', async () => {
    const conversationId = await seedConversation(ctx);
    await ingestLargeGatedCycles(conversationId, FITTING_CYCLES);

    const storedResults = await activityRepository.find(
      {
        _environmentId: ctx.session.environment._id,
        _conversationId: conversationId,
        type: ConversationActivityTypeEnum.TOOL_RESULT,
      },
      '*'
    );
    expect(storedResults).to.have.length(FITTING_CYCLES);
    for (const row of storedResults) {
      expect(Buffer.byteLength(String(row.toolData?.output), 'utf8'), 'stored output').to.be.at.most(
        TOOL_OUTPUT_MAX_BYTES
      );
      expect(row.toolData?.truncated, 'stored truncated flag').to.equal(true);
      expect(Buffer.byteLength(row.content, 'utf8'), 'stored preview').to.be.at.most(1024);
    }

    const history = await buildBridgeHistory(conversationId);

    expect(byteLength(history)).to.be.at.most(BRIDGE_HISTORY_MAX_BYTES);

    const toolResults = history.filter((entry) => entry.type === 'tool_result');
    expect(toolResults).to.have.length(FITTING_CYCLES);

    for (const result of toolResults) {
      const output = String(result.toolData?.output);
      expect(Buffer.byteLength(output, 'utf8')).to.be.at.most(TOOL_OUTPUT_MAX_BYTES);
      expect(output).to.contain('[truncated: tool output exceeded');
    }
  });

  it('keeps the oldest message when every tool result fits once capped', async () => {
    const conversationId = await seedConversation(ctx);
    await createAgentMessage(conversationId, 'history-oldest-message', 'Noted: your order number is #A1.');
    await ingestLargeGatedCycles(conversationId, FITTING_CYCLES);

    const history = await buildBridgeHistory(conversationId);

    expect(history[0]?.content).to.equal('Noted: your order number is #A1.');
    const toolResults = history.filter((entry) => entry.type === 'tool_result');
    expect(toolResults).to.have.length(FITTING_CYCLES);
    for (const result of toolResults) {
      expect(byteLength(result), 'one tool result row on the wire').to.be.at.most(TOOL_OUTPUT_MAX_BYTES + 2048);
    }
  });

  it('drops the oldest tool cycles whole when the capped history is still over budget', async () => {
    const conversationId = await seedConversation(ctx);
    await ingestLargeGatedCycles(conversationId, TRIMMED_CYCLES);
    await createAgentMessage(conversationId, 'history-large-message-1', LARGE_MESSAGE);
    await createAgentMessage(conversationId, 'history-large-message-2', LARGE_MESSAGE);

    const history = await buildBridgeHistory(conversationId);

    const requestedCallIds = history
      .filter((entry) => entry.type === 'tool_approval_request')
      .map((entry) => entry.toolData?.toolCallId);
    const resultCallIds = history
      .filter((entry) => entry.type === 'tool_result')
      .map((entry) => entry.toolData?.toolCallId);
    const keptCycles = requestedCallIds.length;

    const artifactPath = join(tmpdir(), 'novu-e2e-artifacts', 'bridge-history-over-budget.json');
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(
      artifactPath,
      JSON.stringify(
        {
          budgetBytes: BRIDGE_HISTORY_MAX_BYTES,
          historyBytes: byteLength(history),
          ingestedCycles: TRIMMED_CYCLES,
          rows: history.map((entry) => ({
            type: entry.type,
            id: entry.toolData?.approvalId ?? entry.toolData?.toolCallId,
            bytes: byteLength(entry),
          })),
          history,
        },
        null,
        2
      )
    );

    expect(keptCycles, `some cycles are trimmed (artifact: ${artifactPath})`).to.be.lessThan(TRIMMED_CYCLES);
    expect(keptCycles, 'some cycles survive').to.be.greaterThan(0);
    expect(byteLength(history)).to.be.at.most(BRIDGE_HISTORY_MAX_BYTES);
    const newestCallIds = Array.from(
      { length: keptCycles },
      (_, index) => `call_${TRIMMED_CYCLES - keptCycles + index}`
    );
    expect(requestedCallIds, 'the newest cycles are kept, oldest dropped first').to.deep.equal(newestCallIds);
    expect(resultCallIds, 'every kept request keeps its result').to.deep.equal(newestCallIds);
    expect(history.slice(-2).map((entry) => entry.content)).to.deep.equal([LARGE_MESSAGE, LARGE_MESSAGE]);
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
