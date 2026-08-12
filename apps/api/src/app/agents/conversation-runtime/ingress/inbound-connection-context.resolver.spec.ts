import { expect } from 'chai';
import sinon from 'sinon';
import { ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { InboundConnectionContextResolver } from './inbound-connection-context.resolver';

interface FakeContext {
  type: string;
  id: string;
  key: string;
  data: Record<string, unknown>;
  bridgeUrl?: string;
}

function makeLogger() {
  return {
    warn: sinon.stub(),
    error: sinon.stub(),
    debug: sinon.stub(),
    info: sinon.stub(),
    setContext: sinon.stub(),
  };
}

function makeConfig(platform: AgentPlatformEnum): ResolvedAgentConfig {
  return {
    platform,
    environmentId: 'env-1',
    organizationId: 'org-1',
    integrationIdentifier: 'integration-1',
  } as unknown as ResolvedAgentConfig;
}

function makeContext(type: string, id: string, bridgeUrl?: string, data: Record<string, unknown> = {}): FakeContext {
  return { type, id, key: `${type}:${id}`, data, bridgeUrl };
}

/**
 * `findByKeys` is called once per scope with the keys stored on that scope's connection/endpoint,
 * so route each call to the matching contexts by key.
 */
function makeContextRepository(contexts: FakeContext[]) {
  const byKey = new Map(contexts.map((context) => [context.key, context]));

  return {
    findByKeys: sinon.stub().callsFake(async (_env: string, _org: string, keys: string[]) =>
      keys.map((key) => byKey.get(key)).filter((context): context is FakeContext => !!context)
    ),
  };
}

describe('InboundConnectionContextResolver', () => {
  describe('endpoint scope (Telegram)', () => {
    function build(endpointContextKeys: string[], contexts: FakeContext[]) {
      const channelConnectionRepository = { findOne: sinon.stub().resolves(null) };
      const channelEndpointRepository = {
        findByPlatformIdentity: sinon.stub().resolves({ contextKeys: endpointContextKeys }),
      };
      const contextRepository = makeContextRepository(contexts);
      const logger = makeLogger();

      const resolver = new InboundConnectionContextResolver(
        channelConnectionRepository as any,
        channelEndpointRepository as any,
        contextRepository as any,
        logger as any
      );

      return { resolver, logger };
    }

    it('returns the bridge URL override from a resolved context', async () => {
      const { resolver } = build(['tenant:acme'], [makeContext('tenant', 'acme', 'https://acme.example.com/api/novu')]);

      const result = await resolver.resolve(makeConfig(AgentPlatformEnum.TELEGRAM), {}, 'chat-1');

      expect(result.context).to.deep.equal({ tenant: 'acme' });
      expect(result.bridgeUrl).to.equal('https://acme.example.com/api/novu');
    });

    it('leaves the override undefined when no resolved context sets one', async () => {
      const { resolver } = build(['tenant:acme'], [makeContext('tenant', 'acme')]);

      const result = await resolver.resolve(makeConfig(AgentPlatformEnum.TELEGRAM), {}, 'chat-1');

      expect(result.context).to.deep.equal({ tenant: 'acme' });
      expect(result.bridgeUrl).to.equal(undefined);
    });

    it('picks the first override by sorted key and warns when contexts disagree', async () => {
      const { resolver, logger } = build(
        ['tenant:acme', 'app:billing'],
        [
          makeContext('tenant', 'acme', 'https://acme.example.com/api/novu'),
          makeContext('app', 'billing', 'https://billing.example.com/api/novu'),
        ]
      );

      const result = await resolver.resolve(makeConfig(AgentPlatformEnum.TELEGRAM), {}, 'chat-1');

      // Sorted by key, `app:billing` < `tenant:acme`, so the app override wins.
      expect(result.bridgeUrl).to.equal('https://billing.example.com/api/novu');
      expect(logger.warn.calledOnce, 'warns on conflicting overrides').to.equal(true);
    });

    it('does not warn when multiple contexts share the same override', async () => {
      const { resolver, logger } = build(
        ['tenant:acme', 'app:billing'],
        [
          makeContext('tenant', 'acme', 'https://shared.example.com/api/novu'),
          makeContext('app', 'billing', 'https://shared.example.com/api/novu'),
        ]
      );

      const result = await resolver.resolve(makeConfig(AgentPlatformEnum.TELEGRAM), {}, 'chat-1');

      expect(result.bridgeUrl).to.equal('https://shared.example.com/api/novu');
      expect(logger.warn.called).to.equal(false);
    });
  });

  describe('workspace scope (Slack)', () => {
    it('lets the per-user endpoint override win over the workspace override', async () => {
      const channelConnectionRepository = {
        findOne: sinon.stub().resolves({ identifier: 'conn-1', contextKeys: ['tenant:workspace'] }),
      };
      const channelEndpointRepository = {
        findByPlatformIdentity: sinon.stub().resolves({ contextKeys: ['tenant:user'] }),
      };
      const contextRepository = makeContextRepository([
        makeContext('tenant', 'workspace', 'https://workspace.example.com/api/novu'),
        makeContext('tenant', 'user', 'https://user.example.com/api/novu'),
      ]);
      const logger = makeLogger();

      const resolver = new InboundConnectionContextResolver(
        channelConnectionRepository as any,
        channelEndpointRepository as any,
        contextRepository as any,
        logger as any
      );

      const result = await resolver.resolve(makeConfig(AgentPlatformEnum.SLACK), { team_id: 'W1' }, 'U1');

      expect(result.bridgeUrl).to.equal('https://user.example.com/api/novu');
    });

    it('falls back to the workspace override when the endpoint has none', async () => {
      const channelConnectionRepository = {
        findOne: sinon.stub().resolves({ identifier: 'conn-1', contextKeys: ['tenant:workspace'] }),
      };
      const channelEndpointRepository = {
        findByPlatformIdentity: sinon.stub().resolves(null),
      };
      const contextRepository = makeContextRepository([
        makeContext('tenant', 'workspace', 'https://workspace.example.com/api/novu'),
      ]);
      const logger = makeLogger();

      const resolver = new InboundConnectionContextResolver(
        channelConnectionRepository as any,
        channelEndpointRepository as any,
        contextRepository as any,
        logger as any
      );

      const result = await resolver.resolve(makeConfig(AgentPlatformEnum.SLACK), { team_id: 'W1' }, 'U1');

      expect(result.bridgeUrl).to.equal('https://workspace.example.com/api/novu');
    });
  });
});
