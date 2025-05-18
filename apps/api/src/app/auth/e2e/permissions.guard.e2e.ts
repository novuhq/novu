import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ApiAuthSchemeEnum, PermissionsEnum } from '@novu/shared';
import { HttpRequestHeaderKeysEnum } from '@novu/application-generic';

describe('PermissionsGuard #novu-v2', () => {
  before(() => {
    // @ts-ignore - Setting environment variables
    process.env.IS_RBAC_ENABLED = 'true';
  });

  let session: UserSession;
  const permissionRoutePath = '/v1/test-auth/permission-route';
  const noPermissionRoutePath = '/v1/test-auth/no-permission-route';
  const allPermissionsRoutePath = '/v1/test-auth/all-permissions-route';

  let request: (
    authHeader: string,
    path: string
  ) => Promise<Awaited<ReturnType<typeof UserSession.prototype.testAgent.get>>>;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    request = (authHeader, path) =>
      session.testAgent.get(path).set(HttpRequestHeaderKeysEnum.AUTHORIZATION, authHeader);
  });

  it('should allow access with bearer token with all permissions', async () => {
    const response = await request(session.token, permissionRoutePath);
    expect(response.statusCode).to.equal(200);
  });

  it('should allow access with API key regardless of permissions', async () => {
    const response = await request(`${ApiAuthSchemeEnum.API_KEY} ${session.apiKey}`, permissionRoutePath);
    expect(response.statusCode).to.equal(200);
  });

  it('should allow access to no-permission routes', async () => {
    const response = await request(session.token, noPermissionRoutePath);
    expect(response.statusCode).to.equal(200);
  });

  describe('With Bearer authentication', () => {
    it('should return 403 when user does not have required permission', async () => {
      const noPermissionsSession = new UserSession();
      await noPermissionsSession.initialize();

      await noPermissionsSession.updateEETokenClaims({
        org_permissions: [
          PermissionsEnum.MESSAGE_READ,
          PermissionsEnum.SUBSCRIBER_READ,
          PermissionsEnum.NOTIFICATION_READ,
        ],
      });

      const response = await noPermissionsSession.testAgent
        .get(permissionRoutePath)
        .set(HttpRequestHeaderKeysEnum.AUTHORIZATION, noPermissionsSession.token);

      expect(response.statusCode).to.equal(403);
      expect(response.body.message).to.include('Insufficient permissions');
    });

    it('should return 403 when user has only one of the required permissions', async () => {
      const partialPermissionsSession = new UserSession();
      await partialPermissionsSession.initialize();

      await partialPermissionsSession.updateEETokenClaims({
        org_permissions: [PermissionsEnum.INTEGRATION_CREATE],
      });

      const response = await partialPermissionsSession.testAgent
        .get(permissionRoutePath)
        .set(HttpRequestHeaderKeysEnum.AUTHORIZATION, partialPermissionsSession.token);

      expect(response.statusCode).to.equal(403);
      expect(response.body.message).to.include('Insufficient permissions');
    });

    it('should return 200 when user has all required permissions', async () => {
      const allPermissionsSession = new UserSession();
      await allPermissionsSession.initialize();

      await allPermissionsSession.updateEETokenClaims({
        org_permissions: [PermissionsEnum.INTEGRATION_CREATE, PermissionsEnum.WORKFLOW_CREATE],
      });

      const response = await allPermissionsSession.testAgent
        .get(permissionRoutePath)
        .set(HttpRequestHeaderKeysEnum.AUTHORIZATION, allPermissionsSession.token);

      expect(response.statusCode).to.equal(200);
    });

    it('should return 403 for default route when user has insufficient permissions', async () => {
      const somePermissionsSession = new UserSession();
      await somePermissionsSession.initialize();

      await somePermissionsSession.updateEETokenClaims({
        org_permissions: [PermissionsEnum.WORKFLOW_READ, PermissionsEnum.MESSAGE_READ],
      });

      const response = await somePermissionsSession.testAgent
        .get(allPermissionsRoutePath)
        .set(HttpRequestHeaderKeysEnum.AUTHORIZATION, somePermissionsSession.token);

      expect(response.statusCode).to.equal(403);
    });

    it('should return 200 for route with no permission requirement', async () => {
      const noPermissionsSession = new UserSession();
      await noPermissionsSession.initialize();

      await noPermissionsSession.updateEETokenClaims({
        org_permissions: [],
      });

      const response = await noPermissionsSession.testAgent
        .get(noPermissionRoutePath)
        .set(HttpRequestHeaderKeysEnum.AUTHORIZATION, noPermissionsSession.token);

      expect(response.statusCode).to.equal(200);
    });
  });

  describe('With API Key authentication', () => {
    it('should return 200 even when user does not have required permission', async () => {
      const response = await request(`${ApiAuthSchemeEnum.API_KEY} ${session.apiKey}`, permissionRoutePath);
      expect(response.statusCode).to.equal(200);
    });
  });
});
