import { CLI_USER_CODE_PATTERN } from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { ConnectClaimTokenService } from '../../connect/services/connect-claim-token.service';
import { HUMAN_DASHBOARD_SECRET_HEADER } from '../guards/human-dashboard-secret.guard';
import { EnsureBackingOrganization } from '../usecases/ensure-backing-organization/ensure-backing-organization.usecase';

/**
 * Wiring of the private Human account endpoints in the real app: the shared-secret guard, the
 * enterprise use cases it depends on, and request validation. Nothing here reaches Clerk: where a
 * backing organization is needed, the test session's own organization stands in for it.
 */
describe('Human accounts (private endpoints for the Human dashboard) #novu-v2', () => {
  const originalSecret = process.env.HUMAN_DASHBOARD_API_SECRET;
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.HUMAN_DASHBOARD_API_SECRET;
    } else {
      process.env.HUMAN_DASHBOARD_API_SECRET = originalSecret;
    }
  });

  function ensureAccount(headers: Record<string, string>, body: object) {
    return session.testAgent.post('/v1/human/accounts').set('Authorization', '').set(headers).send(body);
  }

  it('does not exist while no shared secret is configured', async () => {
    delete process.env.HUMAN_DASHBOARD_API_SECRET;

    const res = await ensureAccount({ [HUMAN_DASHBOARD_SECRET_HEADER]: '' }, { humanUserId: 'user_e2e' });

    expect(res.status).to.equal(404, JSON.stringify(res.body));
  });

  it('rejects callers without the shared secret, including dashboard sessions', async () => {
    process.env.HUMAN_DASHBOARD_API_SECRET = 'e2e-human-dashboard-secret';

    const anonymous = await ensureAccount({ [HUMAN_DASHBOARD_SECRET_HEADER]: 'wrong' }, { humanUserId: 'user_e2e' });
    expect(anonymous.status).to.equal(401, JSON.stringify(anonymous.body));

    const dashboardSession = await session.testAgent.post('/v1/human/accounts').send({ humanUserId: 'user_e2e' });
    expect(dashboardSession.status).to.equal(401, JSON.stringify(dashboardSession.body));
  });

  it('validates the Human user ID before touching Clerk', async () => {
    process.env.HUMAN_DASHBOARD_API_SECRET = 'e2e-human-dashboard-secret';

    const res = await ensureAccount(
      { [HUMAN_DASHBOARD_SECRET_HEADER]: 'e2e-human-dashboard-secret' },
      { humanUserId: 'not an id@example.com' }
    );

    expect(res.status).to.equal(422, JSON.stringify(res.body));
  });

  describe('human login', () => {
    const SECRET = 'e2e-human-dashboard-secret';
    const originalKeylessOrgId = process.env.KEYLESS_ORGANIZATION_ID;
    let ensureBackingOrganization: sinon.SinonStub;

    beforeEach(() => {
      process.env.HUMAN_DASHBOARD_API_SECRET = SECRET;
      // The test session's own organization stands in for the backing organization, so Clerk isn't needed.
      ensureBackingOrganization = sinon.stub(testServer.getService(EnsureBackingOrganization), 'execute').resolves({
        organizationId: session.organization._id,
        userId: session.user._id,
        environmentId: session.environment._id,
        region: 'us',
      });
    });

    afterEach(() => {
      ensureBackingOrganization.restore();

      if (originalKeylessOrgId === undefined) {
        delete process.env.KEYLESS_ORGANIZATION_ID;
      } else {
        process.env.KEYLESS_ORGANIZATION_ID = originalKeylessOrgId;
      }
    });

    async function startLogin(): Promise<{ deviceCode: string; userCode: string; verificationUrl: string }> {
      const res = await session.testAgent
        .post('/v1/cli/device-sessions')
        .set('Authorization', '')
        .send({ name: 'human-cli' });
      expect(res.status).to.equal(201, JSON.stringify(res.body));

      return res.body.data;
    }

    function approve(body: Record<string, string>) {
      return session.testAgent
        .post('/v1/human/accounts/cli-login')
        .set('Authorization', '')
        .set(HUMAN_DASHBOARD_SECRET_HEADER, SECRET)
        .send({ humanUserId: 'user_e2e', firstName: 'Ada', email: 'ada@example.com', ...body });
    }

    function poll(deviceCode: string) {
      return session.testAgent.post(`/v1/cli/device-sessions/${deviceCode}/poll`).set('Authorization', '');
    }

    it('validates the login request before touching Clerk', async () => {
      const res = await approve({ userCode: 'not a code' });

      expect(res.status).to.equal(422, JSON.stringify(res.body));
      expect(ensureBackingOrganization.called).to.equal(false);
    });

    it('starts requests that are approved on the Human dashboard with the code the CLI shows', async () => {
      const { deviceCode, userCode, verificationUrl } = await startLogin();

      // The device code the CLI polls with is not in the link.
      expect(verificationUrl).to.equal(`${process.env.HUMAN_DASHBOARD_URL?.replace(/\/$/, '')}/cli/login`);
      expect(userCode).to.match(CLI_USER_CODE_PATTERN);
      expect((await poll(deviceCode)).body.data.status).to.equal('pending');
    });

    it('hands the Development key of the account to the CLI that showed the code, once', async () => {
      const { deviceCode, userCode } = await startLogin();

      const approved = await approve({ userCode });
      expect(approved.status).to.equal(200, JSON.stringify(approved.body));
      expect(approved.body.data).to.deep.include({ organizationId: session.organization._id, keptSetup: false });

      const first = await poll(deviceCode);
      expect(first.body.data).to.deep.include({
        status: 'approved',
        apiKey: session.apiKey,
        environmentId: session.environment._id,
      });
      expect(first.body.data.user).to.deep.include({ email: 'ada@example.com', firstName: 'Ada' });
      expect((await poll(deviceCode)).body.data.status).to.equal('expired');

      expect((await approve({ userCode })).status).to.equal(404);
    });

    describe('from a computer with a keyless setup', () => {
      let keylessSession: UserSession;
      let claimToken: string;

      function claimTokens() {
        return testServer.getService(ConnectClaimTokenService) as ConnectClaimTokenService;
      }

      beforeEach(async () => {
        keylessSession = new UserSession();
        await keylessSession.initialize();
        process.env.KEYLESS_ORGANIZATION_ID = keylessSession.organization._id;
        ({ token: claimToken } = await claimTokens().issueOrGetForEnvironment({
          env: keylessSession.environment._id,
          org: keylessSession.organization._id,
        }));
      });

      it('keeps the setup, then lets the CLI in', async () => {
        const { deviceCode, userCode } = await startLogin();

        const approved = await approve({ userCode, claimToken });

        expect(approved.status).to.equal(200, JSON.stringify(approved.body));
        expect(approved.body.data.keptSetup).to.equal(true);
        expect(await claimTokens().isEnvironmentClaimed(keylessSession.environment._id)).to.equal(true);
        expect((await poll(deviceCode)).body.data.status).to.equal('approved');
      });

      it('leaves the setup where it is when no login is waiting for the code', async () => {
        const res = await approve({ userCode: 'BCDF-GHJK', claimToken });

        expect(res.status).to.equal(404, JSON.stringify(res.body));
        expect(res.body.code).to.equal('cli_login_not_found');
        expect(await claimTokens().isEnvironmentClaimed(keylessSession.environment._id)).to.equal(false);
      });
    });
  });
});
