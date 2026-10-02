import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { HUMAN_WEBSITE_SECRET_HEADER } from '../guards/human-website-secret.guard';
import { EnsureBackingOrganization } from '../usecases/ensure-backing-organization/ensure-backing-organization.usecase';

/**
 * Wiring of the private Human account endpoints in the real app: the shared-secret guard, the
 * enterprise use cases it depends on, and request validation. Nothing here reaches Clerk: where a
 * backing organization is needed, the test session's own organization stands in for it.
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

  it('validates the login request before touching Clerk', async () => {
    process.env.HUMAN_WEBSITE_API_SECRET = 'e2e-human-website-secret';

    const res = await session.testAgent
      .post('/v1/human/accounts/cli-login')
      .set('Authorization', '')
      .set(HUMAN_WEBSITE_SECRET_HEADER, 'e2e-human-website-secret')
      .send({ humanUserId: 'user_e2e', deviceCode: 'not a device code' });

    expect(res.status).to.equal(422, JSON.stringify(res.body));
  });

  it('starts `human login` requests that are approved on the Human website', async () => {
    const res = await session.testAgent
      .post('/v1/cli/device-sessions')
      .set('Authorization', '')
      .send({ name: 'human-cli' });

    expect(res.status).to.equal(201, JSON.stringify(res.body));
    const { deviceCode, verificationUrl } = res.body.data;
    const url = new URL(verificationUrl);
    expect(`${url.origin}${url.pathname}`).to.equal(`${process.env.HUMAN_WEBSITE_URL?.replace(/\/$/, '')}/cli/login`);
    expect(url.searchParams.get('code')).to.equal(deviceCode);

    const poll = await session.testAgent.post(`/v1/cli/device-sessions/${deviceCode}/poll`).set('Authorization', '');
    expect(poll.body.data.status).to.equal('pending', JSON.stringify(poll.body));
  });

  it('hands an approved `human login` the Development key of the account, once', async () => {
    process.env.HUMAN_WEBSITE_API_SECRET = 'e2e-human-website-secret';
    const ensureBackingOrganization = sinon.stub(testServer.getService(EnsureBackingOrganization), 'execute').resolves({
      organizationId: session.organization._id,
      userId: session.user._id,
      environmentId: session.environment._id,
      region: 'us',
    });

    try {
      const started = await session.testAgent
        .post('/v1/cli/device-sessions')
        .set('Authorization', '')
        .send({ name: 'human-cli' });
      const { deviceCode } = started.body.data;

      const approve = () =>
        session.testAgent
          .post('/v1/human/accounts/cli-login')
          .set('Authorization', '')
          .set(HUMAN_WEBSITE_SECRET_HEADER, 'e2e-human-website-secret')
          .send({ humanUserId: 'user_e2e', firstName: 'Ada', email: 'ada@example.com', deviceCode });

      const approved = await approve();
      expect(approved.status).to.equal(200, JSON.stringify(approved.body));
      expect(ensureBackingOrganization.firstCall.args[0]).to.deep.include({ humanUserId: 'user_e2e' });

      const poll = await session.testAgent.post(`/v1/cli/device-sessions/${deviceCode}/poll`).set('Authorization', '');
      expect(poll.body.data).to.deep.include({
        status: 'approved',
        apiKey: session.apiKey,
        environmentId: session.environment._id,
      });
      expect(poll.body.data.user).to.deep.include({ email: 'ada@example.com', firstName: 'Ada' });

      const handedOver = await session.testAgent
        .post(`/v1/cli/device-sessions/${deviceCode}/poll`)
        .set('Authorization', '');
      expect(handedOver.body.data.status).to.equal('expired');

      expect((await approve()).status).to.equal(404);
    } finally {
      ensureBackingOrganization.restore();
    }
  });
});
