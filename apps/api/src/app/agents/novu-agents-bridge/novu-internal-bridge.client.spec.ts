import { buildNovuSignatureHeader } from '@novu/application-generic';
import { agent } from '@novu/framework';
import { AgentEventEnum, HttpHeaderKeysEnum } from '@novu/framework/internal';
import { Client, NovuHandler, type ServeHandlerOptions } from '@novu/framework/nest';
import { expect } from 'chai';
import type { Request, Response } from 'express';
import sinon from 'sinon';
import type { NovuAgentsBridgeService } from './novu-agents-bridge.service';
import { NovuInternalBridgeClient } from './novu-internal-bridge.client';

const SECRET_KEY = 'internal-bridge-secret';

function buildTurnBody() {
  const now = new Date().toISOString();

  return {
    version: 1,
    timestamp: now,
    deliveryId: 'conv-1:onMessage:msg-1',
    event: 'onMessage',
    agentId: 'novu-copilot',
    replyUrl: '',
    eventsUrl: 'https://attacker.example/events',
    conversationId: 'conv-1',
    integrationIdentifier: 'novu-web-chat',
    action: null,
    message: { text: 'hi', platformMessageId: 'msg-1', author: { userId: 'u1' }, timestamp: now },
    reaction: null,
    conversation: { identifier: 'conv-1', status: 'active', metadata: {} },
    subscriber: null,
    context: { tenant: { id: '6650f0c2a1b2c3d4e5f60801', data: { environmentId: '6650f0c2a1b2c3d4e5f60802' } } },
    history: [],
    platform: 'web_chat',
    platformContext: { threadId: 'web_chat:conv-1', channelId: '', isDM: false },
  };
}

function buildRequest({
  method,
  query,
  body,
  signature,
}: {
  method: 'GET' | 'POST';
  query: Record<string, string>;
  body?: unknown;
  signature?: string;
}): Request {
  const search = new URLSearchParams(query).toString();

  return {
    method,
    protocol: 'http',
    originalUrl: `/v1/bridge/novu?${search}`,
    query,
    headers: { host: 'localhost:3000', ...(signature ? { 'novu-signature': signature } : {}) },
    body,
  } as unknown as Request;
}

function buildResponse() {
  const res = {
    setHeader: sinon.stub(),
    status: sinon.stub(),
    send: sinon.stub(),
  };
  res.status.returns(res);

  return res;
}

const agentEventQuery = { action: 'agent-event', agentId: 'novu-copilot', event: 'onMessage' };

function flushBackgroundTurn(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 20);
  });
}

describe('NovuInternalBridgeClient', () => {
  let onMessage: sinon.SinonStub;
  let fetchStub: sinon.SinonStub;
  let client: NovuInternalBridgeClient;

  beforeEach(() => {
    onMessage = sinon.stub().resolves(undefined);
    fetchStub = sinon.stub(globalThis, 'fetch').resolves(new Response('{}', { status: 200 }));
    const agentsBridge = {
      getAgents: () => [agent('novu-copilot', { onMessage })],
    } as unknown as NovuAgentsBridgeService;
    const serveOptions = {
      client: new Client({ secretKey: SECRET_KEY, strictAuthentication: false, verbose: false }),
      workflows: [],
    } as unknown as ServeHandlerOptions;

    client = new NovuInternalBridgeClient(serveOptions, new NovuHandler(), agentsBridge);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('refuses an unsigned agent turn even when the workflows are served without signatures', async () => {
    const res = buildResponse();

    await client.handleRequest(
      buildRequest({ method: 'POST', query: agentEventQuery, body: buildTurnBody() }),
      res as unknown as Response
    );
    await flushBackgroundTurn();

    const postedSecretKeyToRequestUrl = fetchStub.calledWith(
      'https://attacker.example/events',
      sinon.match({ headers: sinon.match({ Authorization: `ApiKey ${SECRET_KEY}` }) })
    );
    expect(postedSecretKeyToRequestUrl).to.equal(false);
    expect(onMessage.called).to.equal(false);
    expect(res.status.firstCall.args[0]).to.equal(401);
  });

  it('refuses an agent turn signed with another key', async () => {
    const body = buildTurnBody();
    const res = buildResponse();

    await client.handleRequest(
      buildRequest({
        method: 'POST',
        query: agentEventQuery,
        body,
        signature: buildNovuSignatureHeader('another-environment-key', body),
      }),
      res as unknown as Response
    );
    await flushBackgroundTurn();

    expect(res.status.firstCall.args[0]).to.equal(401);
    expect(onMessage.called).to.equal(false);
  });

  it('runs a signed agent turn', async () => {
    const body = buildTurnBody();
    const res = buildResponse();

    await client.handleRequest(
      buildRequest({
        method: 'POST',
        query: agentEventQuery,
        body,
        signature: buildNovuSignatureHeader(SECRET_KEY, body),
      }),
      res as unknown as Response
    );
    await flushBackgroundTurn();

    expect(res.status.firstCall.args[0]).to.equal(200);
    expect(onMessage.calledOnce).to.equal(true);
  });

  it("answers an agent turn listing onAbort, so a Stop of Novu's own agents still sends them onAbort", async () => {
    const body = buildTurnBody();
    const res = buildResponse();

    await client.handleRequest(
      buildRequest({
        method: 'POST',
        query: agentEventQuery,
        body,
        signature: buildNovuSignatureHeader(SECRET_KEY, body),
      }),
      res as unknown as Response
    );
    await flushBackgroundTurn();

    const handledEvents = res.setHeader
      .getCalls()
      .find((call) => call.args[0] === HttpHeaderKeysEnum.NOVU_FRAMEWORK_AGENT_EVENTS)?.args[1];
    expect(String(handledEvents).split(',')).to.include(AgentEventEnum.ON_ABORT);
  });

  it('keeps serving workflow actions with the bridge client strictness', async () => {
    const res = buildResponse();

    await client.handleRequest(
      buildRequest({ method: 'GET', query: { action: 'discover' } }),
      res as unknown as Response
    );

    expect(res.status.firstCall.args[0]).to.equal(200);
  });

  it('lists the agents in discovery, so novu sync points their bridge URL at this bridge', async () => {
    const res = buildResponse();

    await client.handleRequest(
      buildRequest({ method: 'GET', query: { action: 'discover' } }),
      res as unknown as Response
    );

    expect(res.status.firstCall.args[0]).to.equal(200);
    const sent = res.send.firstCall.args[0];
    const discovered = typeof sent === 'string' ? JSON.parse(sent) : sent;
    expect(discovered.agents).to.deep.equal([{ agentId: 'novu-copilot' }]);
  });

  it('refuses an unsigned discovery when the workflows require signatures', async () => {
    const strictClient = new NovuInternalBridgeClient(
      {
        client: new Client({ secretKey: SECRET_KEY, strictAuthentication: true, verbose: false }),
        workflows: [],
      } as unknown as ServeHandlerOptions,
      new NovuHandler(),
      { getAgents: () => [agent('novu-copilot', { onMessage })] } as unknown as NovuAgentsBridgeService
    );
    const res = buildResponse();

    await strictClient.handleRequest(
      buildRequest({ method: 'GET', query: { action: 'discover' } }),
      res as unknown as Response
    );

    expect(res.status.firstCall.args[0]).to.equal(401);
  });
});
