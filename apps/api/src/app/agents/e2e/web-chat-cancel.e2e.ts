import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEvent, type AgentEventEnvelope } from '@novu/agent-event-protocol';
import { CacheService } from '@novu/application-generic';
import { ConversationActivityTypeEnum, type ConversationEntity } from '@novu/dal';
import { AgentEventEnum, HttpHeaderKeysEnum } from '@novu/framework/internal';
import { ChatProviderIdEnum } from '@novu/shared';
import { testServer } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentTurnAbortStore } from '../conversation-runtime/runtime/agent-turn-abort.store';
import { BridgeExecutorService } from '../conversation-runtime/runtime/bridge-executor.service';
import { AgentEventSink } from '../shared/agent-event-sink.service';
import {
  AgentTestContext,
  activityRepository,
  conversationRepository,
  setupAgentTestContext,
} from './helpers/agent-test-setup';

const turnAbortStore = () => testServer.getService(AgentTurnAbortStore) as AgentTurnAbortStore;

const POLL_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 50;

async function pollFor<T>(fn: () => Promise<T | null | undefined>, timeoutMs = POLL_TIMEOUT_MS): Promise<T> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await fn();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`pollFor timed out after ${timeoutMs}ms`);
}

describe('Web Chat - Stop a running turn #novu-v2', () => {
  let ctx: AgentTestContext;
  let subscriberToken: string;
  let executeSpy: sinon.SinonSpy;
  let fireStub: sinon.SinonStub;
  let sequence = 0;

  before(() => {
    process.env.IS_AGENT_EVENT_PROTOCOL_ENABLED = 'true';
    process.env.IS_AGENT_WEB_CHAT_ENABLED = 'true';
  });

  after(() => {
    delete process.env.IS_AGENT_EVENT_PROTOCOL_ENABLED;
    delete process.env.IS_AGENT_WEB_CHAT_ENABLED;
  });

  beforeEach(async () => {
    ctx = await setupAgentTestContext();

    // The real dispatch runs (so the active turn is recorded); only the HTTP call to the bridge is faked.
    const bridgeExecutor = testServer.getService(BridgeExecutorService);
    sinon.stub(bridgeExecutor as any, 'resolveBridgeUrl').returns('https://bridge.e2e.test/api/novu');
    fireStub = sinon.stub(bridgeExecutor as any, 'fireWithRetries').resolves({
      headers: { [HttpHeaderKeysEnum.NOVU_FRAMEWORK_AGENT_EVENTS]: 'onMessage,onAction,onResolve,onAbort' },
      body: { resume: () => undefined },
    });
    executeSpy = sinon.spy(bridgeExecutor, 'execute');

    const res = await ctx.session.testAgent.post(`/v1/agents/${ctx.agentIdentifier}/integrations`).send({
      providerId: ChatProviderIdEnum.NovuWebChat,
    });
    expect(res.status).to.equal(201);

    const inboxSession = await ctx.session.testAgent.post('/v1/inbox/session').send({
      applicationIdentifier: ctx.session.environment.identifier,
      subscriberId: ctx.session.subscriberId,
    });
    expect(inboxSession.status).to.equal(201);
    subscriberToken = inboxSession.body.data.token;
  });

  afterEach(() => {
    sinon.restore();
  });

  async function startConversation(): Promise<{ identifier: string; conversation: ConversationEntity }> {
    const res = await ctx.session.testAgent
      .post('/v1/web-chat/conversations')
      .set('Authorization', `Bearer ${subscriberToken}`)
      .send({ agentId: ctx.agentIdentifier, text: 'Add an email step' });
    expect(res.status).to.equal(201);

    const conversation = await pollFor(() =>
      conversationRepository.findOne(
        { identifier: res.body.data.identifier, _environmentId: ctx.session.environment._id },
        '*'
      )
    );

    return { identifier: res.body.data.identifier, conversation };
  }

  function cancel(identifier: string, token = subscriberToken, body: Record<string, unknown> = {}) {
    return ctx.session.testAgent
      .post(`/v1/web-chat/conversations/${identifier}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  function ingest(conversationId: string, turnId: string, runId: string, events: AgentEvent[]) {
    const envelopes: AgentEventEnvelope[] = events.map((event) => {
      sequence += 1;

      return {
        version: AGENT_EVENT_PROTOCOL_VERSION,
        conversationId,
        agentId: ctx.agentIdentifier,
        runId,
        turnId,
        sequence,
        timestamp: new Date().toISOString(),
        event,
      };
    });

    return ctx.session.testAgent.post('/v1/agents/events/ingest').send({ events: envelopes });
  }

  async function runFinishes(conversationId: string) {
    return activityRepository.find(
      {
        _environmentId: ctx.session.environment._id,
        _conversationId: conversationId,
        type: ConversationActivityTypeEnum.RUN_FINISH,
      },
      '*'
    );
  }

  async function activeTurnOf(conversationId: string) {
    return pollFor(() => turnAbortStore().getActiveTurn(conversationId));
  }

  it('stops the running turn: aborted finish on replay, late events dropped, onAbort sent, repeat is idempotent', async () => {
    const { identifier, conversation } = await startConversation();
    const conversationId = String(conversation._id);
    const activeTurn = await pollFor(async () => {
      const turn = await turnAbortStore().getActiveTurn(conversationId);

      return turn?.bridgeHandlesOnAbort ? turn : null;
    });
    expect(activeTurn.turnId.startsWith(`${conversationId}:`)).to.equal(true);
    expect(activeTurn.platformMessageId).to.be.a('string');

    const startRes = await ingest(conversationId, activeTurn.turnId, 'run_e2e_1', [{ type: 'run-start' }]);
    expect(startRes.status).to.equal(200);
    expect(startRes.body.data?.abortTurn).to.equal(undefined);

    const cancelRes = await cancel(identifier, subscriberToken, { agentId: ctx.agentIdentifier });
    expect(cancelRes.status).to.equal(200);
    expect(cancelRes.body.data).to.deep.equal({ status: 'aborted' });

    const finishes = await runFinishes(conversationId);
    expect(finishes).to.have.length(1);
    expect(finishes[0].identifier).to.equal('run_run_e2e_1_finish');
    expect((finishes[0].richContent as { lifecycle: { outcome: string } }).lifecycle.outcome).to.equal('aborted');

    const eventsRes = await ctx.session.testAgent
      .get(`/v1/web-chat/conversations/${identifier}/events`)
      .set('Authorization', `Bearer ${subscriberToken}`);
    expect(eventsRes.status).to.equal(200);
    const replayedFinish = eventsRes.body.data.events.find(
      (envelope: AgentEventEnvelope) => envelope.event.type === 'run-finish'
    );
    expect(replayedFinish?.event).to.include({ type: 'run-finish', outcome: 'aborted' });

    // The bridge's late batch for the stopped turn is dropped and answered with the abort flag.
    const lateRes = await ingest(conversationId, activeTurn.turnId, 'run_e2e_1', [
      { type: 'message', role: 'assistant', messageId: 'late-msg', content: { markdown: 'too late' } },
      { type: 'run-finish', outcome: 'completed' },
    ]);
    expect(lateRes.status).to.equal(200);
    expect(lateRes.body.data).to.deep.equal({ abortTurn: true });
    expect(
      await activityRepository.findOne(
        { _environmentId: ctx.session.environment._id, _conversationId: conversationId, identifier: 'late-msg' },
        '*'
      )
    ).to.equal(null);

    // A `completed` for the same run that slips past ingest (another turn id) dedupes against the aborted finish.
    await ingest(conversationId, 'unrelated-turn', 'run_e2e_1', [{ type: 'run-finish', outcome: 'completed' }]);
    const afterLate = await runFinishes(conversationId);
    expect(afterLate).to.have.length(1);
    expect((afterLate[0].richContent as { lifecycle: { outcome: string } }).lifecycle.outcome).to.equal('aborted');

    const onAbort = await pollFor(async () =>
      executeSpy.getCalls().find((call) => call.args[0].event === AgentEventEnum.ON_ABORT)
    );
    expect(onAbort.args[0].abortedTurn).to.deep.equal(activeTurn);

    const repeatRes = await cancel(identifier);
    expect(repeatRes.status).to.equal(200);
    expect(repeatRes.body.data).to.deep.equal({ status: 'aborted' });
    expect(await runFinishes(conversationId)).to.have.length(1);
    expect(executeSpy.getCalls().filter((call) => call.args[0].event === AgentEventEnum.ON_ABORT)).to.have.length(1);
  });

  it('stops the turn of a bridge on a framework that predates onAbort without sending it onAbort', async () => {
    fireStub.resolves({ headers: {}, body: { resume: () => undefined } });
    const { identifier, conversation } = await startConversation();
    const conversationId = String(conversation._id);
    const activeTurn = await activeTurnOf(conversationId);

    const cancelRes = await cancel(identifier);

    expect(cancelRes.body.data).to.deep.equal({ status: 'aborted' });
    expect(activeTurn.bridgeHandlesOnAbort).to.equal(undefined);
    expect(await turnAbortStore().isAborted(activeTurn.turnId)).to.equal(true);
    expect(await runFinishes(conversationId)).to.have.length(1);
    expect(executeSpy.getCalls().some((call) => call.args[0].event === AgentEventEnum.ON_ABORT)).to.equal(false);
  });

  it('gives a turn stopped before its run started an aborted finish, and drops its run-start', async () => {
    const { identifier, conversation } = await startConversation();
    const conversationId = String(conversation._id);
    const activeTurn = await activeTurnOf(conversationId);

    const cancelRes = await cancel(identifier);
    expect(cancelRes.body.data).to.deep.equal({ status: 'aborted' });

    const lateStart = await ingest(conversationId, activeTurn.turnId, 'run_e2e_2', [{ type: 'run-start' }]);
    expect(lateStart.body.data).to.deep.equal({ abortTurn: true });

    const finishes = await runFinishes(conversationId);
    expect(finishes).to.have.length(1);
    expect(finishes[0].identifier).to.equal(`run_stopped_${activeTurn.turnId}_finish`);
    expect(
      await activityRepository.findOne(
        {
          _environmentId: ctx.session.environment._id,
          _conversationId: conversationId,
          type: ConversationActivityTypeEnum.RUN_START,
        },
        '*'
      )
    ).to.equal(null);
  });

  it('leaves an earlier run still open alone when a later turn is stopped before its run started', async () => {
    const { identifier, conversation } = await startConversation();
    const conversationId = String(conversation._id);
    const firstTurn = await activeTurnOf(conversationId);
    await ingest(conversationId, firstTurn.turnId, 'run_e2e_6', [{ type: 'run-start' }]);

    const resumed = await ctx.session.testAgent
      .post('/v1/web-chat/conversations')
      .set('Authorization', `Bearer ${subscriberToken}`)
      .send({ agentId: ctx.agentIdentifier, text: 'Add an SMS step', conversationIdentifier: identifier });
    expect(resumed.status).to.equal(201);
    const secondTurn = await pollFor(async () => {
      const turn = await turnAbortStore().getActiveTurn(conversationId);

      return turn && turn.turnId !== firstTurn.turnId ? turn : null;
    });

    const cancelRes = await cancel(identifier);
    expect(cancelRes.body.data).to.deep.equal({ status: 'aborted' });

    const finishes = await runFinishes(conversationId);
    expect(finishes.map((finish) => finish.identifier)).to.deep.equal([`run_stopped_${secondTurn.turnId}_finish`]);
  });

  it('closes a run whose start was being stored when the Stop landed', async () => {
    const { identifier, conversation } = await startConversation();
    const conversationId = String(conversation._id);
    const activeTurn = await activeTurnOf(conversationId);

    // The Stop lands after the batch passed the abort check and before its run start is stored.
    const sink = testServer.getService(AgentEventSink);
    const ingestMany = sink.ingestMany.bind(sink);
    let stopped = false;
    sinon.stub(sink, 'ingestMany').callsFake(async (envelopes, context) => {
      if (!stopped) {
        stopped = true;
        expect((await cancel(identifier)).body.data).to.deep.equal({ status: 'aborted' });
      }

      return ingestMany(envelopes, context);
    });

    const startRes = await ingest(conversationId, activeTurn.turnId, 'run_e2e_5', [{ type: 'run-start' }]);
    expect(startRes.body.data).to.deep.equal({ abortTurn: true });

    const eventsRes = await ctx.session.testAgent
      .get(`/v1/web-chat/conversations/${identifier}/events`)
      .set('Authorization', `Bearer ${subscriberToken}`);
    const lifecycle = eventsRes.body.data.events
      .map((envelope: AgentEventEnvelope) => envelope.event)
      .filter((event: AgentEvent) => event.type === 'run-start' || event.type === 'run-finish');
    expect(lifecycle.at(-2)).to.deep.include({ type: 'run-start' });
    expect(lifecycle.at(-1)).to.deep.include({ type: 'run-finish', outcome: 'aborted' });
  });

  it('keeps a running turn stoppable while it posts events', async () => {
    const { conversation } = await startConversation();
    const conversationId = String(conversation._id);
    const activeTurn = await activeTurnOf(conversationId);
    const redis = testServer.getService(CacheService).client;
    const key = `agent:active-turn:${conversationId}`;
    await redis.expire(key, 5);

    await ingest(conversationId, activeTurn.turnId, 'run_e2e_4', [{ type: 'run-start' }]);

    expect(await redis.ttl(key)).to.be.greaterThan(60);
  });

  it('returns idle once the turn finished on its own', async () => {
    const { identifier, conversation } = await startConversation();
    const conversationId = String(conversation._id);
    const activeTurn = await activeTurnOf(conversationId);

    await ingest(conversationId, activeTurn.turnId, 'run_e2e_3', [
      { type: 'run-start' },
      { type: 'run-finish', outcome: 'completed' },
    ]);

    const cancelRes = await cancel(identifier);
    expect(cancelRes.status).to.equal(200);
    expect(cancelRes.body.data).to.deep.equal({ status: 'idle' });
  });

  it("returns 404 for another subscriber's conversation and leaves its turn running", async () => {
    const { identifier, conversation } = await startConversation();
    const activeTurn = await activeTurnOf(String(conversation._id));
    const otherSession = await ctx.session.testAgent.post('/v1/inbox/session').send({
      applicationIdentifier: ctx.session.environment.identifier,
      subscriberId: `other-sub-${Date.now()}`,
    });

    const cancelRes = await cancel(identifier, otherSession.body.data.token);

    expect(cancelRes.status).to.equal(404);
    expect(await turnAbortStore().isAborted(activeTurn.turnId)).to.equal(false);
  });

  it('returns 404 when the client names another agent', async () => {
    const { identifier } = await startConversation();

    const cancelRes = await cancel(identifier, subscriberToken, { agentId: 'some-other-agent' });

    expect(cancelRes.status).to.equal(404);
  });
});
