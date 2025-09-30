import { HttpRequestHeaderKeysEnum } from '@novu/application-generic';
import { ApiAuthSchemeEnum, ApiServiceLevelEnum, PermissionsEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

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

    // Set organization service level to business tier for default tests
    await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

    request = (authHeader, path) =>
      session.testAgent.get(path).set(HttpRequestHeaderKeysEnum.AUTHORIZATION, authHeader);
  });

  describe('With Bearer authentication (Business tier)', () => {
    it('should return 200 when user has all required permissions', async () => {
      const response = await request(session.token, permissionRoutePath);
      expect(response.statusCode).to.equal(200);
    });

    it('should return 200 for route with no permission requirement', async () => {
      const response = await request(session.token, noPermissionRoutePath);
      expect(response.statusCode).to.equal(200);
    });

    it('should return 403 when user does not have required permission', async () => {
      const noPermissionsSession = new UserSession();
      await noPermissionsSession.initialize();
      await noPermissionsSession.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

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
      await partialPermissionsSession.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

      await partialPermissionsSession.updateEETokenClaims({
        org_permissions: [PermissionsEnum.INTEGRATION_READ],
      });

      const response = await partialPermissionsSession.testAgent
        .get(permissionRoutePath)
        .set(HttpRequestHeaderKeysEnum.AUTHORIZATION, partialPermissionsSession.token);

      expect(response.statusCode).to.equal(403);
      expect(response.body.message).to.include('Insufficient permissions');
    });

    it('should return 403 for default route when user has insufficient permissions', async () => {
      const somePermissionsSession = new UserSession();
      await somePermissionsSession.initialize();
      await somePermissionsSession.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

      await somePermissionsSession.updateEETokenClaims({
        org_permissions: [PermissionsEnum.WORKFLOW_READ, PermissionsEnum.MESSAGE_READ],
      });

      const response = await somePermissionsSession.testAgent
        .get(allPermissionsRoutePath)
        .set(HttpRequestHeaderKeysEnum.AUTHORIZATION, somePermissionsSession.token);

      expect(response.statusCode).to.equal(403);
    });
  });

  describe('With Bearer authentication (Free and Pro tiers)', () => {
    it('should return 200 for free tier even with insufficient permissions', async () => {
      const freeSession = new UserSession();
      await freeSession.initialize();
      await freeSession.updateOrganizationServiceLevel(ApiServiceLevelEnum.FREE);

      // Setting insufficient permissions that would fail with business tier
      await freeSession.updateEETokenClaims({
        org_permissions: [PermissionsEnum.MESSAGE_READ],
      });

      const response = await freeSession.testAgent
        .get(permissionRoutePath)
        .set(HttpRequestHeaderKeysEnum.AUTHORIZATION, freeSession.token);

      // Should get 200 because permissions guard is disabled for free tier
      expect(response.statusCode).to.equal(200);
    });

    it('should return 200 for pro tier even with insufficient permissions', async () => {
      const proSession = new UserSession();
      await proSession.initialize();
      await proSession.updateOrganizationServiceLevel(ApiServiceLevelEnum.PRO);

      // Setting insufficient permissions that would fail with business tier
      await proSession.updateEETokenClaims({
        org_permissions: [PermissionsEnum.MESSAGE_READ],
      });

      const response = await proSession.testAgent
        .get(permissionRoutePath)
        .set(HttpRequestHeaderKeysEnum.AUTHORIZATION, proSession.token);

      // Should get 200 because permissions guard is disabled for pro tier
      expect(response.statusCode).to.equal(200);
    });
  });

  describe('With API Key authentication', () => {
    it('should return 200 regardless of permissions and service tier', async () => {
      const response = await request(`${ApiAuthSchemeEnum.API_KEY} ${session.apiKey}`, permissionRoutePath);
      expect(response.statusCode).to.equal(200);
    });
  });
});
