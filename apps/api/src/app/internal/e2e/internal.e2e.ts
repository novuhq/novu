import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Internal Controller (GET /v1/internal) - #novu-v2', () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  describe('/subscriber-online-state (POST)', () => {
    it('should return 401 when invalid JWT token is provided', async () => {
      const { body } = await session.testAgent
        .post('/v1/internal/subscriber-online-state')
        .set('Authorization', 'Bearer invalid-jwt-token')
        .send({
          isOnline: true,
        })
        .expect(401);

      expect(body.message).to.contain('Unauthorized');
    });

    it('should return 401 when no JWT token is provided', async () => {
      const { body } = await session.testAgent
        .post('/v1/internal/subscriber-online-state')
        .send({
          isOnline: true,
        })
        .expect(401);

      expect(body.message).to.contain('Unauthorized');
    });

    it('should return 401 when JWT token has wrong audience', async () => {
      // Use the regular user token instead of subscriber token (wrong audience)
      const { body } = await session.testAgent
        .post('/v1/internal/subscriber-online-state')
        .set('Authorization', `Bearer ${session.token}`)
        .send({
          isOnline: true,
        })
        .expect(401);

      expect(body.message).to.contain('Unauthorized');
    });

    it('should return 200 when valid subscriber JWT token is provided', async () => {
      const { body } = await session.testAgent
        .post('/v1/internal/subscriber-online-state')
        .set('Authorization', `Bearer ${session.subscriberToken}`)
        .send({
          isOnline: true,
        })
        .expect(200);

      expect(body.data.success).to.equal(true);
      expect(body.data.message).to.equal('Subscriber online state updated successfully');
    });

    it('should update subscriber to offline status', async () => {
      const { body } = await session.testAgent
        .post('/v1/internal/subscriber-online-state')
        .set('Authorization', `Bearer ${session.subscriberToken}`)
        .send({
          isOnline: false,
        })
        .expect(200);

      expect(body.data.success).to.equal(true);
      expect(body.data.message).to.equal('Subscriber online state updated successfully');
    });
  });
});
