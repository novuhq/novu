import { encryptCredentials } from '@novu/application-generic';
import { ChannelConnectionRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, InAppProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';

const integrationRepository = new IntegrationRepository();
const channelConnectionRepository = new ChannelConnectionRepository();

const CONTEXT = { tenant: 'acme' };
const CONTEXT_KEYS = ['tenant:acme'];
const SCOPE_REQUIRED = { statusCode: 403, error: 'channels_shared_scope_required' };

type Team = { id: string; name: string };

/** Each OAuth provider that can hold a shared connection, with its token exchange stubbed at the HTTP boundary. */
const OAUTH_PROVIDERS = [
  {
    providerId: ChatProviderIdEnum.Slack,
    stubProvider: (team: Team) => ({
      post: sinon.stub(axios, 'post').resolves({ data: { ok: true, access_token: `xoxb-${team.id}`, team } }),
    }),
  },
  {
    providerId: ChatProviderIdEnum.WebexMessaging,
    stubProvider: (team: Team) => {
      sinon.stub(axios, 'get').resolves({ data: { orgId: team.id, displayName: team.name } });

      return { post: sinon.stub(axios, 'post').resolves({ data: { access_token: `webex-${team.id}` } }) };
    },
  },
] as const;

describe('Shared channel connections need the channels:shared scope - /inbox/channel-connections #novu-v2', () => {
  let session: UserSession;
  let slackIdentifier: string;
  let webexIdentifier: string;
  let previousFlag: string | undefined;

  before(() => {
    previousFlag = process.env.IS_SUBSCRIBER_TOKENS_ENABLED;
  });

  after(() => {
    if (previousFlag === undefined) {
      delete process.env.IS_SUBSCRIBER_TOKENS_ENABLED;
    } else {
      process.env.IS_SUBSCRIBER_TOKENS_ENABLED = previousFlag;
    }
  });

  beforeEach(async () => {
    process.env.IS_SUBSCRIBER_TOKENS_ENABLED = 'true';
    session = new UserSession();
    await session.initialize();

    slackIdentifier = `slack-scope-${Date.now()}`;
    await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.Slack,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials({ clientId: 'slack-client-id', secretKey: 'slack-client-secret' }),
      active: true,
      identifier: slackIdentifier,
    });

    webexIdentifier = `webex-scope-${Date.now()}`;
    await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.WebexMessaging,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials({ clientId: 'webex-client-id', secretKey: 'webex-client-secret' }),
      active: true,
      identifier: webexIdentifier,
    });
  });

  function integrationIdentifierFor(providerId: ChatProviderIdEnum) {
    return providerId === ChatProviderIdEnum.WebexMessaging ? webexIdentifier : slackIdentifier;
  }

  afterEach(() => {
    sinon.restore();
  });

  async function requireTokens(required: boolean) {
    await session.testAgent
      .put(`/v1/environments/${session.environment._id}/subscriber-tokens`)
      .send({ required })
      .expect(200);
  }

  async function tokenSession(subscriberId: string, scope: string[] = []) {
    const minted = await session.testAgent
      .post(`/v2/subscribers/${subscriberId}/tokens`)
      .set('Authorization', `ApiKey ${session.apiKey}`)
      .send({ context: CONTEXT, scope });
    expect(minted.status, JSON.stringify(minted.body)).to.equal(201);

    const res = await session.testAgent.post('/v1/inbox/session').send({ subscriberToken: minted.body.data.token });
    expect(res.status, JSON.stringify(res.body)).to.equal(201);

    return res.body.data.token as string;
  }

  const member = () => tokenSession('sub-member');
  const admin = () => tokenSession('sub-admin', ['channels:shared']);

  function connectUrl(token: string, body: Record<string, unknown>) {
    return session.testAgent
      .post('/v1/inbox/channel-connections/oauth')
      .set('Authorization', `Bearer ${token}`)
      .send({ integrationIdentifier: slackIdentifier, ...body });
  }

  function deleteConnection(token: string, identifier: string) {
    return session.testAgent
      .delete(`/v1/inbox/channel-connections/${identifier}`)
      .set('Authorization', `Bearer ${token}`);
  }

  /** Runs the connect URL and the OAuth callback; returns the callback and the provider token-exchange stub. */
  async function completeConnect(
    token: string,
    body: Record<string, unknown>,
    team: Team,
    provider: (typeof OAUTH_PROVIDERS)[number] = OAUTH_PROVIDERS[0]
  ) {
    const res = await connectUrl(token, {
      integrationIdentifier: integrationIdentifierFor(provider.providerId),
      ...body,
    });
    expect(res.status, JSON.stringify(res.body)).to.equal(201);
    const state = new URL(res.body.data.url).searchParams.get('state');
    const { post: tokenExchange } = provider.stubProvider(team);
    const callback = await session.testAgent.get('/v1/integrations/chat/oauth/callback').query({ code: 'code', state });

    return { callback, tokenExchange };
  }

  function seedSharedConnection(providerId: ChatProviderIdEnum = ChatProviderIdEnum.Slack) {
    return channelConnectionRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      identifier: `shared-${Date.now()}`,
      integrationIdentifier: integrationIdentifierFor(providerId),
      providerId,
      channel: ChannelTypeEnum.CHAT,
      contextKeys: CONTEXT_KEYS,
      workspace: { id: 'T-ORIGINAL', name: 'Original' },
      auth: { accessToken: 'xoxb-original' },
    });
  }

  function findConnection(identifier: string) {
    return channelConnectionRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      identifier,
    });
  }

  describe('when the environment requires subscriber tokens', () => {
    beforeEach(async () => {
      await requireTokens(true);
    });

    it('should let only an admin get a shared-mode connect URL', async () => {
      const memberRes = await connectUrl(await member(), { connectionMode: 'shared' });
      const adminRes = await connectUrl(await admin(), { connectionMode: 'shared' });

      expect(memberRes.status).to.equal(403);
      expect(memberRes.body).to.include(SCOPE_REQUIRED);
      expect(adminRes.status, JSON.stringify(adminRes.body)).to.equal(201);
    });

    for (const provider of OAUTH_PROVIDERS) {
      describe(`through the ${provider.providerId} OAuth callback`, () => {
        it('should not let a member replace a shared connection by naming it in a subscriber-mode connect', async () => {
          const shared = await seedSharedConnection(provider.providerId);

          const { callback, tokenExchange } = await completeConnect(
            await member(),
            { connectionIdentifier: shared.identifier },
            { id: 'T-MEMBER', name: 'Member' },
            provider
          );

          expect(callback.status).to.equal(403);
          // Refused before the provider code exchange, so no provider token is ever issued for the member.
          expect(tokenExchange.called).to.equal(false);
          const stored = await findConnection(shared.identifier);
          expect(stored?.workspace).to.deep.include({ id: 'T-ORIGINAL' });
          expect(stored?.auth).to.deep.equal(shared.auth);
        });

        it('should let an admin create a shared connection', async () => {
          const identifier = `shared-new-${Date.now()}`;

          const { callback } = await completeConnect(
            await admin(),
            { connectionIdentifier: identifier, connectionMode: 'shared' },
            { id: 'T-NEW', name: 'New' },
            provider
          );

          expect(callback.status, callback.text).to.equal(200);
          const stored = await findConnection(identifier);
          expect(stored).to.exist;
          expect(stored?.subscriberId, 'a shared connection has no subscriber').to.not.be.ok;
          expect(stored?.contextKeys).to.deep.equal(CONTEXT_KEYS);
          expect(stored?.workspace).to.deep.include({ id: 'T-NEW' });
        });

        it('should let an admin replace a shared connection', async () => {
          const shared = await seedSharedConnection(provider.providerId);

          const { callback } = await completeConnect(
            await admin(),
            { connectionIdentifier: shared.identifier, connectionMode: 'shared' },
            { id: 'T-ADMIN', name: 'Admin' },
            provider
          );

          expect(callback.status, callback.text).to.equal(200);
          const stored = await findConnection(shared.identifier);
          expect(stored?.workspace).to.deep.include({ id: 'T-ADMIN', name: 'Admin' });
        });
      });
    }

    it('should let only an admin delete a shared connection', async () => {
      const shared = await seedSharedConnection();

      const memberRes = await deleteConnection(await member(), shared.identifier);
      expect(memberRes.status).to.equal(403);
      expect(memberRes.body).to.include(SCOPE_REQUIRED);
      expect(await findConnection(shared.identifier)).to.exist;

      const adminRes = await deleteConnection(await admin(), shared.identifier);
      expect(adminRes.status).to.equal(204);
      expect(await findConnection(shared.identifier)).to.equal(null);
    });

    it('should let a member connect and delete a personal connection', async () => {
      const token = await member();
      const identifier = `personal-${Date.now()}`;

      const { callback } = await completeConnect(
        token,
        { connectionIdentifier: identifier, connectionMode: 'subscriber' },
        { id: 'T-PERSONAL', name: 'Personal' }
      );
      expect(callback.status, callback.text).to.equal(200);
      expect((await findConnection(identifier))?.subscriberId).to.equal('sub-member');

      const deleted = await deleteConnection(token, identifier);
      expect(deleted.status).to.equal(204);
      expect(await findConnection(identifier)).to.equal(null);
    });
  });

  describe('when the environment does not require subscriber tokens', () => {
    async function hashSession() {
      await integrationRepository.update(
        {
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
          providerId: InAppProviderIdEnum.Novu,
          channel: ChannelTypeEnum.IN_APP,
        },
        { $set: { 'credentials.hmac': false } }
      );
      const res = await session.testAgent.post('/v1/inbox/session').send({
        applicationIdentifier: session.environment.identifier,
        subscriberId: 'sub-hash',
        context: CONTEXT,
      });
      expect(res.status, JSON.stringify(res.body)).to.equal(201);

      return res.body.data.token as string;
    }

    for (const [name, sessionToken] of [
      ['a token session without the scope', member],
      ['a session without a token', hashSession],
    ] as const) {
      it(`should let ${name} create and delete shared connections`, async () => {
        const token = await sessionToken();
        const shared = await seedSharedConnection();

        const url = await connectUrl(token, { connectionMode: 'shared' });
        const deleted = await deleteConnection(token, shared.identifier);

        expect(url.status, JSON.stringify(url.body)).to.equal(201);
        expect(deleted.status, JSON.stringify(deleted.body)).to.equal(204);
        expect(await findConnection(shared.identifier)).to.equal(null);
      });
    }
  });
});
