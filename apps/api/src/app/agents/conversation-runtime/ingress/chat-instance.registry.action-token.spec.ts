import { expect } from 'chai';
import sinon from 'sinon';
import { AGENT_ACTION_TOKEN_PREFIX } from '../action-token/agent-action-token.service';
import { ChatInstanceRegistry } from './chat-instance.registry';

describe('ChatInstanceRegistry action token resolution', () => {
  const config = {
    environmentId: 'env1',
    organizationId: 'org1',
    platform: 'telegram',
    integrationIdentifier: 'telegram-main',
    integrationId: 'integration1',
    agentIdentifier: 'support-agent',
    acknowledgeOnReceived: false,
  } as const;

  function makeRegistry(actionTokenOverrides: {
    isActionToken?: sinon.SinonStub;
    resolveActionToken?: sinon.SinonStub;
  } = {}) {
    const agentActionTokenService = {
      isActionToken: actionTokenOverrides.isActionToken ?? sinon.stub().returns(false),
      resolveActionToken: actionTokenOverrides.resolveActionToken ?? sinon.stub().resolves(null),
    };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
    };

    const registry = new ChatInstanceRegistry(
      logger as any,
      {} as any,
      {} as any,
      {} as any,
      agentActionTokenService as any,
      {} as any
    );

    return { registry, agentActionTokenService, logger };
  }

  it('passes through raw action ids unchanged', async () => {
    const { registry, agentActionTokenService } = makeRegistry({
      isActionToken: sinon.stub().returns(false),
    });

    const resolved = await (registry as any).resolveInboundAction('agent1', config, 'custom:action', 'label-value');

    expect(resolved).to.deep.equal({ id: 'custom:action', value: 'label-value' });
    expect(agentActionTokenService.resolveActionToken.called).to.equal(false);
  });

  it('resolves at:-prefixed tokens to real id and value', async () => {
    const token = `${AGENT_ACTION_TOKEN_PREFIX}abc123`;
    const { registry, agentActionTokenService } = makeRegistry({
      isActionToken: sinon.stub().returns(true),
      resolveActionToken: sinon.stub().resolves({ id: 'mcp-approval:approve:tool1:turn1', value: 'tool label' }),
    });

    const resolved = await (registry as any).resolveInboundAction('agent1', config, token, undefined);

    expect(resolved).to.deep.equal({ id: 'mcp-approval:approve:tool1:turn1', value: 'tool label' });
    expect(agentActionTokenService.resolveActionToken.calledOnceWith(token, {
      agentId: 'agent1',
      integrationIdentifier: config.integrationIdentifier,
    })).to.equal(true);
  });

  it('returns null and does not dispatch when token resolution fails', async () => {
    const token = `${AGENT_ACTION_TOKEN_PREFIX}expired`;
    const { registry, logger } = makeRegistry({
      isActionToken: sinon.stub().returns(true),
      resolveActionToken: sinon.stub().resolves(null),
    });

    const resolved = await (registry as any).resolveInboundAction('agent1', config, token, undefined);

    expect(resolved).to.equal(null);
    expect(logger.warn.calledOnce).to.equal(true);
  });
});
