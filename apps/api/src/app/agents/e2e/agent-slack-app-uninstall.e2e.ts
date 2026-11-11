/**
 * Slack `app_uninstalled` → that workspace's ChannelConnection and Slack endpoints are removed,
 * and the agent links stop showing Connected once no workspace is left (NV-9394).
 *
 * Failure modes this covers, all through the real signed webhook route:
 * - the uninstall reaches a disabled agent or a disconnected link and is acknowledged without cleanup;
 * - resolving the agent first tries to refresh the revoked rotating bot token, fails with 502, and
 *   never reaches cleanup;
 * - a second delivery after the connections are already gone cannot clear a stale `connectedAt`;
 * - cleanup removes rows of another workspace, environment, integration, or a non-Slack endpoint;
 * - an unsigned request deletes data.
 *
 * Each scenario writes the before/after rows to `$TMPDIR/novu-e2e-artifacts/slack-app-uninstall/`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BadGatewayException } from '@nestjs/common';
import { RotatingConnectionTokenService } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, ChannelConnectionRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import { expect } from 'chai';
import { Types } from 'mongoose';
import sinon from 'sinon';
import { AgentTestContext, channelEndpointRepository, setupAgentTestContext } from './helpers/agent-test-setup';
import { buildSlackAppUninstalled, signSlackRequest } from './helpers/providers/slack';

const agentRepository = new AgentRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();
const channelConnectionRepository = new ChannelConnectionRepository();

const UNINSTALLED_TEAM = 'W_TEAM';
const OTHER_TEAM = 'T_OTHER';
const ARTIFACT_DIR = join(tmpdir(), 'novu-e2e-artifacts', 'slack-app-uninstall');

describe('Agent Slack app uninstall #novu-v2', () => {
  let ctx: AgentTestContext;
  let uninstalledConnectionId: string;

  beforeEach(async () => {
    ctx = await setupAgentTestContext();

    const seeded = await channelConnectionRepository.findOne(
      { ...tenant(), integrationIdentifier: ctx.integrationIdentifier, 'workspace.id': UNINSTALLED_TEAM },
      'identifier'
    );
    if (!seeded) throw new Error('setupAgentTestContext should seed the W_TEAM connection');
    uninstalledConnectionId = seeded.identifier;

    await seedEndpoint(ENDPOINT_TYPES.SLACK_USER, uninstalledConnectionId, { userId: 'U_GONE' });
    await seedEndpoint(ENDPOINT_TYPES.SLACK_CHANNEL, uninstalledConnectionId, { channelId: 'C_GONE' });
    await markLinkConnected();
  });

  afterEach(() => {
    sinon.restore();
  });

  function tenant() {
    return { _environmentId: ctx.session.environment._id, _organizationId: ctx.session.organization._id };
  }

  function linkQuery() {
    return { ...tenant(), _agentId: ctx.agentId, _integrationId: ctx.integrationId };
  }

  async function seedConnection(opts: {
    teamId: string;
    environmentId?: string;
    integrationIdentifier?: string;
    auth?: Record<string, string>;
  }): Promise<string> {
    const identifier = `conn-${opts.teamId}-${new Types.ObjectId().toString()}`;
    await channelConnectionRepository.create({
      identifier,
      _environmentId: opts.environmentId ?? ctx.session.environment._id,
      _organizationId: ctx.session.organization._id,
      integrationIdentifier: opts.integrationIdentifier ?? ctx.integrationIdentifier,
      providerId: ChatProviderIdEnum.Slack,
      channel: ChannelTypeEnum.CHAT,
      contextKeys: [],
      workspace: { id: opts.teamId, name: `Workspace ${opts.teamId}` },
      auth: opts.auth ?? { accessToken: `xoxb-${opts.teamId}` },
    });

    return identifier;
  }

  async function seedEndpoint(
    type: (typeof ENDPOINT_TYPES)[keyof typeof ENDPOINT_TYPES],
    connectionIdentifier: string | undefined,
    endpoint: Record<string, string>
  ): Promise<string> {
    const identifier = `ep-${type}-${new Types.ObjectId().toString()}`;
    await channelEndpointRepository.create({
      identifier,
      ...tenant(),
      integrationIdentifier: ctx.integrationIdentifier,
      providerId: ChatProviderIdEnum.Slack,
      channel: ChannelTypeEnum.CHAT,
      subscriberId: `sub-${identifier}`,
      contextKeys: [],
      type,
      ...(connectionIdentifier ? { connectionIdentifier } : {}),
      endpoint,
    } as Parameters<typeof channelEndpointRepository.create>[0]);

    return identifier;
  }

  async function markLinkConnected() {
    await agentIntegrationRepository.update(linkQuery(), { $set: { connectedAt: new Date().toISOString() } });
  }

  async function postUninstall(teamId: string, signingSecret = ctx.signingSecret) {
    const body = JSON.stringify(buildSlackAppUninstalled({ teamId }));
    const headers = signSlackRequest(signingSecret, Math.floor(Date.now() / 1000), body);

    return ctx.session.testAgent
      .post(`/v1/agents/${ctx.agentId}/webhook/${ctx.integrationIdentifier}`)
      .set(headers)
      .set('content-type', 'application/json')
      .send(body);
  }

  async function snapshot() {
    const connections = await channelConnectionRepository.find(
      { _organizationId: ctx.session.organization._id },
      'identifier _environmentId integrationIdentifier workspace'
    );
    const endpoints = await channelEndpointRepository.find(
      { ...tenant() },
      'identifier type connectionIdentifier integrationIdentifier'
    );
    const link = await agentIntegrationRepository.findOne(linkQuery(), '*');

    return {
      connections: connections
        .map((c) => ({
          identifier: c.identifier,
          environmentId: String(c._environmentId),
          integrationIdentifier: c.integrationIdentifier,
          workspaceId: c.workspace?.id,
        }))
        .sort((a, b) => a.identifier.localeCompare(b.identifier)),
      endpoints: endpoints
        .map((e) => ({ identifier: e.identifier, type: e.type, connectionIdentifier: e.connectionIdentifier ?? null }))
        .sort((a, b) => a.identifier.localeCompare(b.identifier)),
      linkConnectedAt: link?.connectedAt ?? null,
    };
  }

  function connectionsInTestEnvironment(state: Awaited<ReturnType<typeof snapshot>>) {
    return state.connections.filter((c) => c.environmentId === ctx.session.environment._id);
  }

  function writeArtifact(scenario: string, data: Record<string, unknown>): string {
    mkdirSync(ARTIFACT_DIR, { recursive: true });
    const path = join(ARTIFACT_DIR, `${scenario}.json`);
    writeFileSync(path, JSON.stringify(data, null, 2));

    return path;
  }

  it('removes only the uninstalled workspace and keeps Connected while another workspace remains', async () => {
    const otherConnectionId = await seedConnection({ teamId: OTHER_TEAM });
    const otherUserEndpoint = await seedEndpoint(ENDPOINT_TYPES.SLACK_USER, otherConnectionId, { userId: 'U_STAYS' });
    // An incoming-webhook endpoint carries no Slack bot token; uninstall must not touch it.
    const webhookEndpoint = await seedEndpoint(ENDPOINT_TYPES.WEBHOOK, uninstalledConnectionId, {
      url: 'https://hooks.slack.com/services/T/B/X',
    });
    // Same workspace id, other environment and other integration: out of scope for this webhook.
    const otherEnvConnectionId = await seedConnection({
      teamId: UNINSTALLED_TEAM,
      environmentId: new Types.ObjectId().toString(),
    });
    const otherIntegrationConnectionId = await seedConnection({
      teamId: UNINSTALLED_TEAM,
      integrationIdentifier: `slack-other-${Date.now()}`,
    });

    const before = await snapshot();
    const res = await postUninstall(UNINSTALLED_TEAM);
    const after = await snapshot();
    const artifact = writeArtifact('one-of-two-workspaces', { status: res.status, before, after });

    expect(res.status, artifact).to.equal(200);
    expect(
      after.connections.map((c) => c.identifier),
      artifact
    ).to.have.members([otherConnectionId, otherEnvConnectionId, otherIntegrationConnectionId]);
    expect(
      after.endpoints.map((e) => e.identifier),
      artifact
    ).to.have.members([otherUserEndpoint, webhookEndpoint]);
    expect(after.linkConnectedAt, artifact).to.not.equal(null);
  });

  it('cleans up while the agent is disabled and its link disconnected', async () => {
    // Each of these alone makes resolving the agent answer 200 without dispatching the event.
    const linkId = (await agentIntegrationRepository.findOne(linkQuery(), ['_id']))?._id;
    const removeRes = await ctx.session.testAgent.delete(`/v1/agents/${ctx.agentIdentifier}/integrations/${linkId}`);
    expect(removeRes.status).to.equal(204);
    await agentRepository.update({ _id: ctx.agentId, ...tenant() }, { $set: { active: false } });

    const res = await postUninstall(UNINSTALLED_TEAM);
    const after = await snapshot();
    const artifact = writeArtifact('agent-disabled-link-disconnected', { status: res.status, after });

    expect(res.status, artifact).to.equal(200);
    expect(connectionsInTestEnvironment(after), artifact).to.deep.equal([]);
    expect(after.endpoints, artifact).to.deep.equal([]);
  });

  it('cleans up without refreshing the revoked rotating bot token', async () => {
    await channelConnectionRepository.update(
      { ...tenant(), identifier: uninstalledConnectionId },
      {
        $set: {
          auth: {
            accessToken: 'xoxe.xoxb-expired',
            refreshToken: 'xoxe-1-revoked',
            expiresAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          },
        },
      }
    );
    // What Slack answers once the app is uninstalled: every token of the workspace is revoked.
    const refresh = sinon
      .stub(RotatingConnectionTokenService.prototype, 'getConnectionToken')
      .rejects(new BadGatewayException('Slack token refresh failed: invalid_refresh_token.'));

    const res = await postUninstall(UNINSTALLED_TEAM);
    const after = await snapshot();
    const artifact = writeArtifact('revoked-rotating-token', {
      status: res.status,
      refreshAttempts: refresh.callCount,
      after,
    });

    expect(res.status, artifact).to.equal(200);
    expect(connectionsInTestEnvironment(after), artifact).to.deep.equal([]);
    expect(after.linkConnectedAt, artifact).to.equal(null);
  });

  it('a second delivery clears Connected left behind after the connections were already removed', async () => {
    // State after a delivery that deleted the rows but failed before clearing the link.
    await channelEndpointRepository.delete({ ...tenant(), integrationIdentifier: ctx.integrationIdentifier });
    await channelConnectionRepository.delete({ ...tenant(), integrationIdentifier: ctx.integrationIdentifier });

    const res = await postUninstall(UNINSTALLED_TEAM);
    const after = await snapshot();
    const artifact = writeArtifact('second-delivery', { status: res.status, after });

    expect(res.status, artifact).to.equal(200);
    expect(after.linkConnectedAt, artifact).to.equal(null);
  });

  it('rejects an uninstall signed with the wrong secret and deletes nothing', async () => {
    const before = await snapshot();
    const res = await postUninstall(UNINSTALLED_TEAM, 'not-the-signing-secret');
    const after = await snapshot();
    const artifact = writeArtifact('bad-signature', { status: res.status, before, after });

    expect(res.status, artifact).to.equal(401);
    expect(after, artifact).to.deep.equal(before);
  });
});
