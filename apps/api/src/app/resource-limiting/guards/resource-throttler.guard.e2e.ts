import { UserSession } from '@novu/testing';
import { expect } from 'chai';

process.env.LAUNCH_DARKLY_SDK_KEY = ''; // disable Launch Darkly to allow test to define FF state

describe('Resource Limiting', () => {
  let session: UserSession;
  const pathDefault = '/v1/testing/resource-limiting-default';
  const pathEvent = '/v1/testing/resource-limiting-events';
  let request: (
    path: string,
    authHeader?: string
  ) => Promise<Awaited<ReturnType<typeof UserSession.prototype.testAgent.get>>>;

  describe('IS_DOCKER_HOSTED is true', () => {
    beforeEach(async () => {
      process.env.IS_DOCKER_HOSTED = 'true';
      session = new UserSession();
      await session.initialize();

      request = (path: string) => session.testAgent.get(path);
    });

    it('should not block the request', async () => {
      const response = await request(pathEvent);

      expect(response.status).to.equal(200);
    });
  });

  describe('IS_DOCKER_HOSTED is false', () => {
    beforeEach(async () => {
      process.env.IS_DOCKER_HOSTED = 'false';
      session = new UserSession();
      await session.initialize();

      request = (path: string, authHeader = `ApiKey ${session.apiKey}`) =>
        session.testAgent.get(path).set('authorization', authHeader);
    });

    describe('Event resource', () => {
      it('should block the request when the Feature Flag is enabled', async () => {
        process.env.IS_EVENT_RESOURCE_LIMITING_ENABLED = 'true';
        const response = await request(pathEvent);

        expect(response.status).to.equal(402);
      });

      it('should NOT block the request when the Feature Flag is disabled', async () => {
        process.env.IS_EVENT_RESOURCE_LIMITING_ENABLED = 'false';
        const response = await request(pathEvent);

        expect(response.status).to.equal(200);
      });
    });

    describe('Default resources (no decorator)', () => {
      it('should handle the request when the Feature Flag is enabled', async () => {
        process.env.IS_EVENT_RESOURCE_LIMITING_ENABLED = 'true';
        const response = await request(pathDefault);

        expect(response.status).to.equal(200);
      });

      it('should handle the request when the Feature Flag is disabled', async () => {
        process.env.IS_EVENT_RESOURCE_LIMITING_ENABLED = 'false';
        const response = await request(pathDefault);

        expect(response.status).to.equal(200);
      });
    });
  });
});
