import { HttpRequestHeaderKeysEnum } from '@novu/application-generic';
import {
  ALL_PERMISSIONS,
  ApiAuthSchemeEnum,
  ApiServiceLevelEnum,
  INTERNAL_AUTH_AUDIENCE,
  MemberRoleEnum,
  PermissionsEnum,
} from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import sinon from 'sinon';

const SECRET = 'internal-auth-e2e-secret';
const permissionRoutePath = '/v1/test-auth/permission-route';
const nowSeconds = () => Math.floor(Date.now() / 1000);

describe('Internal auth scheme #novu-v2', () => {
  const { EEOrganizationRepository } = require('@novu/ee-auth');

  let session: UserSession;
  let membershipStub: sinon.SinonStub;
  let previousSecret: string | undefined;
  let previousRbac: string | undefined;

  function mintToken(claims: Record<string, unknown> = {}, secret = SECRET) {
    return jwt.sign(
      {
        sub: session.user._id,
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        aud: INTERNAL_AUTH_AUDIENCE,
        iat: nowSeconds(),
        exp: nowSeconds() + 60,
        ...claims,
      },
      secret,
      { algorithm: 'HS256' }
    );
  }

  function request(token: string, headers: Record<string, string> = {}) {
    let req = session.testAgent
      .get(permissionRoutePath)
      .set(HttpRequestHeaderKeysEnum.AUTHORIZATION, `${ApiAuthSchemeEnum.INTERNAL} ${token}`);
    for (const [name, value] of Object.entries(headers)) {
      req = req.set(name, value);
    }

    return req;
  }

  before(() => {
    previousSecret = process.env.NOVU_INTERNAL_AUTH_SECRET;
    previousRbac = process.env.IS_RBAC_ENABLED;
    process.env.NOVU_INTERNAL_AUTH_SECRET = SECRET;
    (process.env as Record<string, string>).IS_RBAC_ENABLED = 'true';
  });

  after(() => {
    process.env.NOVU_INTERNAL_AUTH_SECRET = previousSecret ?? '';
    if (previousRbac === undefined) {
      delete process.env.IS_RBAC_ENABLED;
    } else {
      process.env.IS_RBAC_ENABLED = previousRbac;
    }
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

    // The API resolves membership from Clerk, which the test server cannot reach.
    membershipStub = sinon
      .stub(EEOrganizationRepository.prototype, 'getUserOrganizationMembership')
      .callsFake(async (userId: string, organizationId: string) =>
        userId === session.user._id && organizationId === session.organization._id
          ? {
              role: MemberRoleEnum.OWNER,
              permissions: [PermissionsEnum.INTEGRATION_WRITE, PermissionsEnum.WORKFLOW_WRITE],
            }
          : null
      );
  });

  afterEach(() => {
    membershipStub.restore();
  });

  it('accepts a token for an active member', async () => {
    const response = await request(mintToken());

    expect(response.statusCode).to.equal(200);
  });

  it('applies RBAC with the member’s real permissions', async () => {
    membershipStub.callsFake(async () => ({
      role: MemberRoleEnum.VIEWER,
      permissions: [PermissionsEnum.WORKFLOW_READ],
    }));

    const response = await request(mintToken());

    expect(response.statusCode).to.equal(403);
    expect(response.body.message).to.include('Insufficient permissions');
  });

  it('rejects an expired token', async () => {
    const response = await request(mintToken({ iat: nowSeconds() - 120, exp: nowSeconds() - 60 }));

    expect(response.statusCode).to.equal(401);
  });

  it('rejects a token for another audience', async () => {
    const response = await request(mintToken({ aud: 'novu-dashboard' }));

    expect(response.statusCode).to.equal(401);
  });

  it('rejects a token signed with another secret', async () => {
    const response = await request(mintToken({}, 'not-the-internal-secret'));

    expect(response.statusCode).to.equal(401);
  });

  it('rejects a token that lives longer than 60 seconds', async () => {
    const response = await request(mintToken({ exp: nowSeconds() + 3600 }));

    expect(response.statusCode).to.equal(401);
  });

  it('rejects a request carrying X-Forwarded-For', async () => {
    const response = await request(mintToken(), { 'X-Forwarded-For': '203.0.113.7' });

    expect(response.statusCode).to.equal(401);
  });

  it('rejects a user who is not a member of the organization', async () => {
    membershipStub.callsFake(async () => null);

    const response = await request(mintToken());

    expect(response.statusCode).to.equal(401);
  });

  it('rejects an environment from another organization', async () => {
    const otherSession = new UserSession();
    await otherSession.initialize();

    const response = await request(mintToken({ environmentId: otherSession.environment._id }));

    expect(response.statusCode).to.equal(401);
  });

  describe('API keys', () => {
    const apiKeyRoutes = [
      { method: 'get', label: 'GET /v1/environments/api-keys', path: () => '/v1/environments/api-keys' },
      { method: 'post', label: 'POST /v1/environments/api-keys', path: () => '/v1/environments/api-keys' },
      {
        method: 'post',
        label: 'POST /v1/environments/api-keys/regenerate',
        path: () => '/v1/environments/api-keys/regenerate',
      },
      {
        method: 'delete',
        label: 'DELETE /v1/environments/api-keys/:hash',
        path: () => `/v1/environments/api-keys/${session.environment.apiKeys[0].hash}`,
      },
      // Hands out a code that is traded for the environment's decrypted key.
      { method: 'post', label: 'POST /v1/human/agent/connect-codes', path: () => '/v1/human/agent/connect-codes' },
    ] as const;

    function sendInternal(route: (typeof apiKeyRoutes)[number]) {
      return session.testAgent[route.method](route.path())
        .set(HttpRequestHeaderKeysEnum.AUTHORIZATION, `${ApiAuthSchemeEnum.INTERNAL} ${mintToken()}`)
        .send({});
    }

    beforeEach(() => {
      // An owner holds every API key permission, so only the scheme can refuse the call.
      membershipStub.callsFake(async () => ({ role: MemberRoleEnum.OWNER, permissions: ALL_PERMISSIONS }));
    });

    for (const route of apiKeyRoutes) {
      it(`refuses ${route.label} even for an owner and leaves the key working`, async () => {
        const response = await sendInternal(route);

        expect(response.statusCode).to.equal(403);
        expect(response.body.message).to.include('Internal token');

        const keyCheck = await session.testAgent
          .get('/v1/environments/me')
          .set(HttpRequestHeaderKeysEnum.AUTHORIZATION, `${ApiAuthSchemeEnum.API_KEY} ${session.apiKey}`);
        expect(keyCheck.statusCode).to.equal(200);
      });
    }
  });

  it('rejects the scheme when NOVU_INTERNAL_AUTH_SECRET is empty', async () => {
    const token = mintToken();
    process.env.NOVU_INTERNAL_AUTH_SECRET = '';

    try {
      const response = await request(token);

      expect(response.statusCode).to.equal(401);
    } finally {
      process.env.NOVU_INTERNAL_AUTH_SECRET = SECRET;
    }
  });
});
