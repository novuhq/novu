import { authorize } from '@novu/api/helpers/authorize.js';
import { ErrorDto } from '@novu/api/models/errors';
import { SubscriberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Authorize a subscriber with the SDK helper - authorize() #novu-v2', () => {
  let session: UserSession;
  const subscriberRepository = new SubscriberRepository();
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

  it('should return a token the browser exchanges for a session of that subscriber, context and profile', async () => {
    const novu = initNovuClassSdk(session);

    const { status, body } = await authorize(novu, {
      subscriber: { subscriberId: 'sub-ada', firstName: 'Ada', email: 'ada@example.com', data: { team: 'core' } },
      context: { tenant: { id: 'acme', data: { plan: 'pro' } } },
      expiresIn: 600,
    });

    expect(status).to.equal(200);
    const loginExp = (jwt.decode(body.token) as JwtPayload).exp;
    expect(body.expiresAt).to.equal(new Date(loginExp! * 1000).toISOString());

    const res = await session.testAgent.post('/v1/inbox/session').send({ subscriberToken: body.token });

    expect(res.status, JSON.stringify(res.body)).to.equal(201);
    const claims = jwt.verify(res.body.data.token, `${process.env.JWT_SECRET}`) as JwtPayload;
    expect(claims.subscriberId).to.equal('sub-ada');
    expect(claims.exp).to.equal(loginExp);
    expect(res.body.data.contextKeys).to.deep.equal(['tenant:acme']);

    const stored = await subscriberRepository.findOne({
      _environmentId: session.environment._id,
      subscriberId: 'sub-ada',
    });
    expect(stored).to.include({ firstName: 'Ada', email: 'ada@example.com' });
    expect(stored?.data).to.deep.equal({ team: 'core' });

    const feed = await session.testAgent
      .get('/v1/inbox/notifications')
      .set('Authorization', `Bearer ${res.body.data.token}`);
    expect(feed.status).to.equal(200);
  });

  it('should reject with the SDK error when subscriber tokens are disabled', async () => {
    setEnv('IS_SUBSCRIBER_TOKENS_ENABLED', 'false');

    const error = await authorize(initNovuClassSdk(session), { subscriber: { subscriberId: 'sub-off' } }).then(
      () => undefined,
      (e: unknown) => e
    );

    expect(error).to.be.instanceOf(ErrorDto);
    expect((error as ErrorDto).statusCode).to.equal(404);
  });
});
