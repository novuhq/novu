/**
 * Regression coverage for the "disconnected channel resurrects itself" bug:
 * disconnecting an integration on the Agent Channels page tombstones the
 * agent-integration link (soft delete). A Slack webhook that still targets the
 * old URL must NOT re-create the link via tryHealMissingAgentIntegrationLink —
 * the heal only applies to never-linked (mid-setup orphan) integrations.
 */
import { encryptCredentials } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  ChannelConnectionRepository,
  IntegrationRepository,
} from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import { testServer } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { ChatInstanceRegistry } from '../conversation-runtime/ingress/chat-instance.registry';
import { AgentExecutionParams, BridgeExecutorService } from '../conversation-runtime/runtime/bridge-executor.service';
import { AgentTestContext, setupAgentTestContext } from './helpers/agent-test-setup';
import { buildSlackAppMention, signSlackRequest } from './helpers/providers/slack';
import {
  findEmulatorChannel,
  findEmulatorUser,
  type SlackChannelSummary,
  type SlackUserSummary,
  startSlackEmulator,
} from './helpers/slack-emulator';

const agentRepository = new AgentRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();
const integrationRepository = new IntegrationRepository();
const channelConnectionRepository = new ChannelConnectionRepository();

describe('Agent integration disconnect tombstone #novu-v2', () => {
  let ctx: AgentTestContext;
  let bridgeCalls: AgentExecutionParams[];
  let slackChannel: SlackChannelSummary;
  let slackUser: SlackUserSummary;

  before(async () => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    const emulator = await startSlackEmulator();
    slackChannel = await findEmulatorChannel(emulator.url, 'incidents');
    slackUser = await findEmulatorUser(emulator.url, 'e2e@novu.test');
  });

  beforeEach(async () => {
    ctx = await setupAgentTestContext();

    // The Slack emulator returns 404 for assistant.threads.setStatus; awaiting
    // acknowledgeOnReceived can block inbound processing long enough to flake.
    await agentRepository.update(
      { _id: ctx.agentId, _environmentId: ctx.session.environment._id },
      { $set: { 'behavior.acknowledgeOnReceived': false } }
    );

    bridgeCalls = [];
    const bridgeExecutor = testServer.getService(BridgeExecutorService);
    sinon.stub(bridgeExecutor, 'execute').callsFake(async (params: AgentExecutionParams) => {
      bridgeCalls.push(params);
    });
  });

  afterEach(async () => {
    const registry = testServer.getService(ChatInstanceRegistry);
    await registry.onModuleDestroy();
    sinon.restore();
  });

  async function postSlackWebhook(integrationIdentifier: string, signingSecret: string) {
    const body = JSON.stringify(
      buildSlackAppMention({
        userId: slackUser.id,
        channel: slackChannel.id,
        threadTs: `${Math.floor(Date.now() / 1000)}.${`${Date.now() % 1000000}`.padStart(6, '0')}`,
      })
    );
    const timestamp = Math.floor(Date.now() / 1000);
    const headers = signSlackRequest(signingSecret, timestamp, body);

    return ctx.session.testAgent
      .post(`/v1/agents/${ctx.agentId}/webhook/${integrationIdentifier}`)
      .set(headers)
      .set('content-type', 'application/json')
      .send(body);
  }

  async function getLinkId(): Promise<string> {
    const listRes = await ctx.session.testAgent.get(`/v1/agents/${ctx.agentIdentifier}/integrations`);
    expect(listRes.status).to.equal(200);
    expect(listRes.body.data.length).to.equal(1);

    return listRes.body.data[0]._id as string;
  }

  async function disconnectLink(linkId: string): Promise<void> {
    const removeRes = await ctx.session.testAgent.delete(`/v1/agents/${ctx.agentIdentifier}/integrations/${linkId}`);
    expect(removeRes.status).to.equal(204);
  }

  function activeLinkQuery() {
    return {
      _agentId: ctx.agentId,
      _integrationId: ctx.integrationId,
      _environmentId: ctx.session.environment._id,
      _organizationId: ctx.session.organization._id,
    };
  }

  it('does not resurrect a deliberately disconnected link when a webhook arrives', async () => {
    const linkId = await getLinkId();
    await disconnectLink(linkId);

    const webhookRes = await postSlackWebhook(ctx.integrationIdentifier, ctx.signingSecret);

    // 200 (not 4xx) so Slack stops retrying the still-registered webhook URL
    expect(webhookRes.status).to.equal(200);
    expect(bridgeCalls.length).to.equal(0);

    // No active link came back — the heal must not have run
    const activeLink = await agentIntegrationRepository.findOne(activeLinkQuery(), ['_id']);
    expect(activeLink).to.equal(null);

    // The tombstone is still there, marking the deliberate disconnect
    const tombstone = await agentIntegrationRepository.findOne(
      { ...activeLinkQuery(), disconnectedAt: { $ne: null } },
      '*'
    );
    if (!tombstone) throw new Error('Expected a tombstoned link to remain after disconnect');
    expect(tombstone._id).to.equal(linkId);
    expect(tombstone.disconnectedAt).to.exist;

    // And the Channels page list stays empty
    const listRes = await ctx.session.testAgent.get(`/v1/agents/${ctx.agentIdentifier}/integrations`);
    expect(listRes.body.data.length).to.equal(0);
  });

  it('still heals a never-linked orphan integration on first inbound webhook', async () => {
    const orphanSigningSecret = 'orphan-slack-signing-secret';
    const orphanIntegration = await integrationRepository.create({
      _environmentId: ctx.session.environment._id,
      _organizationId: ctx.session.organization._id,
      providerId: ChatProviderIdEnum.Slack,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials({ signingSecret: orphanSigningSecret }),
      active: true,
      name: 'Slack Orphan E2E',
      identifier: `slack-orphan-e2e-${Date.now()}`,
      priority: 1,
      primary: false,
      deleted: false,
    });

    await channelConnectionRepository.create({
      identifier: `conn-orphan-e2e-${Date.now()}`,
      _environmentId: ctx.session.environment._id,
      _organizationId: ctx.session.organization._id,
      integrationIdentifier: orphanIntegration.identifier,
      providerId: ChatProviderIdEnum.Slack,
      channel: ChannelTypeEnum.CHAT,
      contextKeys: [],
      workspace: { id: 'W_TEAM', name: 'Test Workspace' },
      auth: { accessToken: 'xoxb-fake-bot-token-for-e2e' },
    });

    const webhookRes = await postSlackWebhook(orphanIntegration.identifier, orphanSigningSecret);

    expect(webhookRes.status).to.equal(200);

    const healedLink = await agentIntegrationRepository.findOne(
      {
        _agentId: ctx.agentId,
        _integrationId: orphanIntegration._id,
        _environmentId: ctx.session.environment._id,
        _organizationId: ctx.session.organization._id,
      },
      '*'
    );
    if (!healedLink) throw new Error('Orphan integration should be auto-linked by the heal');
    expect(healedLink.disconnectedAt ?? null).to.equal(null);
  });

  it('revives the tombstoned link when the integration is re-added', async () => {
    const linkId = await getLinkId();
    await disconnectLink(linkId);

    const addRes = await ctx.session.testAgent
      .post(`/v1/agents/${ctx.agentIdentifier}/integrations`)
      .send({ integrationIdentifier: ctx.integrationIdentifier });

    expect(addRes.status).to.equal(201);
    // Same row revived, not a duplicate
    expect(addRes.body.data._id).to.equal(linkId);

    const revived = await agentIntegrationRepository.findOne(activeLinkQuery(), '*');
    if (!revived) throw new Error('Expected the link to be active again after re-adding the integration');
    expect(revived._id).to.equal(linkId);
    expect(revived.disconnectedAt ?? null).to.equal(null);
    expect(revived.connectedAt ?? null).to.equal(null);

    // The channel works again end to end
    const webhookRes = await postSlackWebhook(ctx.integrationIdentifier, ctx.signingSecret);
    expect(webhookRes.status).to.equal(200);

    // Slack acks the webhook immediately and processes the event fire-and-forget.
    // `connectedAt` is now written when the genuine user message is handled (after
    // the bot-author filter) rather than synchronously on the raw POST, so poll for
    // the link to flip to connected.
    let connectedAtValue: string | null | undefined;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const link = await agentIntegrationRepository.findOne(activeLinkQuery(), '*');
      if (link?.connectedAt) {
        connectedAtValue = link.connectedAt;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    expect(connectedAtValue, 'first user message after revive should re-mark the link connected').to.exist;
  });
});
