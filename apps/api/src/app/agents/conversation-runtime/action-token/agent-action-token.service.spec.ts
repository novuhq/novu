import { expect } from 'chai';
import sinon from 'sinon';
import {
  AGENT_ACTION_TOKEN_PREFIX,
  AgentActionTokenService,
} from './agent-action-token.service';

describe('AgentActionTokenService', () => {
  const claimsBase = {
    agentId: 'agent1',
    integrationIdentifier: 'slack-main',
    environmentId: 'env1',
    organizationId: 'org1',
  };

  function makeService(cacheOverrides: { get?: sinon.SinonStub; set?: sinon.SinonStub } = {}) {
    const storage = new Map<string, string>();
    const cacheService = {
      get:
        cacheOverrides.get ??
        sinon.stub().callsFake(async (key: string) => {
          return storage.get(key) ?? null;
        }),
      set:
        cacheOverrides.set ??
        sinon.stub().callsFake(async (key: string, value: string) => {
          storage.set(key, value);
        }),
    };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
    };

    const service = new AgentActionTokenService(cacheService as any, logger as any);

    return { service, storage, cacheService, logger };
  }

  it('mints a token with at: prefix and stores claims in cache', async () => {
    const { service, cacheService } = makeService();

    const token = await service.mintActionToken({
      ...claimsBase,
      id: 'mcp-approval:approve:tool123:turn456',
      value: 'GitHub -> get_me',
    });

    expect(token.startsWith(AGENT_ACTION_TOKEN_PREFIX)).to.equal(true);
    expect(token.length).to.be.lessThan(30);
    expect(cacheService.set.calledOnce).to.equal(true);
  });

  it('resolves a minted token to the original id and value', async () => {
    const { service } = makeService();

    const token = await service.mintActionToken({
      ...claimsBase,
      id: 'custom-action:do-thing',
      value: 'payload',
    });

    const resolved = await service.resolveActionToken(token, {
      agentId: claimsBase.agentId,
      integrationIdentifier: claimsBase.integrationIdentifier,
    });

    expect(resolved).to.deep.equal({ id: 'custom-action:do-thing', value: 'payload' });
  });

  it('returns null for non-prefixed action ids', async () => {
    const { service } = makeService();

    const resolved = await service.resolveActionToken('mcp-approval:approve:abc', {
      agentId: claimsBase.agentId,
      integrationIdentifier: claimsBase.integrationIdentifier,
    });

    expect(resolved).to.equal(null);
  });

  it('returns null when token is missing from cache', async () => {
    const { service } = makeService();

    const resolved = await service.resolveActionToken(`${AGENT_ACTION_TOKEN_PREFIX}missing`, {
      agentId: claimsBase.agentId,
      integrationIdentifier: claimsBase.integrationIdentifier,
    });

    expect(resolved).to.equal(null);
  });

  it('returns null on agent or integration binding mismatch', async () => {
    const { service } = makeService();

    const token = await service.mintActionToken({
      ...claimsBase,
      id: 'action-1',
    });

    const wrongAgent = await service.resolveActionToken(token, {
      agentId: 'other-agent',
      integrationIdentifier: claimsBase.integrationIdentifier,
    });
    const wrongIntegration = await service.resolveActionToken(token, {
      agentId: claimsBase.agentId,
      integrationIdentifier: 'other-integration',
    });

    expect(wrongAgent).to.equal(null);
    expect(wrongIntegration).to.equal(null);
  });

  it('returns null when cache get fails', async () => {
    const { service } = makeService({
      get: sinon.stub().rejects(new Error('redis down')),
    });

    const token = await service.mintActionToken({
      ...claimsBase,
      id: 'action-1',
    });

    const resolved = await service.resolveActionToken(token, {
      agentId: claimsBase.agentId,
      integrationIdentifier: claimsBase.integrationIdentifier,
    });

    expect(resolved).to.equal(null);
  });

  it('tokenizes card buttons and folds value into claims without mutating the original', async () => {
    const { service } = makeService();

    const original = {
      type: 'card',
      title: 'Tool approval required',
      children: [
        {
          type: 'actions',
          children: [
            {
              type: 'button',
              id: 'mcp-approval:deny:sevt_01Xa5zpiCUkjKH8a6zShGUZj:550e8400-e29b-41d4-a716-446655440000',
              label: 'Deny',
              value: 'GitHub -> get_me',
            },
            {
              type: 'link-button',
              label: 'Docs',
              url: 'https://example.com',
            },
          ],
        },
        {
          type: 'section',
          children: [
            {
              type: 'actions',
              children: [
                {
                  type: 'button',
                  id: 'nested:approve:tool2:turn2',
                  label: 'Approve',
                  value: 'nested-value',
                },
              ],
            },
          ],
        },
      ],
    };

    const tokenized = await service.tokenizeCardForDelivery(original, claimsBase);

    expect(original.children[0].children[0].id).to.include('mcp-approval:deny');
    expect(original.children[0].children[0].value).to.equal('GitHub -> get_me');
    expect(original.children[0].children[1].type).to.equal('link-button');

    const denyButton = (tokenized.children as any[])[0].children[0];
    const linkButton = (tokenized.children as any[])[0].children[1];
    const nestedApprove = (tokenized.children as any[])[1].children[0].children[0];

    expect(denyButton.id.startsWith(AGENT_ACTION_TOKEN_PREFIX)).to.equal(true);
    expect(denyButton.value).to.equal(undefined);
    expect(linkButton.url).to.equal('https://example.com');
    expect(nestedApprove.id.startsWith(AGENT_ACTION_TOKEN_PREFIX)).to.equal(true);
    expect(nestedApprove.value).to.equal(undefined);

    const resolvedDeny = await service.resolveActionToken(denyButton.id, {
      agentId: claimsBase.agentId,
      integrationIdentifier: claimsBase.integrationIdentifier,
    });

    expect(resolvedDeny?.id).to.include('mcp-approval:deny');
    expect(resolvedDeny?.value).to.equal('GitHub -> get_me');
  });

  it('reusable tokens resolve on repeated peek without deleting', async () => {
    const { service, cacheService } = makeService();

    const token = await service.mintActionToken({
      ...claimsBase,
      id: 'repeatable:refresh',
    });

    await service.resolveActionToken(token, {
      agentId: claimsBase.agentId,
      integrationIdentifier: claimsBase.integrationIdentifier,
    });
    await service.resolveActionToken(token, {
      agentId: claimsBase.agentId,
      integrationIdentifier: claimsBase.integrationIdentifier,
    });

    expect(cacheService.set.callCount).to.equal(1);
    expect(cacheService.get.callCount).to.equal(2);
  });
});
