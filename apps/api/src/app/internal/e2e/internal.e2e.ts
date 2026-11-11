import { SubscriberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

const subscriberRepository = new SubscriberRepository();

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

    it('should persist the online state for the subscriber in the token', async () => {
      const subscriberQuery = { subscriberId: session.subscriberId, _environmentId: session.environment._id };

      await session.testAgent
        .post('/v1/internal/subscriber-online-state')
        .set('Authorization', `Bearer ${session.subscriberToken}`)
        .send({ isOnline: true })
        .expect(200);

      const online = await subscriberRepository.findOne(subscriberQuery);
      expect(online?.isOnline).to.equal(true);
      expect(online?.lastOnlineAt).to.be.a('string');

      await session.testAgent
        .post('/v1/internal/subscriber-online-state')
        .set('Authorization', `Bearer ${session.subscriberToken}`)
        .send({ isOnline: false })
        .expect(200);

      const offline = await subscriberRepository.findOne(subscriberQuery);
      expect(offline?.isOnline).to.equal(false);
    });

    it('should succeed without writing anything when the subscriber was deleted', async () => {
      const subscriberQuery = { subscriberId: session.subscriberId, _environmentId: session.environment._id };
      await subscriberRepository.delete(subscriberQuery);

      await session.testAgent
        .post('/v1/internal/subscriber-online-state')
        .set('Authorization', `Bearer ${session.subscriberToken}`)
        .send({ isOnline: true })
        .expect(200);

      const subscriber = await subscriberRepository.findOne(subscriberQuery);
      expect(subscriber).to.equal(null);
    });
  });
});
