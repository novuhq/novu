import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ApiAuthSchemeEnum } from '@novu/shared';
import { HttpRequestHeaderKeysEnum } from '../../shared/framework/types';

describe('UserAuthGuard', () => {
  let session: UserSession;
  const defaultPath = '/v1/test-auth/user-route';
  const apiInaccessiblePath = '/v1/test-auth/user-api-inaccessible-route';

  let request: (
    authHeader: string,
    path?: string
  ) => Promise<Awaited<ReturnType<typeof UserSession.prototype.testAgent.get>>>;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    request = (authHeader, path = defaultPath) =>
      session.testAgent.get(path).set(HttpRequestHeaderKeysEnum.AUTHORIZATION, authHeader);
  });

  describe('Invalid authentication scheme', () => {
    it('should return 401 when an invalid auth scheme is provided', async () => {
      const response = await request('Invalid invalid_value');
      expect(response.statusCode).to.equal(401);
      expect(response.body.message).to.equal('Invalid authentication scheme: "Invalid"');
    });

    it('should return 401 when no authorization header is provided', async () => {
      const response = await session.testAgent.get(defaultPath).unset(HttpRequestHeaderKeysEnum.AUTHORIZATION);

      expect(response.statusCode).to.equal(401);
      expect(response.body.message).to.equal('Missing authorization header');
    });
  });

  describe('ApiKey authentication scheme', () => {
    it('should return 401 when ApiKey auth scheme is provided without a value', async () => {
      const response = await request(`${ApiAuthSchemeEnum.API_KEY} `);
      expect(response.statusCode).to.equal(401);
      expect(response.body.message).to.equal('Unauthorized');
    });

    it('should return 401 when ApiKey auth scheme is provided with an invalid value', async () => {
      const response = await request(`${ApiAuthSchemeEnum.API_KEY} invalid_key`);
      expect(response.statusCode).to.equal(401);
      expect(response.body.message).to.equal('API Key not found');
    });

    it('should return 401 when ApiKey auth scheme is used for an externally inaccessible API route', async () => {
      const response = await request(`${ApiAuthSchemeEnum.API_KEY} ${session.apiKey}`, apiInaccessiblePath);
      expect(response.statusCode).to.equal(401);
      expect(response.body.message).to.equal('API endpoint not available');
    });

    it('should return 200 when ApiKey auth scheme is provided with a valid value', async () => {
      const response = await request(`${ApiAuthSchemeEnum.API_KEY} ${session.apiKey}`);
      expect(response.statusCode).to.equal(200);
    });
  });

  describe('Bearer authentication scheme', () => {
    it('should return 401 when Bearer auth scheme is provided without a value', async () => {
      const response = await request(`${ApiAuthSchemeEnum.BEARER} `);
      expect(response.statusCode).to.equal(401);
      expect(response.body.message).to.equal('Unauthorized');
    });

    it('should return 401 when Bearer auth scheme is provided with an invalid value', async () => {
      const response = await request(`${ApiAuthSchemeEnum.BEARER} invalid_token`);
      expect(response.statusCode).to.equal(401);
      expect(response.body.message).to.equal('Unauthorized');
    });

    it('should return 200 when Bearer auth scheme is used for an externally inaccessible API route', async () => {
      const response = await request(session.token, apiInaccessiblePath);
      expect(response.statusCode).to.equal(200);
    });

    it('should return 200 when Bearer auth scheme is provided with a valid value', async () => {
      const response = await request(session.token);
      expect(response.statusCode).to.equal(200);
    });
  });
});
