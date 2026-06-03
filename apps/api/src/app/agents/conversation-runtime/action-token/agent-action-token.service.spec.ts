import { expect } from 'chai';
import sinon from 'sinon';
import {
  AGENT_ACTION_TOKEN_PREFIX,
  AgentActionTokenService,
} from './agent-action-token.service';
import { encodedTelegramCallbackDataByteLength } from './card-callback-button.walker';

describe('AgentActionTokenService', () => {
  const claimsBase = {
    agentId: 'agent1',
    integrationIdentifier: 'slack-main',
    environmentId: 'env1',
    organizationId: 'org1',
  };

  const binding = { ...claimsBase };

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
    expect(encodedTelegramCallbackDataByteLength(token)).to.be.at.most(64);
    expect(cacheService.set.calledOnce).to.equal(true);
  });

  it('resolves a minted token to the original id and value', async () => {
    const { service } = makeService();

    const token = await service.mintActionToken({
      ...claimsBase,
      id: 'custom-action:do-thing',
      value: 'payload',
    });

    const resolved = await service.resolveActionToken(token, binding);

    expect(resolved).to.deep.equal({ id: 'custom-action:do-thing', value: 'payload' });
  });

  it('returns null for non-prefixed action ids from resolveActionToken', async () => {
    const { service } = makeService();

    const resolved = await service.resolveActionToken('mcp-approval:approve:abc', binding);

    expect(resolved).to.equal(null);
  });

  it('returns null when token is missing from cache', async () => {
    const { service } = makeService();

    const resolved = await service.resolveActionToken(`${AGENT_ACTION_TOKEN_PREFIX}missing`, binding);

    expect(resolved).to.equal(null);
  });

  it('returns null on full binding mismatch including environment and organization', async () => {
    const { service } = makeService();

    const token = await service.mintActionToken({
      ...claimsBase,
      id: 'action-1',
    });

    const wrongEnv = await service.resolveActionToken(token, { ...binding, environmentId: 'other-env' });
    const wrongOrg = await service.resolveActionToken(token, { ...binding, organizationId: 'other-org' });

    expect(wrongEnv).to.equal(null);
    expect(wrongOrg).to.equal(null);
  });

  it('returns null when cache get fails', async () => {
    const { service } = makeService({
      get: sinon.stub().rejects(new Error('redis down')),
    });

    const token = await service.mintActionToken({
      ...claimsBase,
      id: 'action-1',
    });

    const resolved = await service.resolveActionToken(token, binding);

    expect(resolved).to.equal(null);
  });

  it('resolveForDispatch passes through raw action ids', async () => {
    const { service } = makeService();

    const resolved = await service.resolveForDispatch('custom:action', 'label', binding);

    expect(resolved).to.deep.equal({ id: 'custom:action', value: 'label' });
  });

  it('resolveForDispatch returns null when token resolution fails', async () => {
    const { service } = makeService();

    const resolved = await service.resolveForDispatch(`${AGENT_ACTION_TOKEN_PREFIX}gone`, undefined, binding);

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

    const denyButton = tokenized.children[0].children[0] as { id: string; value?: string };
    const linkButton = tokenized.children[0].children[1] as { type: string; url: string };
    const nestedApprove = tokenized.children[1].children[0].children[0] as { id: string; value?: string };

    expect(denyButton.id.startsWith(AGENT_ACTION_TOKEN_PREFIX)).to.equal(true);
    expect(encodedTelegramCallbackDataByteLength(denyButton.id)).to.be.at.most(64);
    expect(denyButton.value).to.equal(undefined);
    expect(linkButton.url).to.equal('https://example.com');
    expect(nestedApprove.id.startsWith(AGENT_ACTION_TOKEN_PREFIX)).to.equal(true);
    expect(nestedApprove.value).to.equal(undefined);

    const resolvedDeny = await service.resolveActionToken(denyButton.id, binding);

    expect(resolvedDeny?.id).to.include('mcp-approval:deny');
    expect(resolvedDeny?.value).to.equal('GitHub -> get_me');
  });

  it('does not leave orphan redis keys when mint fails mid-card', async () => {
    let mintCount = 0;
    const { service, cacheService } = makeService({
      set: sinon.stub().callsFake(async (key: string, value: string) => {
        mintCount += 1;
        if (mintCount === 2) {
          throw new Error('redis down');
        }
      }),
    });

    const card = {
      type: 'card',
      children: [
        {
          type: 'actions',
          children: [
            { type: 'button', id: 'action-1', label: 'One' },
            { type: 'button', id: 'action-2', label: 'Two' },
          ],
        },
      ],
    };

    try {
      await service.tokenizeCardForDelivery(card, claimsBase);
      expect.fail('expected tokenize to throw');
    } catch (err) {
      expect((err as Error).message).to.equal('redis down');
    }

    expect(cacheService.set.callCount).to.equal(2);
  });

  it('reusable tokens resolve on repeated peek without deleting', async () => {
    const { service, cacheService } = makeService();

    const token = await service.mintActionToken({
      ...claimsBase,
      id: 'repeatable:refresh',
    });

    await service.resolveActionToken(token, binding);
    await service.resolveActionToken(token, binding);

    expect(cacheService.set.callCount).to.equal(1);
    expect(cacheService.get.callCount).to.equal(2);
  });
});
