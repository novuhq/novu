import { createAnthropicProvider } from '@novu/application-generic/build/main/agent-runtimes/anthropic/anthropic-agent-runtime.provider';
import { ConversationActivityTypeEnum } from '@novu/dal';
import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { testServer } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import { ManagedAgentProviderFactory } from '../managed-runtime/managed-agent-provider-factory.service';
import { HandlePendingToolApprovalsCommand } from '../managed-runtime/tool-approval/handle-pending-tool-approvals.command';
import { HandlePendingToolApprovals } from '../managed-runtime/tool-approval/handle-pending-tool-approvals.usecase';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import {
  AgentTestContext,
  activityRepository,
  seedConversation,
  setupAgentTestContext,
} from './helpers/agent-test-setup';

/**
 * Drives HandlePendingToolApprovals through the real Anthropic provider and SDK against a fake
 * Anthropic `GET /v1/sessions/:id/events` endpoint. The session parks with no `actionsRequired`
 * in the webhook payload, so the pending tools must be recovered from the session event stream.
 */

type FakeEvent = Record<string, unknown>;

/** One fake event stream: cursor-linked pages, served in order. `next_page` on the last page is kept as given. */
type FakePage = { data: FakeEvent[]; next_page: string | null };

type FakeSession = { idle: FakePage[]; toolUse: FakePage[] } | { status: number; body: unknown };

type RecordedRequest = { stream: 'idle' | 'toolUse'; order: string | null; types: string[]; page: string | null };

const ANTHROPIC_EVENTS_PATH = /^\/v1\/sessions\/([^/]+)\/events$/;

function idle(id: string, stopReason: FakeEvent, thread?: { agentName: string; threadId: string }): FakeEvent {
  return {
    id,
    type: thread ? 'session.thread_status_idle' : 'session.status_idle',
    processed_at: '2026-10-06T10:00:00.000Z',
    stop_reason: stopReason,
    stop_details: null,
    ...(thread ? { agent_name: thread.agentName, session_thread_id: thread.threadId } : {}),
  };
}

function requiresAction(eventIds: string[]): FakeEvent {
  return { type: 'requires_action', event_ids: eventIds };
}

function toolUse(id: string, name: string, input: Record<string, unknown>): FakeEvent {
  return { id, type: 'agent.tool_use', name, input, processed_at: '2026-10-06T09:59:00.000Z' };
}

function mcpToolUse(id: string, mcpServerName: string, name: string, input: Record<string, unknown>): FakeEvent {
  return { ...toolUse(id, name, input), type: 'agent.mcp_tool_use', mcp_server_name: mcpServerName };
}

