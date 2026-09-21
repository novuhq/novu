import { McpConnectionStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import { AgentPlatformEnum } from '../../../shared/enums/agent-platform.enum';
import { CompleteProviderManagedRedirect } from './complete-provider-managed-redirect.usecase';
import { type ProviderManagedRedirectState, signProviderManagedRedirectState } from './provider-managed-redirect-state';

const API_KEY = 'test-api-key';

const BASE_PAYLOAD: ProviderManagedRedirectState = {
  connectionId: 'conn_1',
  agentId: 'agent_mongo_1',
  agentMcpServerId: 'ams_1',
  subscriberId: 'sub_mongo_1',
  environmentId: 'env_1',
  organizationId: 'org_1',
  mcpId: 'slack',
  externalVaultId: 'vlt_1',
  conversationId: 'conversation_1',
  toolUseId: 'tool_use_1',
  agentIdentifier: 'my-agent',
  integrationIdentifier: 'integration-identifier',
  platform: AgentPlatformEnum.SLACK,
  platformThreadId: 'slack:thread_1',
  timestamp: Date.now(),
};

function makeLogger() {
  return {
    setContext: sinon.stub(),
    warn: sinon.stub(),
    error: sinon.stub(),
    info: sinon.stub(),
    debug: sinon.stub(),
  };
}

// Let the fire-and-forget post-redirect side effects (kicked off via `void`)
// settle so assertions on the stubs are deterministic.
async function flush(times = 6): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
  }
}

function makeDeps(oauthState: Record<string, unknown>) {
  const mcpConnectionRepository = {
    findOne: sinon.stub().resolves({ _id: 'conn_1', oauthState }),
    update: sinon.stub().resolves({ matched: 1, modified: 1 }),
  };
  const environmentRepository = {
    findOne: sinon.stub().resolves({ apiKeys: [{ key: API_KEY }] }),
  };
  const managedAgentService = { sendToolResult: sinon.stub().resolves(undefined) };
  const outboundGateway = {
    editInConversation: sinon.stub().resolves({ messageId: 'msg_123', platformThreadId: 'slack:thread_1' }),
  };
  const logger = makeLogger();

  const usecase = new CompleteProviderManagedRedirect(
    mcpConnectionRepository as never,
    environmentRepository as never,
    managedAgentService as never,
    outboundGateway as never,
    logger as never
  );

  return { usecase, mcpConnectionRepository, managedAgentService, outboundGateway };
}

describe('CompleteProviderManagedRedirect', () => {
  it('edits the card to a finalizing note (not delete/success) and does not claim connected', async () => {
    const { usecase, mcpConnectionRepository, managedAgentService, outboundGateway } = makeDeps({
      connectCardMessageId: 'msg_123',
      connectCardThreadId: 'slack:thread_1',
      connectCardPlatform: AgentPlatformEnum.SLACK,
    });

    const state = signProviderManagedRedirectState(BASE_PAYLOAD, API_KEY);
    const result = await usecase.execute(state);
    await flush();

    expect(result.redirectUrl).to.be.a('string');

    // Card is edited in place, not deleted.
    expect(outboundGateway.editInConversation.calledOnce).to.equal(true);
    const editArgs = outboundGateway.editInConversation.firstCall.args;
    expect(editArgs[0]).to.equal('agent_mongo_1');
    expect(editArgs[1]).to.equal('integration-identifier');
    expect(editArgs[2]).to.equal(AgentPlatformEnum.SLACK);
    expect(editArgs[3]).to.equal('slack:thread_1');
    expect(editArgs[4]).to.equal('msg_123');
    expect((editArgs[5] as { markdown?: string }).markdown).to.match(/Finalizing/i);

    // Row still promoted so the server is offered on the next turn.
    const update = mcpConnectionRepository.update.firstCall.args[1] as { $set: { status: string } };
    expect(update.$set.status).to.equal(McpConnectionStatusEnum.Connected);

    // Tool result resolves the parked call but does NOT announce success.
    const toolResult = managedAgentService.sendToolResult.firstCall.args[0] as {
      content: string;
      followUpMessage: string;
    };
    expect(toolResult.content).to.not.match(/connected/i);
    expect(toolResult.followUpMessage).to.match(/do not tell the user it is already connected/i);
  });

  it('skips the card edit when no connect-card id was stored but still resumes the session', async () => {
    const { usecase, outboundGateway, managedAgentService } = makeDeps({});

    const state = signProviderManagedRedirectState(BASE_PAYLOAD, API_KEY);
    await usecase.execute(state);
    await flush();

    expect(outboundGateway.editInConversation.called).to.equal(false);
    expect(managedAgentService.sendToolResult.calledOnce).to.equal(true);
  });

  it('does not edit a channel card for web chat (pending activity already reflects state)', async () => {
    const { usecase, outboundGateway, managedAgentService } = makeDeps({
      connectCardMessageId: 'msg_123',
      connectCardThreadId: 'thread_1',
    });

    const state = signProviderManagedRedirectState({ ...BASE_PAYLOAD, platform: AgentPlatformEnum.WEB_CHAT }, API_KEY);
    await usecase.execute(state);
    await flush();

    expect(outboundGateway.editInConversation.called).to.equal(false);
    expect(managedAgentService.sendToolResult.calledOnce).to.equal(true);
  });
});
