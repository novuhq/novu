import {
  buildDefaultSubscriptionIdentifier,
  createContextHash,
  createHash,
  peekOAuthStatePayload,
} from '@novu/application-generic';
import { IntegrationRepository, SubscriberRepository } from '@novu/dal';
import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  ContextPayload,
  InAppProviderIdEnum,
  SubscriberSessionAuthMethodEnum,
} from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { NovuTokens } from '../../shared/services/novu-tokens.service';
import { SubscriberSessionAuthStatsService } from '../../shared/services/subscriber-session-auth-stats.service';

const integrationRepository = new IntegrationRepository();
const subscriberRepository = new SubscriberRepository();

const INVALID_HASH = { statusCode: 400, message: 'Please provide a valid HMAC hash' };
const CONTEXT: ContextPayload = { tenant: { id: 'acme', data: { plan: 'pro' } }, project: 'apollo' };
const CONTEXT_KEYS = ['tenant:acme', 'project:apollo'];

describe('Session with a subscriber token - /inbox/session (POST) #novu-v2', () => {
  let session: UserSession;
  const previousEnv: Record<string, string | undefined> = {};

  function setEnv(key: string, value: string) {
    if (!(key in previousEnv)) {
      previousEnv[key] = process.env[key];
    }
    process.env[key] = value;
  }

  beforeEach(async () => {
    setEnv('IS_SUBSCRIBER_TOKENS_ENABLED', 'true');
    setEnv('IS_CONTEXT_PREFERENCES_ENABLED', 'true');
    session = new UserSession();
    await session.initialize();
    await setHmac(session, true);
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
      delete previousEnv[key];
    }
  });

  async function mint(subscriberId: string, body: Record<string, unknown> = {}, owner: UserSession = session) {
    const res = await owner.testAgent
      .post(`/v2/subscribers/${subscriberId}/tokens`)
      .set('Authorization', `ApiKey ${owner.apiKey}`)
      .send(body);
    expect(res.status, JSON.stringify(res.body)).to.equal(201);

    return res.body.data.token as string;
  }

  function exchange(body: Record<string, unknown>) {
    return session.testAgent.post('/v1/inbox/session').send(body);
  }

  async function storedSubscriber(subscriberId: string) {
    return subscriberRepository.findOne({ _environmentId: session.environment._id, subscriberId });
  }

  it('should start a token session for a new subscriber with the token context and profile', async () => {
    const subscriberToken = await mint('sub-new', {
      context: CONTEXT,
      subscriber: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', data: { team: 'core' } },
      expiresIn: 600,
    });
    const loginExp = (jwt.decode(subscriberToken) as JwtPayload).exp;

    const res = await exchange({ subscriberToken });

    expect(res.status, JSON.stringify(res.body)).to.equal(201);
    const { token, contextKeys, applicationIdentifier } = res.body.data;
    const claims = jwt.verify(token, `${process.env.JWT_SECRET}`) as JwtPayload;
    expect(claims.authMethod).to.equal('token');
    expect(claims.aud).to.equal('widget_user');
    expect(claims.iss).to.equal('novu_api');
    expect(claims.exp).to.equal(loginExp);
    expect(claims.subscriberId).to.equal('sub-new');
    expect(claims.environmentId).to.equal(session.environment._id);
    expect(claims.contextKeys).to.have.members(CONTEXT_KEYS);
    expect(contextKeys).to.have.members(CONTEXT_KEYS);
    expect(applicationIdentifier).to.equal(session.environment.identifier);

    const stored = await storedSubscriber('sub-new');
    expect(stored).to.include({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' });
    expect(stored?.data).to.deep.equal({ team: 'core' });

    const feed = await session.testAgent.get('/v1/inbox/notifications').set('Authorization', `Bearer ${token}`);
    expect(feed.status).to.equal(200);
    expect(feed.body.data).to.deep.equal([]);
  });

  it('should ignore the subscriber, context and hashes the browser sends', async () => {
    await subscriberRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.environment._organizationId,
      subscriberId: 'sub-existing',
      firstName: 'Old',
      email: 'old@example.com',
    });
    const subscriberToken = await mint('sub-existing', {
      context: CONTEXT,
      subscriber: { firstName: 'New', data: { role: 'member' } },
    });
    const secretKey = session.environment.apiKeys[0].key;
    const browserContext: ContextPayload = { tenant: 'evil' };

    const res = await exchange({
      subscriberToken,
      applicationIdentifier: session.environment.identifier,
      subscriber: { subscriberId: 'sub-mallory', email: 'mallory@example.com', data: { role: 'admin' } },
      subscriberId: 'sub-mallory',
      subscriberHash: createHash(secretKey, 'sub-mallory'),
      context: browserContext,
      contextHash: createContextHash(secretKey, browserContext),
    });

    expect(res.status, JSON.stringify(res.body)).to.equal(201);
    const claims = jwt.decode(res.body.data.token) as JwtPayload;
    expect(claims.subscriberId).to.equal('sub-existing');
    expect(claims.contextKeys).to.have.members(CONTEXT_KEYS);
    expect(res.body.data.contextKeys).to.have.members(CONTEXT_KEYS);

    const stored = await storedSubscriber('sub-existing');
    expect(stored).to.include({ firstName: 'New', email: 'old@example.com' });
    expect(stored?.data).to.deep.equal({ role: 'member' });
    expect(await storedSubscriber('sub-mallory')).to.equal(null);
  });

  it('should keep the token context on context-aware routes for clients without Novu-Client-Version', async () => {
    await setHmac(session, false);
    const topicKey = `topic-${Date.now()}`;
    const subscriberId = 'sub-ctx';

    const hmacSession = await exchange({
      applicationIdentifier: session.environment.identifier,
      subscriberId,
      context: CONTEXT,
    });
    const tokenSession = await exchange({ subscriberToken: await mint(subscriberId, { context: CONTEXT }) });
    expect(hmacSession.status).to.equal(201);
    expect(tokenSession.status).to.equal(201);
    expect(hmacSession.body.data.contextKeys).to.have.members(CONTEXT_KEYS);

    const subscribe = (token: string) =>
      session.testAgent
        .post(`/v1/inbox/topics/${topicKey}/subscriptions`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

    const viaHmac = await subscribe(hmacSession.body.data.token);
    const viaToken = await subscribe(tokenSession.body.data.token);

    expect(viaHmac.status, JSON.stringify(viaHmac.body)).to.equal(201);
    expect(viaToken.status, JSON.stringify(viaToken.body)).to.equal(201);
    expect(viaHmac.body.data.identifier).to.equal(buildDefaultSubscriptionIdentifier(topicKey, subscriberId, []));
    expect(viaToken.body.data.identifier).to.equal(
      buildDefaultSubscriptionIdentifier(topicKey, subscriberId, CONTEXT_KEYS)
    );
  });

  it('should answer an expired token with subscriber_token_expired', async () => {
    const subscriberToken = await mint('sub-expired', { expiresIn: 1 });
    await new Promise((resolve) => setTimeout(resolve, 2100));

    const res = await exchange({ subscriberToken });

    expect(res.status).to.equal(401);
    expect(res.body).to.include({ error: 'subscriber_token_expired', message: 'The subscriber token has expired.' });
  });

  describe('should refuse an invalid token exactly like a bad hash', () => {
    async function expectInvalidHash(body: Record<string, unknown>) {
      const res = await exchange(body);

      expect(res.status, JSON.stringify(res.body)).to.equal(400);
      expect(res.body).to.include(INVALID_HASH);
    }

    it('with a tampered payload', async () => {
      const [header, payload, signature] = (await mint('sub-tamper')).split('.');
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
      const forged = Buffer.from(JSON.stringify({ ...claims, sub: 'sub-victim' })).toString('base64url');

      await expectInvalidHash({ subscriberToken: `${header}.${forged}.${signature}` });
    });

    it("with another environment's token sent with this environment's identifier", async () => {
      const other = new UserSession();
      await other.initialize();
      const subscriberToken = await mint('sub-elsewhere', {}, other);

      await expectInvalidHash({ subscriberToken, applicationIdentifier: session.environment.identifier });
    });

    it('with a topic claim', async () => {
      const { token } = new NovuTokens().sign(
        'subscriberLogin',
        {
          iss: session.environment._id,
          aud: 'novu',
          sub: 'sub-topic',
          scope: [],
          jti: 'jti-topic',
          topic: 'ticket:1',
        } as never,
        60
      );

      await expectInvalidHash({ subscriberToken: token });
    });

    it('with an unknown scope', async () => {
      const { token } = new NovuTokens().sign(
        'subscriberLogin',
        {
          iss: session.environment._id,
          aud: 'novu',
          sub: 'sub-scope',
          scope: ['inbox:admin'],
          jti: 'jti-scope',
        } as never,
        60
      );

      await expectInvalidHash({ subscriberToken: token });
    });

    it('with an HS256 token signed with JWT_SECRET', async () => {
      const subscriberToken = jwt.sign(
        { iss: session.environment._id, aud: 'novu', sub: 'sub-hs256', scope: [], jti: 'jti-hs256' },
        `${process.env.JWT_SECRET}`,
        { algorithm: 'HS256', expiresIn: 60, header: { alg: 'HS256', typ: 'novu-subscriber-login+jwt' } }
      );

      await expectInvalidHash({ subscriberToken });
    });

    it('when subscriber tokens are turned off', async () => {
      const subscriberToken = await mint('sub-flag-off');
      setEnv('IS_SUBSCRIBER_TOKENS_ENABLED', 'false');

      await expectInvalidHash({ subscriberToken });
    });

    it('with an expired token when subscriber tokens are turned off', async () => {
      const subscriberToken = await mint('sub-expired-flag-off', { expiresIn: 1 });
      setEnv('IS_SUBSCRIBER_TOKENS_ENABLED', 'false');
      await new Promise((resolve) => setTimeout(resolve, 2100));

      await expectInvalidHash({ subscriberToken });
    });
  });

  describe('chat connect routes take context only from the token', () => {
    const BROWSER_CONTEXT: ContextPayload = { tenant: 'globex' };
    let slackIdentifier: string;

    async function createChatIntegration(providerId: ChatProviderIdEnum) {
      const identifier = `${providerId}-token-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await integrationRepository.create({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        providerId,
        channel: ChannelTypeEnum.CHAT,
        credentials: { clientId: 'test-client-id' },
        active: true,
        identifier,
      });

      return identifier;
    }

    beforeEach(async () => {
      slackIdentifier = await createChatIntegration(ChatProviderIdEnum.Slack);
    });

    async function oauthState(path: string, sessionToken: string, body: Record<string, unknown>) {
      const res = await session.testAgent
        .post(path)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({ integrationIdentifier: slackIdentifier, ...body });
      expect(res.status, JSON.stringify(res.body)).to.equal(201);
      const state = new URL(res.body.data.url).searchParams.get('state') as string;

      return peekOAuthStatePayload<{ subscriberId: string; context?: ContextPayload; contextKeys?: string[] }>(state);
    }

    async function tokenSession(subscriberId: string, mintBody: Record<string, unknown> = {}) {
      const res = await exchange({ subscriberToken: await mint(subscriberId, mintBody) });
      expect(res.status, JSON.stringify(res.body)).to.equal(201);

      return res.body.data.token as string;
    }

    it('should drop the browser context when the token has none', async () => {
      const token = await tokenSession('sub-connect');

      const connect = await oauthState('/v1/inbox/channel-connections/oauth', token, { context: BROWSER_CONTEXT });
      const linkUser = await oauthState('/v1/inbox/channel-endpoints/oauth', token, {
        subscriberId: 'sub-connect',
        context: BROWSER_CONTEXT,
      });

      for (const state of [connect, linkUser]) {
        expect(state.subscriberId).to.equal('sub-connect');
        expect(state.context).to.equal(undefined);
        expect(state.contextKeys).to.equal(undefined);
      }
    });

    it("should use the token's context instead of the browser's", async () => {
      const token = await tokenSession('sub-connect-ctx', { context: CONTEXT });

      const state = await oauthState('/v1/inbox/channel-connections/oauth', token, { context: BROWSER_CONTEXT });

      expect(state.context).to.equal(undefined);
      expect(state.contextKeys).to.have.members(CONTEXT_KEYS);
    });

    it("should carry the token's context into a Webex link-user state", async () => {
      const token = await tokenSession('sub-webex', { context: CONTEXT });
      const webexIdentifier = await createChatIntegration(ChatProviderIdEnum.WebexMessaging);

      const state = await oauthState('/v1/inbox/channel-endpoints/oauth', token, {
        integrationIdentifier: webexIdentifier,
        subscriberId: 'sub-webex',
        connectionIdentifier: 'webex-connection',
        context: BROWSER_CONTEXT,
      });

      expect(state.context).to.equal(undefined);
      expect(state.contextKeys).to.have.members(CONTEXT_KEYS);
    });

    it('should keep using the browser context for a session without a token', async () => {
      await setHmac(session, false);
      const hashSession = await exchange({
        applicationIdentifier: session.environment.identifier,
        subscriberId: 'sub-connect-hash',
      });
      expect(hashSession.status).to.equal(201);

      const state = await oauthState('/v1/inbox/channel-connections/oauth', hashSession.body.data.token, {
        context: BROWSER_CONTEXT,
      });

      expect(state.context).to.deep.equal(BROWSER_CONTEXT);
    });
  });

  it('should refuse a token session on the legacy widget routes', async () => {
    const tokenSession = await exchange({ subscriberToken: await mint('sub-widget', { context: CONTEXT }) });
    expect(tokenSession.status).to.equal(201);
    await setHmac(session, false);
    const hashSession = await exchange({
      applicationIdentifier: session.environment.identifier,
      subscriberId: 'sub-widget-hash',
    });
    expect(hashSession.status).to.equal(201);

    const feed = (token: string) =>
      session.testAgent.get('/v1/widgets/notifications/feed').set('Authorization', `Bearer ${token}`);

    expect((await feed(tokenSession.body.data.token)).status).to.equal(401);
    expect((await feed(hashSession.body.data.token)).status).to.equal(200);
  });

  it('should count a token session as token in the session stats', async () => {
    const res = await exchange({ subscriberToken: await mint('sub-stats') }).set(
      'Novu-Client-Version',
      '@novu/js@3.16.0'
    );
    expect(res.status).to.equal(201);

    const counts = await testServer
      .getService(SubscriberSessionAuthStatsService)
      .countLastDays(session.environment._id, 2);
    expect(counts).to.deep.include({
      authMethod: SubscriberSessionAuthMethodEnum.TOKEN,
      client: '@novu/js@3.16.0',
      count: 1,
    });
    expect(counts?.filter((row) => row.client === '@novu/js@3.16.0')).to.have.lengthOf(1);
  });
});

async function setHmac(session: UserSession, hmac: boolean) {
  await integrationRepository.update(
    {
      _environmentId: session.environment._id,
      _organizationId: session.environment._organizationId,
      providerId: InAppProviderIdEnum.Novu,
      channel: ChannelTypeEnum.IN_APP,
      active: true,
    },
    { $set: { 'credentials.hmac': hmac, active: true } }
  );
}
