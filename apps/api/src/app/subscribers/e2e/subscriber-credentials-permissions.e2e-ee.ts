import { HttpRequestHeaderKeysEnum } from '@novu/application-generic';
import { ApiServiceLevelEnum, PermissionsEnum, PushProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Subscriber credentials permissions #novu-v2', () => {
  let session: UserSession;
  let previousRbac: string | undefined;

  before(() => {
    previousRbac = process.env.IS_RBAC_ENABLED;
    (process.env as Record<string, string>).IS_RBAC_ENABLED = 'true';
  });

  after(() => {
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
  });

  const credentialsPath = () => `/v1/subscribers/${session.subscriberId}/credentials`;
  const fcmCredentials = (deviceToken: string) => ({
    providerId: PushProviderIdEnum.FCM,
    credentials: { deviceTokens: [deviceToken] },
  });

  function put() {
    return session.testAgent
      .put(credentialsPath())
      .set(HttpRequestHeaderKeysEnum.AUTHORIZATION, session.token)
      .send(fcmCredentials('token-1'));
  }

  function patch() {
    return session.testAgent
      .patch(credentialsPath())
      .set(HttpRequestHeaderKeysEnum.AUTHORIZATION, session.token)
      .send(fcmCredentials('token-2'));
  }

  function remove() {
    return session.testAgent
      .delete(`${credentialsPath()}/${PushProviderIdEnum.FCM}`)
      .set(HttpRequestHeaderKeysEnum.AUTHORIZATION, session.token);
  }

  // Before these routes declared a permission, RBAC required every permission, so only an owner passed.
  it('lets a member with subscriber:write replace, append and delete credentials', async () => {
    await session.updateEETokenClaims({
      org_permissions: [PermissionsEnum.SUBSCRIBER_READ, PermissionsEnum.SUBSCRIBER_WRITE],
    });

    expect((await put()).statusCode).to.equal(200);
    expect((await patch()).statusCode).to.equal(200);
    expect((await remove()).statusCode).to.equal(204);
  });

  it('refuses a member without subscriber:write', async () => {
    await session.updateEETokenClaims({ org_permissions: [PermissionsEnum.SUBSCRIBER_READ] });

    for (const response of [await put(), await patch(), await remove()]) {
      expect(response.statusCode).to.equal(403);
      expect(response.body.message).to.include('Insufficient permissions');
    }
  });
});
