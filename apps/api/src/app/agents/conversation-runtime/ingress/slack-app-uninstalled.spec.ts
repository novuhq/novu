import { SLACK_AGENT_BOT_EVENTS } from '@novu/shared';
import { expect } from 'chai';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { attachSlackUninstallHandler, type SlackAppUninstallDeps } from './slack-app-uninstalled';

interface ConnectionRow {
  identifier: string;
  auth: { accessToken: string };
  workspace: { id: string };
  integrationIdentifier: string;
  _environmentId: string;
  _organizationId: string;
}

interface EndpointRow {
  connectionIdentifier: string;
  integrationIdentifier: string;
  type: string;
  _environmentId: string;
  _organizationId: string;
}

interface TenantQuery {
  _environmentId?: string;
  _organizationId?: string;
  integrationIdentifier?: string;
  _integrationId?: string;
  'workspace.id'?: string;
  connectionIdentifier?: { $in: string[] };
  type?: { $in: string[] };
}

describe('Slack app uninstall handler', () => {
  const token = 'xoxb-matching-workspace';
  const otherToken = 'xoxb-other-workspace';

  function seed() {
    const connections: ConnectionRow[] = [
      row('conn-match', token, 'T_MATCH', 'slack-main', 'env-1', 'org-1'),
      row('conn-other-workspace', otherToken, 'T_OTHER', 'slack-main', 'env-1', 'org-1'),
      row('conn-other-integration', token, 'T_MATCH', 'slack-other', 'env-1', 'org-1'),
      row('conn-other-env', token, 'T_MATCH', 'slack-main', 'env-2', 'org-1'),
      row('conn-other-org', token, 'T_MATCH', 'slack-main', 'env-1', 'org-2'),
    ];
    const endpoints: EndpointRow[] = [
      endpoint('conn-match', 'slack-main', 'slack_user', 'env-1', 'org-1'),
      endpoint('conn-match', 'slack-main', 'slack_channel', 'env-1', 'org-1'),
      endpoint('conn-match', 'slack-main', 'webhook', 'env-1', 'org-1'),
      endpoint('conn-other-workspace', 'slack-main', 'slack_user', 'env-1', 'org-1'),
      endpoint('conn-other-integration', 'slack-other', 'slack_user', 'env-1', 'org-1'),
      endpoint('conn-other-env', 'slack-main', 'slack_user', 'env-2', 'org-1'),
      endpoint('conn-other-org', 'slack-main', 'slack_channel', 'env-1', 'org-2'),
    ];
    const linkUpdates: Array<{ query: TenantQuery; update: { $set?: Record<string, unknown> } }> = [];
    const logs: Array<Record<string, unknown>> = [];

    const deps = {
      channelConnectionRepository: {
        find: async (query: TenantQuery) => connections.filter((item) => matchesConnection(item, query)),
        delete: async (query: TenantQuery) => {
          requireTenant(query);
          const matched = connections.filter((item) => matchesConnection(item, query));
          for (const item of matched) {
            const index = connections.indexOf(item);
            connections.splice(index, 1);
          }

          return { acknowledged: true, deletedCount: matched.length };
        },
        count: async (query: TenantQuery) => {
          requireTenant(query);

          return connections.filter((item) => matchesConnection(item, query)).length;
        },
      },
      channelEndpointRepository: {
        delete: async (query: TenantQuery) => {
          requireTenant(query);
          const matched = endpoints.filter((item) => matchesEndpoint(item, query));
          for (const item of matched) {
            const index = endpoints.indexOf(item);
            endpoints.splice(index, 1);
          }

          return { acknowledged: true, deletedCount: matched.length };
        },
      },
      agentIntegrationRepository: {
        update: async (query: TenantQuery, update: { $set?: Record<string, unknown> }) => {
          requireTenant(query);
          linkUpdates.push({ query, update });

          return { matched: 1, modified: 1 };
        },
      },
      logger: {
        info: (obj: Record<string, unknown>) => {
          logs.push(obj);
        },
      },
    } as unknown as SlackAppUninstallDeps;

    return { connections, endpoints, linkUpdates, logs, deps };
  }

  function dispatch(
    deps: SlackAppUninstallDeps,
    event: { adapterName: string; action: string; workspaceId: string },
    config?: { connectionAccessToken?: string; integrationIdentifier?: string; environmentId?: string }
  ) {
    const cached = {
      adapterFingerprint: 'fingerprint-before',
      config: {
        environmentId: config?.environmentId ?? 'env-1',
        organizationId: 'org-1',
        integrationIdentifier: config?.integrationIdentifier ?? 'slack-main',
        integrationId: 'integration-1',
        connectionAccessToken: config?.connectionAccessToken,
      },
    };
    let registered:
      | ((incoming: { adapter: { name: string }; action: string; conversationId: string }) => Promise<void>)
      | undefined;
    const errors: unknown[] = [];

    attachSlackUninstallHandler({
      platform: AgentPlatformEnum.SLACK,
      chat: {
        onUninstalled: (handler) => {
          registered = handler;
        },
      },
      cached,
      deps,
      onError: (err) => {
        errors.push(err);
      },
    });

    if (!registered) {
      throw new Error('Slack uninstall handler was not registered');
    }

    return {
      cached,
      errors,
      run: () =>
        registered?.({
          adapter: { name: event.adapterName },
          action: event.action,
          conversationId: event.workspaceId,
        }),
    };
  }

  it('includes app_uninstalled in the Slack agent manifest events', () => {
    expect(SLACK_AGENT_BOT_EVENTS).to.include('app_uninstalled');
  });

  it('does not register an uninstall handler for other platforms', () => {
    let registered = false;

    attachSlackUninstallHandler({
      platform: AgentPlatformEnum.TEAMS,
      chat: {
        onUninstalled: () => {
          registered = true;
        },
      },
      cached: {
        adapterFingerprint: 'fingerprint',
        config: {
          environmentId: 'env-1',
          organizationId: 'org-1',
          integrationIdentifier: 'slack-main',
          integrationId: 'integration-1',
        },
      },
      deps: seed().deps,
      onError: () => undefined,
    });

    expect(registered).to.equal(false);
  });

  it('removes only the matching workspace connection and its Slack endpoints', async () => {
    const state = seed();
    const { cached, run } = dispatch(
      state.deps,
      { adapterName: 'slack', action: 'remove', workspaceId: 'T_MATCH' },
      {
        connectionAccessToken: token,
      }
    );

    await run();

    expect(state.connections.map((item) => item.identifier)).to.have.members([
      'conn-other-workspace',
      'conn-other-integration',
      'conn-other-env',
      'conn-other-org',
    ]);
    expect(state.endpoints.map(endpointKey)).to.have.members([
      'conn-match:webhook:env-1:org-1',
      'conn-other-workspace:slack_user:env-1:org-1',
      'conn-other-integration:slack_user:env-1:org-1',
      'conn-other-env:slack_user:env-2:org-1',
      'conn-other-org:slack_channel:env-1:org-2',
    ]);
    expect(state.linkUpdates).to.deep.equal([]);
    expect(cached.adapterFingerprint).to.equal('uninstalled:T_MATCH');
    expect(JSON.stringify(state.logs)).to.not.include(token);
    expect(JSON.stringify(state.logs)).to.not.include(otherToken);
    expect(state.logs.at(-1)).to.include({
      workspaceId: 'T_MATCH',
      integrationIdentifier: 'slack-main',
      connectionsRemoved: 1,
      endpointsRemoved: 2,
    });
  });

  it('keeps the cached instance when the removed workspace is not the fingerprint token', async () => {
    const state = seed();
    const { cached, run } = dispatch(
      state.deps,
      { adapterName: 'slack', action: 'remove', workspaceId: 'T_MATCH' },
      { connectionAccessToken: otherToken }
    );

    await run();

    expect(state.connections.some((item) => item.identifier === 'conn-match')).to.equal(false);
    expect(cached.adapterFingerprint).to.equal('fingerprint-before');
  });

  it('clears connectedAt when the uninstalled workspace was the last connection', async () => {
    const state = seed();
    state.connections.splice(
      state.connections.findIndex((item) => item.identifier === 'conn-other-workspace'),
      1
    );
    const { cached, run } = dispatch(
      state.deps,
      { adapterName: 'slack', action: 'remove', workspaceId: 'T_MATCH' },
      {
        connectionAccessToken: otherToken,
      }
    );

    await run();

    expect(
      state.connections.some(
        (item) =>
          item.integrationIdentifier === 'slack-main' &&
          item._environmentId === 'env-1' &&
          item._organizationId === 'org-1'
      )
    ).to.equal(false);
    expect(state.linkUpdates).to.deep.equal([
      {
        query: {
          _environmentId: 'env-1',
          _organizationId: 'org-1',
          _integrationId: 'integration-1',
        },
        update: { $set: { connectedAt: null } },
      },
    ]);
    expect(cached.adapterFingerprint).to.equal('uninstalled:T_MATCH');
  });

  it('leaves every row in place for a non-slack adapter, a manifest upgrade, and an unknown workspace', async () => {
    const state = seed();
    const beforeConnections = state.connections.map((item) => item.identifier);
    const beforeEndpoints = state.endpoints.map(endpointKey);

    await dispatch(state.deps, { adapterName: 'teams', action: 'remove', workspaceId: 'T_MATCH' }).run();
    await dispatch(state.deps, { adapterName: 'slack', action: 'remove-upgrade', workspaceId: 'T_MATCH' }).run();
    await dispatch(state.deps, { adapterName: 'slack', action: 'remove', workspaceId: 'E_ENTERPRISE' }).run();

    expect(state.connections.map((item) => item.identifier)).to.deep.equal(beforeConnections);
    expect(state.endpoints.map(endpointKey)).to.deep.equal(beforeEndpoints);
    expect(state.linkUpdates).to.deep.equal([]);
  });
});

