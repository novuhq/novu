import { decryptChannelConnectionAuth, encryptCredentials } from '@novu/application-generic';
import {
  ChannelConnectionRepository,
  ChannelEndpointRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, ContextPayload } from '@novu/shared';
import { UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';

const integrationRepository = new IntegrationRepository();
const channelConnectionRepository = new ChannelConnectionRepository();
const channelEndpointRepository = new ChannelEndpointRepository();
const subscriberRepository = new SubscriberRepository();

const ALICE = 'reconnect-alice';
const BOB = 'reconnect-bob';
const ACME = { tenant: 'acme' };
const GLOBEX = { tenant: 'globex' };

const ALICE_WORKSPACE = { id: 'T0ALICE', name: 'Alice Workspace' };
const ACME_WORKSPACE = { id: 'T0ACME', name: 'Acme Workspace' };
const ATTACKER_WORKSPACE = { id: 'T0EVIL', name: 'Attacker Workspace' };

type ConnectRequest = {
  connectionIdentifier: string;
  connectionMode?: 'subscriber' | 'shared';
  subscriberId?: string;
  context?: ContextPayload;
  autoLinkUser?: boolean;
};

/**
 * NV-9414: the Slack OAuth callback looked a connection up by identifier alone and replaced its
 * tokens, so any subscriber could repoint another subscriber's (or a tenant's shared) connection
 * at their own workspace. Every URL here is minted through the real routes — the Inbox route
 * under a subscriber session, or the server route with the secret key — and only Slack's
 * `oauth.v2.access` is stubbed.
 */
describe('Slack OAuth reconnect ownership - /integrations/chat/oauth/callback (GET) #novu-v2', () => {
  let session: UserSession;
  let integrationIdentifier: string;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    for (const subscriberId of [ALICE, BOB]) {
      await subscriberRepository.create({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        subscriberId,
      });
    }

    integrationIdentifier = (await seedSlackIntegration()).identifier;
  });

  afterEach(() => {
    sinon.restore();
  });

  async function seedSlackIntegration() {
    return await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.Slack,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials({ clientId: 'slack-client-id', secretKey: 'slack-client-secret' }),
      active: true,
      name: 'Slack Reconnect Ownership E2E',
      identifier: `slack-reconnect-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      priority: 1,
      primary: false,
      deleted: false,
    });
  }

  async function seedConnection(body: {
    identifier: string;
    integrationIdentifier?: string;
    subscriberId?: string;
    context?: ContextPayload;
    connectionMode?: 'subscriber' | 'shared';
    accessToken: string;
    workspace: { id: string; name: string };
  }) {
    const { status, text } = await session.testAgent
      .post('/v1/channel-connections')
      .set('Authorization', `ApiKey ${session.apiKey}`)
      .send({ integrationIdentifier, ...body, auth: { accessToken: body.accessToken } });
    expect(status, text).to.equal(201);
  }

  async function inboxToken(subscriberId: string, context?: ContextPayload): Promise<string> {
    const { status, body, text } = await session.testAgent.post('/v1/inbox/session').send({
      applicationIdentifier: session.environment.identifier,
      subscriberId,
      context,
    });
    expect(status, text).to.equal(201);

    return body.data.token;
  }

  function stateFrom(url: string): string {
    const state = new URL(url).searchParams.get('state');
    expect(state, 'Slack authorize URL must carry a state').to.be.a('string');

    return state as string;
  }

  async function connectStateFromInbox(token: string, request: ConnectRequest): Promise<string> {
    const { status, body, text } = await session.testAgent
      .post('/v1/inbox/channel-connections/oauth')
      .set('Authorization', `Bearer ${token}`)
      .send({ integrationIdentifier, ...request });
    expect(status, text).to.equal(201);

    return stateFrom(body.data.url);
  }

  async function connectStateFromServer(request: ConnectRequest): Promise<string> {
    const { status, body, text } = await session.testAgent
      .post('/v1/integrations/channel-connections/oauth')
      .set('Authorization', `ApiKey ${session.apiKey}`)
      .send({ integrationIdentifier, ...request });
    expect(status, text).to.equal(201);

    return stateFrom(body.data.url);
  }

  async function completeSlackOAuth(
    state: string,
    slack: { accessToken: string; team: { id: string; name: string }; authedUserId?: string }
  ) {
    sinon.stub(axios, 'post').resolves({
      data: {
        ok: true,
        access_token: slack.accessToken,
        team: slack.team,
        authed_user: slack.authedUserId ? { id: slack.authedUserId } : undefined,
      },
    });

    try {
      return await session.testAgent.get('/v1/integrations/chat/oauth/callback').query({ code: 'e2e-code', state });
    } finally {
      sinon.restore();
    }
  }

  async function findConnection(identifier: string) {
    const connection = await channelConnectionRepository.findOne({
      identifier,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });
    expect(connection, `connection ${identifier} should exist`).to.exist;

    return {
      ...connection!,
      accessToken: (decryptChannelConnectionAuth(connection!.auth) as { accessToken: string }).accessToken,
    };
  }

  async function countConnections() {
    return await channelConnectionRepository.count({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });
  }

  describe('a subscriber naming a connection they do not own', () => {
    it('refuses another subscriber reusing a personal connection identifier', async () => {
      await seedConnection({
        identifier: 'alice-slack',
        subscriberId: ALICE,
        accessToken: 'xoxb-alice',
        workspace: ALICE_WORKSPACE,
      });

      const state = await connectStateFromInbox(await inboxToken(BOB), {
        connectionIdentifier: 'alice-slack',
        connectionMode: 'subscriber',
        autoLinkUser: false,
      });
      const { status, text } = await completeSlackOAuth(state, {
        accessToken: 'xoxb-attacker',
        team: ATTACKER_WORKSPACE,
      });

      expect(status, text).to.equal(409);

      const connection = await findConnection('alice-slack');
      expect(connection.subscriberId).to.equal(ALICE);
      expect(connection.accessToken).to.equal('xoxb-alice');
      expect(connection.workspace?.id).to.equal(ALICE_WORKSPACE.id);
      expect(await countConnections()).to.equal(1);
    });

    it("refuses a subscriber from another tenant replacing a tenant's shared connection", async () => {
      await seedConnection({
        identifier: 'acme-shared-slack',
        connectionMode: 'shared',
        context: ACME,
        accessToken: 'xoxb-acme',
        workspace: ACME_WORKSPACE,
      });

      const state = await connectStateFromInbox(await inboxToken(BOB, GLOBEX), {
        connectionIdentifier: 'acme-shared-slack',
        connectionMode: 'shared',
        context: GLOBEX,
      });
      const { status, text } = await completeSlackOAuth(state, {
        accessToken: 'xoxb-attacker',
        team: ATTACKER_WORKSPACE,
      });

      expect(status, text).to.equal(409);

      const connection = await findConnection('acme-shared-slack');
      expect(connection.accessToken).to.equal('xoxb-acme');
      expect(connection.workspace?.id).to.equal(ACME_WORKSPACE.id);
      expect(connection.contextKeys).to.deep.equal(['tenant:acme']);
    });

    it("refuses a subscriber with no tenant replacing a tenant's shared connection", async () => {
      await seedConnection({
        identifier: 'acme-shared-slack',
        connectionMode: 'shared',
        context: ACME,
        accessToken: 'xoxb-acme',
        workspace: ACME_WORKSPACE,
      });

      const state = await connectStateFromInbox(await inboxToken(BOB), {
        connectionIdentifier: 'acme-shared-slack',
        connectionMode: 'subscriber',
        autoLinkUser: false,
      });
      const { status, text } = await completeSlackOAuth(state, {
        accessToken: 'xoxb-attacker',
        team: ATTACKER_WORKSPACE,
      });

      expect(status, text).to.equal(409);
      expect((await findConnection('acme-shared-slack')).accessToken).to.equal('xoxb-acme');
    });

    it("refuses reusing the identifier of another integration's connection", async () => {
      const otherIntegration = await seedSlackIntegration();
      await seedConnection({
        identifier: 'alice-other-slack',
        integrationIdentifier: otherIntegration.identifier,
        subscriberId: ALICE,
        accessToken: 'xoxb-alice-other',
        workspace: ALICE_WORKSPACE,
      });

      const state = await connectStateFromInbox(await inboxToken(ALICE), {
        connectionIdentifier: 'alice-other-slack',
        connectionMode: 'subscriber',
        autoLinkUser: false,
      });
      const { status, text } = await completeSlackOAuth(state, {
        accessToken: 'xoxb-alice-new',
        team: ALICE_WORKSPACE,
      });

      expect(status, text).to.equal(409);

      const connection = await findConnection('alice-other-slack');
      expect(connection.integrationIdentifier).to.equal(otherIntegration.identifier);
      expect(connection.accessToken).to.equal('xoxb-alice-other');
    });
  });

  describe('a caller allowed to update the connection', () => {
    it('lets a subscriber reconnect their own connection', async () => {
      await seedConnection({
        identifier: 'alice-slack',
        subscriberId: ALICE,
        context: ACME,
        accessToken: 'xoxb-alice',
        workspace: ALICE_WORKSPACE,
      });

      const state = await connectStateFromInbox(await inboxToken(ALICE, ACME), {
        connectionIdentifier: 'alice-slack',
        connectionMode: 'subscriber',
        autoLinkUser: false,
      });
      const { status, text } = await completeSlackOAuth(state, {
        accessToken: 'xoxb-alice-refreshed',
        team: ALICE_WORKSPACE,
      });

      expect(status, text).to.equal(200);

      const connection = await findConnection('alice-slack');
      expect(connection.subscriberId).to.equal(ALICE);
      expect(connection.accessToken).to.equal('xoxb-alice-refreshed');
      expect(await countConnections()).to.equal(1);
    });

    it("lets a member of the tenant refresh the tenant's shared connection and link themselves", async () => {
      await seedConnection({
        identifier: 'acme-shared-slack',
        connectionMode: 'shared',
        context: ACME,
        accessToken: 'xoxb-acme',
        workspace: ACME_WORKSPACE,
      });

      const state = await connectStateFromInbox(await inboxToken(BOB, ACME), {
        connectionIdentifier: 'acme-shared-slack',
        connectionMode: 'subscriber',
        autoLinkUser: true,
      });
      const { status, text } = await completeSlackOAuth(state, {
        accessToken: 'xoxb-acme-refreshed',
        team: ACME_WORKSPACE,
        authedUserId: 'U0BOB',
      });

      expect(status, text).to.equal(200);

      const connection = await findConnection('acme-shared-slack');
      expect(connection.subscriberId, 'shared connection must stay shared').to.not.exist;
      expect(connection.accessToken).to.equal('xoxb-acme-refreshed');

      const endpoints = await channelEndpointRepository.find({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        connectionIdentifier: 'acme-shared-slack',
      });
      expect(endpoints.map((endpoint) => [endpoint.subscriberId, endpoint.endpoint])).to.deep.equal([
        [BOB, { userId: 'U0BOB' }],
      ]);
    });

    it('lets a server-side caller reconnect a connection by identifier', async () => {
      await seedConnection({
        identifier: 'alice-slack',
        subscriberId: ALICE,
        accessToken: 'xoxb-alice',
        workspace: ALICE_WORKSPACE,
      });
      await seedConnection({
        identifier: 'acme-shared-slack',
        connectionMode: 'shared',
        context: ACME,
        accessToken: 'xoxb-acme',
        workspace: ACME_WORKSPACE,
      });

      const personal = await completeSlackOAuth(
        await connectStateFromServer({ connectionIdentifier: 'alice-slack', subscriberId: ALICE }),
        { accessToken: 'xoxb-alice-refreshed', team: ALICE_WORKSPACE }
      );
      const shared = await completeSlackOAuth(
        await connectStateFromServer({
          connectionIdentifier: 'acme-shared-slack',
          connectionMode: 'shared',
          context: ACME,
        }),
        { accessToken: 'xoxb-acme-refreshed', team: ACME_WORKSPACE }
      );

      expect(personal.status, personal.text).to.equal(200);
      expect(shared.status, shared.text).to.equal(200);
      expect((await findConnection('alice-slack')).accessToken).to.equal('xoxb-alice-refreshed');
      expect((await findConnection('acme-shared-slack')).accessToken).to.equal('xoxb-acme-refreshed');
      expect(await countConnections()).to.equal(2);
    });
  });
});
