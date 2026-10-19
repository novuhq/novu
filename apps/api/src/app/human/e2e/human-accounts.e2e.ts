import { BadRequestException } from '@nestjs/common';
import { CLI_USER_CODE_PATTERN } from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { ConnectClaimTokenService } from '../../connect/services/connect-claim-token.service';
import { AGENT_INBOX_DASHBOARD_SECRET_HEADER } from '../guards/human-dashboard-secret.guard';
import { HumanBackingAccounts } from '../services/human-backing-accounts.service';
import { EnsureBackingOrganization } from '../usecases/ensure-backing-organization/ensure-backing-organization.usecase';

/**
 * Wiring of the private Human account endpoints in the real app: the shared-secret guard, the
 * enterprise use cases it depends on, and request validation. Nothing here reaches Clerk: where a
 * backing organization is needed, the test session's own organization stands in for it.
 */
describe('Human accounts (private endpoints for the Human dashboard) #novu-v2', () => {
  const originalSecret = process.env.AGENT_INBOX_DASHBOARD_API_SECRET;
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.AGENT_INBOX_DASHBOARD_API_SECRET;
    } else {
      process.env.AGENT_INBOX_DASHBOARD_API_SECRET = originalSecret;
    }
  });

  function ensureAccount(headers: Record<string, string>, body: object) {
    return session.testAgent.post('/v1/human/accounts').set('Authorization', '').set(headers).send(body);
  }

  it('does not exist while no shared secret is configured', async () => {
    delete process.env.AGENT_INBOX_DASHBOARD_API_SECRET;

    const res = await ensureAccount({ [AGENT_INBOX_DASHBOARD_SECRET_HEADER]: '' }, { humanUserId: 'user_e2e' });

    expect(res.status).to.equal(404, JSON.stringify(res.body));
  });

  it('rejects callers without the shared secret, including dashboard sessions', async () => {
    process.env.AGENT_INBOX_DASHBOARD_API_SECRET = 'e2e-human-dashboard-secret';

    const anonymous = await ensureAccount(
      { [AGENT_INBOX_DASHBOARD_SECRET_HEADER]: 'wrong' },
      { humanUserId: 'user_e2e' }
    );
    expect(anonymous.status).to.equal(401, JSON.stringify(anonymous.body));

    const dashboardSession = await session.testAgent.post('/v1/human/accounts').send({ humanUserId: 'user_e2e' });
    expect(dashboardSession.status).to.equal(401, JSON.stringify(dashboardSession.body));
  });

  it('validates the Human user ID before touching Clerk', async () => {
    process.env.AGENT_INBOX_DASHBOARD_API_SECRET = 'e2e-human-dashboard-secret';

    const res = await ensureAccount(
      { [AGENT_INBOX_DASHBOARD_SECRET_HEADER]: 'e2e-human-dashboard-secret' },
      { humanUserId: 'not an id@example.com' }
    );

    expect(res.status).to.equal(422, JSON.stringify(res.body));
  });

  it('keeps regenerating the secret key behind the shared secret too', async () => {
    const regenerate = (secret: string) =>
      session.testAgent
        .post('/v1/human/accounts/user_e2e/secret-key/regenerate')
        .set('Authorization', '')
        .set(AGENT_INBOX_DASHBOARD_SECRET_HEADER, secret);

    delete process.env.AGENT_INBOX_DASHBOARD_API_SECRET;
    expect((await regenerate('')).status).to.equal(404);

    process.env.AGENT_INBOX_DASHBOARD_API_SECRET = 'e2e-human-dashboard-secret';
    expect((await regenerate('wrong')).status).to.equal(401);

    const dashboardSession = await session.testAgent.post('/v1/human/accounts/user_e2e/secret-key/regenerate');
    expect(dashboardSession.status).to.equal(401, JSON.stringify(dashboardSession.body));
  });

  describe('the sign-up webhook and the first page at the same time', () => {
    const SECRET = 'e2e-human-dashboard-secret';
    let finishFirstSetup: () => void = () => undefined;
    // The requests a test sent, and whether it has ended, so nothing it started outlives it.
    let inFlight: Promise<unknown>[] = [];
    let ended = false;

    beforeEach(() => {
      process.env.AGENT_INBOX_DASHBOARD_API_SECRET = SECRET;
      inFlight = [];
      ended = false;
    });

    afterEach(async () => {
      // A test that failed halfway still lets the held setup end, and both requests finish before the stubs
      // go: neither may reach the real setup, and Clerk with it, afterwards.
      ended = true;
      finishFirstSetup();
      await Promise.allSettled(inFlight);
      sinon.restore();
    });

    async function waitUntil(condition: () => boolean) {
      while (!condition() && !ended) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    it('gives both the account, set up once, instead of telling one to try again', async () => {
      // A new ID each run, so a lock that an earlier run left behind can't hold this one up.
      const humanUserId = `user_e2e_${Date.now()}`;
      // The test session's own organization stands in for the backing organization, so Clerk isn't needed.
      const backingAccount = {
        clerkUserId: 'user_backing_e2e',
        clerkOrganizationId: session.organization.externalId,
        novuUserId: session.user._id,
      };
      const setup = sinon.stub(testServer.getService(HumanBackingAccounts), 'findOrCreate').resolves(backingAccount);
      setup.onFirstCall().returns(
        new Promise((resolve) => {
          finishFirstSetup = () => resolve(backingAccount);
        })
      );
      const ensureCalls = sinon.spy(testServer.getService(EnsureBackingOrganization), 'execute');

      const answered = new Set<string>();
      const ensure = (caller: string) => {
        const request = ensureAccount(
          { [AGENT_INBOX_DASHBOARD_SECRET_HEADER]: SECRET },
          { humanUserId, firstName: 'Ada' }
        ).then((res) => {
          answered.add(caller);

          return res;
        });
        inFlight.push(request);

        return request;
      };

      // The webhook gets there first, and its setup stays in Clerk until the test lets it finish.
      const webhook = ensure('webhook');
      await waitUntil(() => setup.called || answered.has('webhook'));
      expect(setup.called).to.equal(true, 'the webhook was answered before it got to the setup');

      // The first page arrives in the middle of it. It used to be told at once that the account was busy;
      // a second is far longer than that answer takes, and the page must still be waiting after it.
      const firstPage = ensure('first page');
      await waitUntil(() => ensureCalls.calledTwice || answered.has('first page'));
      await new Promise((resolve) => setTimeout(resolve, 1000));
      expect(answered.has('first page')).to.equal(false, 'the first page did not wait for the setup under way');
      expect(setup.calledOnce).to.equal(true, 'the first page started a second setup alongside the webhook');

      finishFirstSetup();
      const [webhookRes, firstPageRes] = await Promise.all([webhook, firstPage]);

      expect(webhookRes.status).to.equal(200, JSON.stringify(webhookRes.body));
      expect(firstPageRes.status).to.equal(200, JSON.stringify(firstPageRes.body));
      expect(firstPageRes.body.data).to.deep.equal(webhookRes.body.data);
      expect(webhookRes.body.data).to.deep.include({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
      });
      // The first page took its turn once the webhook was done, and found the account the webhook made.
      expect(setup.calledTwice).to.equal(true);
    });
  });

  describe('human login', () => {
    const SECRET = 'e2e-human-dashboard-secret';
    const originalKeylessOrgId = process.env.KEYLESS_ORGANIZATION_ID;
    let ensureBackingOrganization: sinon.SinonStub;

    beforeEach(() => {
      process.env.AGENT_INBOX_DASHBOARD_API_SECRET = SECRET;
      ensureBackingOrganization = sinon
        .stub(testServer.getService(EnsureBackingOrganization), 'execute')
        .resolves(backingAccount());
    });

    /** The test session's own organization stands in for the backing organization, so Clerk isn't needed. */
    function backingAccount() {
      return {
        organizationId: session.organization._id,
        userId: session.user._id,
        environmentId: session.environment._id,
        region: 'us',
      };
    }

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
        .send({ name: 'human-cli', machineName: 'adas-macbook-pro' });
      expect(res.status).to.equal(201, JSON.stringify(res.body));

      return res.body.data;
    }

    function approve(body: Record<string, string>) {
      return session.testAgent
        .post('/v1/human/accounts/cli-login')
        .set('Authorization', '')
        .set(AGENT_INBOX_DASHBOARD_SECRET_HEADER, SECRET)
        .send({ humanUserId: 'user_e2e', firstName: 'Ada', email: 'ada@example.com', ...body });
    }

    function lookUp(userCode: string) {
      return session.testAgent
        .post('/v1/human/accounts/cli-login/lookup')
        .set('Authorization', '')
        .set(AGENT_INBOX_DASHBOARD_SECRET_HEADER, SECRET)
        .send({ userCode });
    }

    function deny(userCode: string) {
      return session.testAgent
        .post('/v1/human/accounts/cli-login/deny')
        .set('Authorization', '')
        .set(AGENT_INBOX_DASHBOARD_SECRET_HEADER, SECRET)
        .send({ userCode });
    }

    function poll(deviceCode: string) {
      return session.testAgent.post(`/v1/cli/device-sessions/${deviceCode}/poll`).set('Authorization', '');
    }

    /**
     * Starts an approval and stops it where it prepares the account: it holds the login by then, and has
     * moved nothing yet. `letGo` lets it carry on, or fail there with the error it is given.
     */
    async function pauseApproval(body: Record<string, string>) {
      let letGo: (failure?: Error) => void = () => undefined;
      const account = new Promise<ReturnType<typeof backingAccount>>((resolve, reject) => {
        letGo = (failure) => (failure ? reject(failure) : resolve(backingAccount()));
      });
      ensureBackingOrganization.onFirstCall().returns(account);

      let answered = false;
      const approving = approve(body).then((res) => {
        answered = true;

        return res;
      });
      while (!ensureBackingOrganization.called && !answered) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(ensureBackingOrganization.called).to.equal(true, 'the approval was answered before it got to the account');

      return { approving, letGo };
    }

    it('validates the login request before touching Clerk', async () => {
      const res = await approve({ userCode: 'not a code' });

      expect(res.status).to.equal(422, JSON.stringify(res.body));
      expect(ensureBackingOrganization.called).to.equal(false);
    });

    it('starts requests that are approved on the Human dashboard with the code the CLI shows', async () => {
      const { deviceCode, userCode, verificationUrl } = await startLogin();

      // The link shows the code to compare with the terminal; the device code the CLI polls with is not in it.
      expect(verificationUrl).to.equal(
        `${process.env.HUMAN_DASHBOARD_URL?.replace(/\/$/, '')}/cli/login?code=${userCode}`
      );
      expect(verificationUrl).not.to.contain(deviceCode);
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

    it('shows the dashboard the computer a login waits on, only to the dashboard', async () => {
      const { userCode } = await startLogin();

      const found = await lookUp(userCode);
      expect(found.status).to.equal(200, JSON.stringify(found.body));
      expect(found.body.data).to.deep.equal({ userCode, machineName: 'adas-macbook-pro' });

      const withoutSecret = await session.testAgent
        .post('/v1/human/accounts/cli-login/lookup')
        .set('Authorization', '')
        .send({ userCode });
      expect(withoutSecret.status).to.equal(401, JSON.stringify(withoutSecret.body));

      const missing = await lookUp('BCDF-GHJK');
      expect(missing.status).to.equal(404, JSON.stringify(missing.body));
      expect(missing.body.code).to.equal('cli_login_not_found');
      expect((await lookUp('not a code')).status).to.equal(422);
    });

    it('denies a login: the CLI is told once, gets no key, and the code stops working', async () => {
      const { deviceCode, userCode } = await startLogin();

      const denied = await deny(userCode);
      expect(denied.status).to.equal(200, JSON.stringify(denied.body));
      expect(denied.body.data).to.deep.equal({ denied: true });

      expect((await lookUp(userCode)).status).to.equal(404);
      expect((await approve({ userCode })).status).to.equal(404);
      expect(ensureBackingOrganization.called).to.equal(false);

      const first = await poll(deviceCode);
      expect(first.body.data).to.deep.equal({ status: 'denied' });
      expect((await poll(deviceCode)).body.data.status).to.equal('expired');

      // Denying again changes nothing and is not an error.
      expect((await deny(userCode)).body.data).to.deep.equal({ denied: false });
    });

    it('does not deny a login that was approved', async () => {
      const { deviceCode, userCode } = await startLogin();
      await approve({ userCode });

      expect((await deny(userCode)).body.data).to.deep.equal({ denied: false });
      expect((await poll(deviceCode)).body.data.status).to.equal('approved');
    });

    it('holds a login while it is being approved, and gives it back when that approval fails', async () => {
      const { deviceCode, userCode } = await startLogin();
      const { approving, letGo } = await pauseApproval({ userCode });

      // Neither a denial nor a second approval gets in between; the CLI just keeps waiting.
      const denied = await deny(userCode);
      expect(denied.status).to.equal(409, JSON.stringify(denied.body));
      expect(denied.body.code).to.equal('cli_login_being_approved');
      expect((await approve({ userCode })).status).to.equal(409);
      expect((await lookUp(userCode)).status).to.equal(200);
      expect((await poll(deviceCode)).body.data.status).to.equal('pending');

      letGo(new BadRequestException('The account could not be prepared.'));
      expect((await approving).status).to.equal(400);

      // Nothing was approved, so the login waits again and can be denied right away.
      expect((await deny(userCode)).body.data).to.deep.equal({ denied: true });
      expect((await poll(deviceCode)).body.data).to.deep.equal({ status: 'denied' });
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

      it('is not denied halfway through an approval: the setup moves and the CLI is let in', async () => {
        const { deviceCode, userCode } = await startLogin();
        const { approving, letGo } = await pauseApproval({ userCode, claimToken });

        // Denied now, the setup would still move while the CLI is told that nothing changed.
        const denied = await deny(userCode);
        expect(denied.status).to.equal(409, JSON.stringify(denied.body));
        expect(denied.body.code).to.equal('cli_login_being_approved');

        letGo();
        const approved = await approving;
        expect(approved.status).to.equal(200, JSON.stringify(approved.body));
        expect(approved.body.data.keptSetup).to.equal(true);
        expect(await claimTokens().isEnvironmentClaimed(keylessSession.environment._id)).to.equal(true);

        // Denying afterwards finds nothing waiting, and says so instead of claiming a denial.
        expect((await deny(userCode)).body.data).to.deep.equal({ denied: false });
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
