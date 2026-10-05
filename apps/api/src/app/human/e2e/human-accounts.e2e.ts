import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { HUMAN_WEBSITE_SECRET_HEADER } from '../guards/human-website-secret.guard';

/**
 * Wiring of the private Human account endpoints in the real app: the shared-secret guard, the
 * enterprise use cases it depends on, and request validation. Nothing here reaches Clerk.
 */
describe('Human accounts (private endpoints for the Human website) #novu-v2', () => {
  const originalSecret = process.env.HUMAN_WEBSITE_API_SECRET;
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.HUMAN_WEBSITE_API_SECRET;
    } else {
      process.env.HUMAN_WEBSITE_API_SECRET = originalSecret;
    }
  });

  function ensureAccount(headers: Record<string, string>, body: object) {
    return session.testAgent.post('/v1/human/accounts').set('Authorization', '').set(headers).send(body);
  }

  it('does not exist while no shared secret is configured', async () => {
    delete process.env.HUMAN_WEBSITE_API_SECRET;

    const res = await ensureAccount({ [HUMAN_WEBSITE_SECRET_HEADER]: '' }, { humanUserId: 'user_e2e' });

    expect(res.status).to.equal(404, JSON.stringify(res.body));
  });

  it('rejects callers without the shared secret, including dashboard sessions', async () => {
    process.env.HUMAN_WEBSITE_API_SECRET = 'e2e-human-website-secret';

    const anonymous = await ensureAccount({ [HUMAN_WEBSITE_SECRET_HEADER]: 'wrong' }, { humanUserId: 'user_e2e' });
    expect(anonymous.status).to.equal(401, JSON.stringify(anonymous.body));

    const dashboardSession = await session.testAgent.post('/v1/human/accounts').send({ humanUserId: 'user_e2e' });
    expect(dashboardSession.status).to.equal(401, JSON.stringify(dashboardSession.body));
  });

  it('validates the Human user ID before touching Clerk', async () => {
    process.env.HUMAN_WEBSITE_API_SECRET = 'e2e-human-website-secret';

    const res = await ensureAccount(
      { [HUMAN_WEBSITE_SECRET_HEADER]: 'e2e-human-website-secret' },
      { humanUserId: 'not an id@example.com' }
    );

    expect(res.status).to.equal(422, JSON.stringify(res.body));
  });
});
