import { SubscriberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import { NovuTokens, TokenKind } from '../../shared/services/novu-tokens.service';

describe('Create subscriber token - /v2/subscribers/:subscriberId/tokens (POST) #novu-v2', () => {
  let session: UserSession;
  let previousFlag: string | undefined;
  const subscriberRepository = new SubscriberRepository();

  beforeEach(async () => {
    previousFlag = process.env.IS_SUBSCRIBER_TOKENS_ENABLED;
    process.env.IS_SUBSCRIBER_TOKENS_ENABLED = 'true';
    session = new UserSession();
    await session.initialize();
  });

  afterEach(() => {
    if (previousFlag === undefined) {
      delete process.env.IS_SUBSCRIBER_TOKENS_ENABLED;
    } else {
      process.env.IS_SUBSCRIBER_TOKENS_ENABLED = previousFlag;
    }
  });

  function mint(subscriberId: string, body?: Record<string, unknown>) {
    const request = session.testAgent
      .post(`/v2/subscribers/${subscriberId}/tokens`)
      .set('Authorization', `ApiKey ${session.apiKey}`);

    return body === undefined ? request : request.send(body);
  }

  function verifyClaims(token: string, kind: TokenKind = 'subscriberLogin') {
    const verification = new NovuTokens().verify(kind, token);
    if (!verification.ok) {
      throw new Error(`token did not verify: ${verification.reason}`);
    }

    return verification.claims;
  }

  it('should mint a verifiable token carrying the context, profile, scope and lifetime', async () => {
    const context = { tenant: { id: 'acme', data: { plan: 'pro' } } };
    const subscriber = { firstName: 'Ada', email: 'ada@example.com', data: { team: 'core' } };

    const res = await mint('sub-ada', { context, subscriber, scope: ['channels:shared'], expiresIn: 600 });

    expect(res.status).to.equal(201);
    const { token, expiresAt } = res.body.data;
    const claims = verifyClaims(token);
    const header = jwt.decode(token, { complete: true })?.header;

    expect(header?.alg).to.equal('ES256');
    expect(header?.typ).to.equal('novu-subscriber-login+jwt');
    expect(header?.kid).to.be.a('string').and.not.be.empty;
    expect(claims.iss).to.equal(session.environment._id);
    expect(claims.aud).to.equal('novu');
    expect(claims.sub).to.equal('sub-ada');
    expect(claims.context).to.deep.equal(context);
    expect(claims.subscriber).to.deep.equal(subscriber);
    expect(claims.scope).to.deep.equal(['channels:shared']);
    expect(claims.jti).to.be.a('string').and.not.be.empty;
    expect(claims.exp! - claims.iat!).to.equal(600);
    expect(expiresAt).to.equal(new Date(claims.exp! * 1000).toISOString());
  });

  it('should mint a one-hour token with no scope, context or profile when the body is empty', async () => {
    const res = await mint('sub-bare');

    expect(res.status).to.equal(201);
    const claims = verifyClaims(res.body.data.token);

    expect(claims.exp! - claims.iat!).to.equal(3600);
    expect(claims.scope).to.deep.equal([]);
    expect(claims).not.to.have.property('context');
    expect(claims).not.to.have.property('subscriber');
  });

  it('should mint a one-minute topic grant carrying only the environment, subscriber and topic', async () => {
    const res = await mint('sub-ada', { topic: 'ticket:1' });

    expect(res.status).to.equal(201);
    const { token, expiresAt } = res.body.data;
    const claims = verifyClaims(token, 'subscriberTopicGrant');
    const header = jwt.decode(token, { complete: true })?.header;

    expect(header?.typ).to.equal('novu-subscriber-topic-grant+jwt');
    expect(claims.iss).to.equal(session.environment._id);
    expect(claims.aud).to.equal('novu');
    expect(claims.sub).to.equal('sub-ada');
    expect(claims.topic).to.equal('ticket:1');
    expect(claims.jti).to.be.a('string').and.not.be.empty;
    expect(claims).not.to.have.any.keys('scope', 'subscriber', 'context');
    expect(claims.exp! - claims.iat!).to.equal(60);
    expect(expiresAt).to.equal(new Date(claims.exp! * 1000).toISOString());
    expect(new NovuTokens().verify('subscriberLogin', token)).to.deep.equal({ ok: false, reason: 'invalid' });
  });

  it('should mint a topic grant for a key longer than the v2 topic route allows, as v1 and Inbox topics can have', async () => {
    const topic = `ticket:${'a'.repeat(150)}`;

    const res = await mint('sub-ada', { topic });

    expect(res.status).to.equal(201);
    expect(verifyClaims(res.body.data.token, 'subscriberTopicGrant').topic).to.equal(topic);
  });

  it('should mint a topic grant with a shorter lifetime', async () => {
    const res = await mint('sub-ada', { topic: 'ticket:1', expiresIn: 10 });

    expect(res.status).to.equal(201);
    const claims = verifyClaims(res.body.data.token, 'subscriberTopicGrant');
    expect(claims.exp! - claims.iat!).to.equal(10);
  });

  it('should give every token its own jti', async () => {
    const first = await mint('sub-twice', {});
    const second = await mint('sub-twice', {});

    expect(verifyClaims(first.body.data.token).jti).not.to.equal(verifyClaims(second.body.data.token).jti);
  });

  it('should mint a fresh token on every call with the same idempotency key', async () => {
    const previousIdempotency = process.env.IS_API_IDEMPOTENCY_ENABLED;
    process.env.IS_API_IDEMPOTENCY_ENABLED = 'true';
    try {
      const first = await mint('sub-retry', {}).set('idempotency-key', 'token-retry');
      const second = await mint('sub-retry', {}).set('idempotency-key', 'token-retry');

      expect(second.headers['idempotency-replay']).to.equal(undefined);
      expect(verifyClaims(first.body.data.token).jti).not.to.equal(verifyClaims(second.body.data.token).jti);
    } finally {
      if (previousIdempotency === undefined) {
        delete process.env.IS_API_IDEMPOTENCY_ENABLED;
      } else {
        process.env.IS_API_IDEMPOTENCY_ENABLED = previousIdempotency;
      }
    }
  });

  it('should not create the subscriber', async () => {
    const res = await mint('sub-never-created', { subscriber: { firstName: 'Ghost' } });

    expect(res.status).to.equal(201);
    const stored = await subscriberRepository.findOne({
      _environmentId: session.environment._id,
      subscriberId: 'sub-never-created',
    });
    expect(stored).to.equal(null);
  });

  const invalidBodies: Array<[string, string, Record<string, unknown>]> = [
    ['a lifetime above one hour', 'expiresIn', { expiresIn: 3601 }],
    ['a zero lifetime', 'expiresIn', { expiresIn: 0 }],
    ['a fractional lifetime', 'expiresIn', { expiresIn: 1.5 }],
    ['an unknown scope', 'scope', { scope: ['inbox:admin'] }],
    ['a duplicate scope', 'scope', { scope: ['channels:shared', 'channels:shared'] }],
    ['a context with more than five keys', 'contexts', { context: { a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f' } }],
    ['an invalid profile email', 'subscriber.email', { subscriber: { email: 'not-an-email' } }],
    [
      'a subscriberId inside the profile',
      'subscriberId',
      { subscriber: { firstName: 'Alice', subscriberId: 'sub-mallory' } },
    ],
    ['channels inside the profile', 'channels', { subscriber: { firstName: 'Alice', channels: [] } }],
    ['a topic with a scope', 'topic', { topic: 'ticket:1', scope: ['channels:shared'] }],
    ['a topic with a profile', 'topic', { topic: 'ticket:1', subscriber: { firstName: 'Ada' } }],
    ['a topic with a context', 'topic', { topic: 'ticket:1', context: { tenant: 'acme' } }],
    ['a topic grant longer than a minute', 'expiresIn', { topic: 'ticket:1', expiresIn: 61 }],
    ['an invalid topic key', 'topic', { topic: 'ticket 1!' }],
    ['an empty topic key', 'topic', { topic: '' }],
    ['a null topic with a scope', 'topic', { topic: null, scope: ['channels:shared'] }],
    ['a misspelled field', 'expiresin', { expiresin: 600 }],
  ];

  for (const [name, field, body] of invalidBodies) {
    it(`should reject ${name}`, async () => {
      const res = await mint('sub-invalid', body);

      expect(res.status).to.equal(422);
      expect(res.body.errors.general.messages.join(' ')).to.include(field);
    });
  }

  for (const [name, body] of [
    ['login token', {}],
    ['topic grant', { topic: 'ticket:1' }],
  ] as const) {
    it(`should return 404 for a ${name} when subscriber tokens are disabled`, async () => {
      process.env.IS_SUBSCRIBER_TOKENS_ENABLED = 'false';

      const res = await mint('sub-flag-off', body);

      expect(res.status).to.equal(404);
    });
  }

  it('should return 401 without an API key', async () => {
    const res = await session.testAgent.post('/v2/subscribers/sub-anon/tokens').set('Authorization', '').send({});

    expect(res.status).to.equal(401);
  });
});
