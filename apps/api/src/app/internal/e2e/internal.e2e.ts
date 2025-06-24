import { expect } from 'chai';
import { UserSession } from '@novu/testing';

describe('Internal Controller (GET /v1/internal) - #novu-v2', () => {
  let session: UserSession;

  beforeEach(async () => {
    (process.env as any).INTERNAL_SERVICES_API_KEY = 'test-internal-key';
    session = new UserSession();
    await session.initialize();
  });

  describe('/subscriber-online-state (POST)', () => {
    it('should return 401 when invalid API key is provided', async () => {
      const { body } = await session.testAgent
        .post('/v1/internal/subscriber-online-state')
        .set('Authorization', 'Bearer invalid-key')
        .send({
          subscriberId: 'test-subscriber',
          environmentId: 'test-env',
          isOnline: true,
        })
        .expect(401);

      expect(body.message).to.equal('Invalid API key');
    });

    it('should return 401 when INTERNAL_SERVICES_API_KEY is not configured', async () => {
      // Temporarily remove the env var
      const originalKey = process.env.INTERNAL_SERVICES_API_KEY;
      delete (process.env as any).INTERNAL_SERVICES_API_KEY;

      const { body } = await session.testAgent
        .post('/v1/internal/subscriber-online-state')
        .set('Authorization', 'Bearer test-key')
        .send({
          subscriberId: 'test-subscriber',
          environmentId: 'test-env',
          isOnline: true,
        })
        .expect(401);

      expect(body.message).to.equal('Internal API key not configured');

      // Restore the env var
      if (originalKey) {
        (process.env as any).INTERNAL_SERVICES_API_KEY = originalKey;
      }
    });

    it('should return 200 when valid API key is provided', async () => {
      // Set a test API key
      (process.env as any).INTERNAL_SERVICES_API_KEY = 'test-internal-key';

      const { body } = await session.testAgent
        .post('/v1/internal/subscriber-online-state')
        .set('Authorization', 'Bearer test-internal-key')
        .send({
          subscriberId: session.subscriberId,
          environmentId: session.environment._id,
          isOnline: true,
        })
        .expect(200);

      expect(body.data.success).to.equal(true);
    });
  });
});