function row(
  identifier: string,
  accessToken: string,
  workspaceId: string,
  integrationIdentifier: string,
  environmentId: string,
  organizationId: string
): ConnectionRow {
  return {
    identifier,
    auth: { accessToken },
    workspace: { id: workspaceId },
    integrationIdentifier,
    _environmentId: environmentId,
    _organizationId: organizationId,
  };
}

function endpoint(
  connectionIdentifier: string,
  integrationIdentifier: string,
  type: string,
  environmentId: string,
  organizationId: string
): EndpointRow {
  return {
    connectionIdentifier,
    integrationIdentifier,
    type,
    _environmentId: environmentId,
    _organizationId: organizationId,
  };
}

function endpointKey(item: EndpointRow): string {
  return `${item.connectionIdentifier}:${item.type}:${item._environmentId}:${item._organizationId}`;
}

function requireTenant(query: TenantQuery): void {
  if (!query._environmentId || !query._organizationId) {
    throw new Error('query is missing _environmentId or _organizationId');
  }
}

function matchesConnection(item: ConnectionRow, query: TenantQuery): boolean {
  requireTenant(query);
  if (item._environmentId !== query._environmentId || item._organizationId !== query._organizationId) {
    return false;
  }
  if (query.integrationIdentifier && item.integrationIdentifier !== query.integrationIdentifier) {
    return false;
  }
  if (query['workspace.id'] && item.workspace.id !== query['workspace.id']) {
    return false;
  }

  return true;
}

function matchesEndpoint(item: EndpointRow, query: TenantQuery): boolean {
  requireTenant(query);
  if (item._environmentId !== query._environmentId || item._organizationId !== query._organizationId) {
    return false;
  }
  if (query.integrationIdentifier && item.integrationIdentifier !== query.integrationIdentifier) {
    return false;
  }
  if (query.connectionIdentifier?.$in && !query.connectionIdentifier.$in.includes(item.connectionIdentifier)) {
    return false;
  }
  if (query.type?.$in && !query.type.$in.includes(item.type)) {
    return false;
  }

  return true;
}
