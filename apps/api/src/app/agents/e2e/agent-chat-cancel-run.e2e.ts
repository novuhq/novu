import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEventEnvelope } from '@novu/agent-event-protocol';
import { ConversationActivityTypeEnum } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { testServer } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { BridgeExecutorService } from '../conversation-runtime/runtime/bridge-executor.service';
import {
  AgentTestContext,
  activityRepository,
  conversationRepository,
  setupAgentTestContext,
} from './helpers/agent-test-setup';

const POLL_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 50;

async function pollFor<T>(fn: () => Promise<T | null | undefined>, timeoutMs = POLL_TIMEOUT_MS): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(
    `pollFor timed out after ${timeoutMs}ms${lastError ? `; last error: ${(lastError as Error).message}` : ''}`
  );
}

describe('Agent Chat - cancel run #novu-v2', () => {
  let ctx: AgentTestContext;
  let subscriberToken: string;

  before(() => {
    process.env.IS_AGENT_EVENT_PROTOCOL_ENABLED = 'true';
    process.env.IS_AGENT_WEB_CHAT_ENABLED = 'true';
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
  });

  after(() => {
    delete process.env.IS_AGENT_EVENT_PROTOCOL_ENABLED;
    delete process.env.IS_AGENT_WEB_CHAT_ENABLED;
    delete process.env.IS_CONVERSATIONAL_AGENTS_ENABLED;
  });

  beforeEach(async () => {
    ctx = await setupAgentTestContext();

    const bridgeExecutor = testServer.getService(BridgeExecutorService);
    sinon.stub(bridgeExecutor, 'execute').resolves();

    const inboxSession = await ctx.session.testAgent.post('/v1/inbox/session').send({
      applicationIdentifier: ctx.session.environment.identifier,
      subscriberId: ctx.session.subscriberId,
    });
    expect(inboxSession.status).to.equal(201);
    subscriberToken = inboxSession.body.data.token;

    const linkRes = await ctx.session.testAgent.post(`/v1/agents/${ctx.agentIdentifier}/integrations`).send({
      providerId: ChatProviderIdEnum.NovuAgentChat,
    });
    expect(linkRes.status).to.equal(201);
  });

  afterEach(() => {
    sinon.restore();
  });

  function createConversation(body: { agentId: string; text: string }) {
    return ctx.session.testAgent
      .post('/v1/agent-chat/conversations')
      .set('Authorization', `Bearer ${subscriberToken}`)
      .send(body);
  }

  function cancelRun(publicId: string, body: { agentId: string; idempotencyKey: string }) {
    return ctx.session.testAgent
      .post(`/v1/agent-chat/conversations/${publicId}/cancel`)
      .set('Authorization', `Bearer ${subscriberToken}`)
      .send(body);
  }

  async function waitForConversation(identifier: string) {
    return pollFor(() =>
      conversationRepository.findOne(
        {
          identifier,
          _environmentId: ctx.session.environment._id,
        },
        '*'
      )
    );
  }

  async function ingestRunStart(mongoConversationId: string, runId: string, sequence = 1): Promise<void> {
    const envelope: AgentEventEnvelope = {
      version: AGENT_EVENT_PROTOCOL_VERSION,
      conversationId: mongoConversationId,
      agentId: ctx.agentIdentifier,
      runId,
      turnId: runId,
      sequence,
      timestamp: new Date().toISOString(),
      event: { type: 'run-start' },
    };

    const res = await ctx.session.testAgent.post('/v1/agents/events/ingest').send({ events: [envelope] });
    expect(res.status).to.equal(200);
  }

  it('should cancel an active run and persist run-finish aborted', async () => {
    const createRes = await createConversation({ agentId: ctx.agentIdentifier, text: 'Cancel me' });
    expect(createRes.status).to.equal(201);

    const publicId = createRes.body.data.identifier as string;
    const conversation = await waitForConversation(publicId);
    const runId = `run-cancel-${Date.now()}`;

    await ingestRunStart(String(conversation._id), runId);

    const cancelRes = await cancelRun(publicId, {
      agentId: ctx.agentIdentifier,
      idempotencyKey: 'cancel-e2e-1',
    });

    expect(cancelRes.status).to.equal(201);
    expect(cancelRes.body.data.status).to.equal('canceled');
    expect(cancelRes.body.data.runId).to.equal(runId);

    const finish = await activityRepository.findOne(
      {
        _conversationId: conversation._id,
        _environmentId: ctx.session.environment._id,
        identifier: `run_${runId}_finish`,
      },
      '*'
    );

    expect(finish).to.exist;
    expect(finish?.type).to.equal(ConversationActivityTypeEnum.RUN_FINISH);
    expect(finish?.richContent).to.deep.include({
      lifecycle: { outcome: 'aborted' },
    });
  });

  it('should no-op cancel after the run already finished', async () => {
    const createRes = await createConversation({ agentId: ctx.agentIdentifier, text: 'Already done' });
    const publicId = createRes.body.data.identifier as string;
    const conversation = await waitForConversation(publicId);
    const runId = `run-done-${Date.now()}`;

    await ingestRunStart(String(conversation._id), runId);

    const finishEnvelope: AgentEventEnvelope = {
      version: AGENT_EVENT_PROTOCOL_VERSION,
      conversationId: String(conversation._id),
      agentId: ctx.agentIdentifier,
      runId,
      turnId: runId,
      sequence: 2,
      timestamp: new Date().toISOString(),
      event: { type: 'run-finish', outcome: 'completed' },
    };

    const finishRes = await ctx.session.testAgent.post('/v1/agents/events/ingest').send({ events: [finishEnvelope] });
    expect(finishRes.status).to.equal(200);

    const cancelRes = await cancelRun(publicId, {
      agentId: ctx.agentIdentifier,
      idempotencyKey: 'cancel-e2e-2',
    });

    expect(cancelRes.status).to.equal(201);
    expect(cancelRes.body.data.status).to.equal('no-op');
  });

  it('should treat duplicate cancel idempotency keys as duplicate', async () => {
    const createRes = await createConversation({ agentId: ctx.agentIdentifier, text: 'Dup key' });
    const publicId = createRes.body.data.identifier as string;
    const conversation = await waitForConversation(publicId);
    const runId = `run-dup-${Date.now()}`;

    await ingestRunStart(String(conversation._id), runId);

    const first = await cancelRun(publicId, {
      agentId: ctx.agentIdentifier,
      idempotencyKey: 'cancel-e2e-dup',
    });
    expect(first.body.data.status).to.equal('canceled');

    const runId2 = `run-dup-2-${Date.now()}`;
    await ingestRunStart(String(conversation._id), runId2, 3);

    const second = await cancelRun(publicId, {
      agentId: ctx.agentIdentifier,
      idempotencyKey: 'cancel-e2e-dup',
    });
    expect(second.body.data.status).to.equal('duplicate');
  });
});