function installFakeAnthropicEventsApi(sessions: Record<string, FakeSession>): RecordedRequest[] {
  const requests: RecordedRequest[] = [];
  const realFetch = globalThis.fetch;

  sinon.stub(globalThis, 'fetch').callsFake(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const match = url.hostname === 'api.anthropic.com' ? ANTHROPIC_EVENTS_PATH.exec(url.pathname) : null;

    if (!match) {
      return realFetch(input, init);
    }

    const session = sessions[decodeURIComponent(match[1])];
    const types = url.searchParams.getAll('types[]');
    const stream = types.includes('session.status_idle') ? 'idle' : 'toolUse';
    const page = url.searchParams.get('page');
    requests.push({ stream, order: url.searchParams.get('order'), types, page });

    if (!session) {
      return jsonResponse(404, { type: 'error', error: { type: 'not_found_error', message: 'session not found' } });
    }

    if ('status' in session) {
      return jsonResponse(session.status, session.body);
    }

    const pages = session[stream];
    const index = page ? Number(page.replace('cursor_', '')) : 0;

    return jsonResponse(200, pages[index] ?? { data: [], next_page: null });
  });

  return requests;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('Managed agent pending tool approvals from Anthropic session events #novu-v2', () => {
  let ctx: AgentTestContext;
  let postToConversation: sinon.SinonStub;

  const previousConversationalAgentsFlag = process.env.IS_CONVERSATIONAL_AGENTS_ENABLED;
  const previousHitlFlag = process.env.IS_AGENT_HUMAN_HITL_ENABLED;

  before(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    process.env.IS_AGENT_HUMAN_HITL_ENABLED = 'false';
  });

  after(() => {
    restoreEnv('IS_CONVERSATIONAL_AGENTS_ENABLED', previousConversationalAgentsFlag);
    restoreEnv('IS_AGENT_HUMAN_HITL_ENABLED', previousHitlFlag);
  });

  beforeEach(async () => {
    ctx = await setupAgentTestContext();

    const provider = createAnthropicProvider(AgentRuntimeProviderIdEnum.Anthropic, { apiKey: 'sk-fake-anthropic' });
    sinon.stub(testServer.getService(ManagedAgentProviderFactory), 'tryGetByAgentIdentifier').resolves(provider);

    const outboundGateway = testServer.getService(OutboundGateway);
    postToConversation = sinon
      .stub(outboundGateway, 'postToConversation')
      .resolves({ messageId: 'platform-approval-msg', platformThreadId: 'platform-thread-1' });
    sinon.stub(outboundGateway, 'editInConversation').resolves();
    sinon.stub(outboundGateway, 'startTypingInConversation').resolves();
    sinon.stub(outboundGateway, 'stopTypingInConversation').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  async function runParkedSession(sessionId: string) {
    const conversationId = await seedConversation(ctx);

    await testServer.getService(HandlePendingToolApprovals).execute(
      HandlePendingToolApprovalsCommand.create({
        userId: ctx.session.user._id,
        environmentId: ctx.session.environment._id,
        organizationId: ctx.session.organization._id,
        conversationId,
        agentIdentifier: ctx.agentIdentifier,
        integrationIdentifier: ctx.integrationIdentifier,
        subscriberId: ctx.session.subscriberId,
        platform: AgentPlatformEnum.SLACK,
        platformThreadId: 'platform-thread-1',
        sessionId,
        response: {
          messages: [],
          finishReason: 'requires-action',
          actionsRequired: [],
        } as unknown as HandlePendingToolApprovalsCommand['response'],
      })
    );

    const activities = await activityRepository.findByConversation(ctx.session.environment._id, conversationId);

    return activities.filter((activity) => activity.type === ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST);
  }

  it('asks for the first tool of the latest pause, following tool-use pages past an empty page', async () => {
    const requests = installFakeAnthropicEventsApi({
      ses_multi: {
        idle: [
          {
            data: [idle('sevt_idle_latest', requiresAction(['sevt_linear', 'sevt_bash']))],
            next_page: 'cursor_1',
          },
          {
            data: [idle('sevt_idle_stale', requiresAction(['sevt_stale_tool']))],
            next_page: null,
          },
        ],
        toolUse: [
          {
            data: [
              toolUse('sevt_stale_tool', 'bash', { command: 'ls' }),
              toolUse('sevt_bash', 'bash', { command: 'rm -rf build' }),
            ],
            next_page: 'cursor_1',
          },
          { data: [], next_page: 'cursor_2' },
          {
            data: [mcpToolUse('sevt_linear', 'Linear', 'create_issue', { title: 'Rotate keys', teamId: 'ENG' })],
            next_page: 'cursor_3',
          },
          {
            data: [toolUse('sevt_never_read', 'bash', { command: 'echo unreachable' })],
            next_page: null,
          },
        ],
      },
    });

    const approvals = await runParkedSession('ses_multi');

    expect(approvals).to.have.length(1);
    expect(approvals[0].toolData).to.deep.include({
      toolCallId: 'sevt_linear',
      toolName: 'create_issue',
      mcpServerName: 'Linear',
      input: { title: 'Rotate keys', teamId: 'ENG' },
    });
    expect(postToConversation.calledOnce).to.equal(true);

    expect(requests).to.deep.equal([
      { stream: 'idle', order: 'desc', types: ['session.status_idle', 'session.thread_status_idle'], page: null },
      { stream: 'toolUse', order: 'asc', types: ['agent.mcp_tool_use', 'agent.tool_use'], page: null },
      { stream: 'toolUse', order: 'asc', types: ['agent.mcp_tool_use', 'agent.tool_use'], page: 'cursor_1' },
      { stream: 'toolUse', order: 'asc', types: ['agent.mcp_tool_use', 'agent.tool_use'], page: 'cursor_2' },
    ]);
  });

  it('recovers a built-in tool from a sub-agent thread pause behind a finished thread', async () => {
    installFakeAnthropicEventsApi({
      ses_threads: {
        idle: [
          {
            data: [
              idle('sevt_thread_done', { type: 'end_turn' }, { agentName: 'researcher', threadId: 'sthr_researcher' }),
              idle('sevt_thread_parked', requiresAction(['sevt_deploy']), {
                agentName: 'deployer',
                threadId: 'sthr_deployer',
              }),
            ],
            next_page: null,
          },
        ],
        toolUse: [
          {
            data: [toolUse('sevt_deploy', 'bash', { command: 'kubectl rollout restart deploy/api' })],
            next_page: null,
          },
        ],
      },
    });

    const approvals = await runParkedSession('ses_threads');

    expect(approvals).to.have.length(1);
    expect(approvals[0].toolData).to.deep.include({
      toolCallId: 'sevt_deploy',
      toolName: 'bash',
      input: { command: 'kubectl rollout restart deploy/api' },
    });
    expect(approvals[0].toolData?.mcpServerName).to.equal(undefined);
  });

  it('posts no card and does not throw when Anthropic rejects the events lookup', async () => {
    const requests = installFakeAnthropicEventsApi({
      ses_unauthorized: {
        status: 401,
        body: { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } },
      },
    });

    const approvals = await runParkedSession('ses_unauthorized');

    expect(approvals).to.have.length(0);
    expect(postToConversation.called).to.equal(false);
    expect(requests).to.have.length(1);
  });
});

function restoreEnv(key: string, previous: string | undefined) {
  if (previous === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = previous;
  }
}
