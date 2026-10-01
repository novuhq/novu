import type { AgentEvent } from '@novu/agent-event-protocol';
import { McpConnectionStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import type { AgentEventContext } from './agent-event-sink.service';
import { McpConnectionErrorHandler } from './mcp-connection-error.handler';

function makeLogger() {
  return {
    setContext: sinon.stub(),
    warn: sinon.stub(),
    error: sinon.stub(),
    info: sinon.stub(),
    debug: sinon.stub(),
  };
}

const CONTEXT: AgentEventContext = {
  userId: 'org_1',
  environmentId: 'env_1',
  organizationId: 'org_1',
  conversationId: 'conversation_1',
  agentIdentifier: 'my-agent',
  integrationIdentifier: 'integration-identifier',
  source: 'managed',
  agentId: 'agent_mongo_1',
  subscriberId: 'subscriber_ext_1',
  sessionId: 'session_1',
};

function authFailureEvent(): Extract<AgentEvent, { type: 'connection.error' }> {
  return {
    type: 'connection.error',
    source: 'mcp',
    serverName: 'Slack',
    reason: 'authentication',
    message: 'no credential is stored for this server URL',
  };
}

function makeDeps(options: { connectionStatus: McpConnectionStatusEnum; updateMatched: number }) {
  const subscriberRepository = {
    findBySubscriberId: sinon.stub().resolves({ _id: 'sub_mongo_1' }),
  };
  const agentMcpServerRepository = {
    findOAuthEnablementsForAgent: sinon.stub().resolves([{ _id: 'ams_1', mcpId: 'slack' }]),
  };
  const mcpConnectionRepository = {
    findSubscriberConnectionsForAgent: sinon
      .stub()
      .resolves([{ _agentMcpServerId: 'ams_1', mcpId: 'slack', status: options.connectionStatus }]),
    update: sinon.stub().resolves({ matched: options.updateMatched, modified: options.updateMatched }),
  };
  const handleAgentReply = { execute: sinon.stub().resolves(undefined) };
  const logger = makeLogger();

  const handler = new McpConnectionErrorHandler(
    subscriberRepository as never,
    agentMcpServerRepository as never,
    mcpConnectionRepository as never,
    handleAgentReply as never,
    logger as never
  );

  return { handler, mcpConnectionRepository, handleAgentReply };
}

describe('McpConnectionErrorHandler', () => {
  it('flips connected → error and notifies the user on an auth failure', async () => {
    const { handler, mcpConnectionRepository, handleAgentReply } = makeDeps({
      connectionStatus: McpConnectionStatusEnum.Connected,
      updateMatched: 1,
    });

    await handler.handle(authFailureEvent(), CONTEXT);

    const update = mcpConnectionRepository.update.firstCall.args[1] as { $set: { status: string } };
    expect(update.$set.status).to.equal(McpConnectionStatusEnum.Error);

    expect(handleAgentReply.execute.calledOnce).to.equal(true);
    const reply = handleAgentReply.execute.firstCall.args[0] as { reply: { markdown: string } };
    expect(reply.reply.markdown).to.match(/Slack/);
    expect(reply.reply.markdown).to.match(/connect .*again/i);
  });

  it('does not notify when the transition did not occur (already error / raced)', async () => {
    const { handler, handleAgentReply } = makeDeps({
      connectionStatus: McpConnectionStatusEnum.Connected,
      updateMatched: 0,
    });

    await handler.handle(authFailureEvent(), CONTEXT);

    expect(handleAgentReply.execute.called).to.equal(false);
  });

  it('ignores non-authentication failures (no status change, no notification)', async () => {
    const { handler, mcpConnectionRepository, handleAgentReply } = makeDeps({
      connectionStatus: McpConnectionStatusEnum.Connected,
      updateMatched: 1,
    });

    await handler.handle(
      { type: 'connection.error', source: 'mcp', serverName: 'Slack', reason: 'timeout', message: 'slow' },
      CONTEXT
    );

    expect(mcpConnectionRepository.update.called).to.equal(false);
    expect(handleAgentReply.execute.called).to.equal(false);
  });
});
