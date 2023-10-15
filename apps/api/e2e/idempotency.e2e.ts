import { UserSession } from '@novu/testing';
import { expect } from 'chai';
describe('Idempotency Test', async () => {
  let session: UserSession;
  const path = '/v1/testing/idempotency';
  const HEADER_KEYS = {
    IDEMPOTENCY: 'idempotency-key',
    RETRY_AFTER: 'retry-after',
    IDEMPOTENCY_CONFLICT: 'x-idempotency-conflict',
  };

  describe('when enabled', () => {
    before(async () => {
      session = new UserSession();
      await session.initialize();
      process.env.API_IDEMPOTENCY_ENABLED = 'true';
    });

    it('should return cached same response for duplicate requests', async () => {
      const key = Math.random().toString();
      const { body, headers } = await session.testAgent
        .post(path)
        .set(HEADER_KEYS.IDEMPOTENCY, key)
        .send({ data: 201 })
        .expect(201);
      const { body: bodyDupe, headers: headerDupe } = await session.testAgent
        .post(path)
        .set(HEADER_KEYS.IDEMPOTENCY, key)
        .send({ data: 201 })
        .expect(201);
      expect(typeof body.data.number === 'number').to.be.true;
      expect(body.data.number).to.equal(bodyDupe.data.number);
      expect(headers[HEADER_KEYS.IDEMPOTENCY]).to.eq(key);
      expect(headerDupe[HEADER_KEYS.IDEMPOTENCY]).to.eq(key);
    });
    it('should return conflict when concurrent requests are made', async () => {
      const key = Math.random().toString();
      const [{ headers, body, status }, { headers: headerDupe, body: bodyDupe, status: statusDupe }] =
        await Promise.all([
          session.testAgent.post(path).set(HEADER_KEYS.IDEMPOTENCY, key).send({ data: 250 }),
          session.testAgent.post(path).set(HEADER_KEYS.IDEMPOTENCY, key).send({ data: 250 }),
        ]);
      const oneSuccess = status === 201 || statusDupe === 201;
      const oneConflict = status === 429 || statusDupe === 429;
      const conflictBody = status === 201 ? bodyDupe : body;
      const retryHeader = headers[HEADER_KEYS.RETRY_AFTER] || headerDupe[HEADER_KEYS.RETRY_AFTER];
      const conflictHeader = headers[HEADER_KEYS.IDEMPOTENCY_CONFLICT] || headerDupe[HEADER_KEYS.IDEMPOTENCY_CONFLICT];
      expect(oneSuccess).to.be.true;
      expect(oneConflict).to.be.true;
      expect(headers[HEADER_KEYS.IDEMPOTENCY]).to.eq(key);
      expect(headerDupe[HEADER_KEYS.IDEMPOTENCY]).to.eq(key);
      expect(retryHeader).to.eq(`1`);
      expect(conflictHeader).to.eq('IDEMPOTENCY_REQUEST_PROCESSING');
      expect(JSON.stringify(conflictBody)).to.eq(
        JSON.stringify({
          error: 'IDEMPOTENCY_REQUEST_PROCESSING',
          message: `request ${key} is currently being processed. Please retry after 1 second`,
        })
      );
    });
    it('should return conflict when different body is sent for same key', async () => {
      const key = Math.random().toString();
      const { headers, body, status } = await session.testAgent
        .post(path)
        .set(HEADER_KEYS.IDEMPOTENCY, key)
        .send({ data: 250 });
      const {
        headers: headerDupe,
        body: bodyDupe,
        status: statusDupe,
      } = await session.testAgent.post(path).set(HEADER_KEYS.IDEMPOTENCY, key).send({ data: 251 });

      const oneSuccess = status === 201 || statusDupe === 201;
      const oneConflict = status === 409 || statusDupe === 409;
      const conflictBody = status === 201 ? bodyDupe : body;
      const conflictHeader = headers[HEADER_KEYS.IDEMPOTENCY_CONFLICT] || headerDupe[HEADER_KEYS.IDEMPOTENCY_CONFLICT];
      expect(oneSuccess).to.be.true;
      expect(oneConflict).to.be.true;
      expect(headers[HEADER_KEYS.IDEMPOTENCY]).to.eq(key);
      expect(headerDupe[HEADER_KEYS.IDEMPOTENCY]).to.eq(key);
      expect(conflictHeader).to.eq('IDEMPOTENCY_BODY_CONFLICT');
      expect(JSON.stringify(conflictBody)).to.eq(
        JSON.stringify({
          error: 'IDEMPOTENCY_BODY_CONFLICT',
          message: `request ${key} is being reused for difefrent body`,
        })
      );
    });
    it('should return non cached response for unique requests', async () => {
      const key = Math.random().toString();
      const key1 = Math.random().toString();
      const { body, headers } = await session.testAgent
        .post(path)
        .set(HEADER_KEYS.IDEMPOTENCY, key)
        .send({ data: 201 })
        .expect(201);

      const { body: bodyDupe, headers: headerDupe } = await session.testAgent
        .post(path)
        .set(HEADER_KEYS.IDEMPOTENCY, key1)
        .send({ data: 201 })
        .expect(201);
      expect(typeof body.data.number === 'number').to.be.true;
      expect(typeof bodyDupe.data.number === 'number').to.be.true;
      expect(body.data.number).not.to.equal(bodyDupe.data.number);
      expect(headers[HEADER_KEYS.IDEMPOTENCY]).to.eq(key);
      expect(headerDupe[HEADER_KEYS.IDEMPOTENCY]).to.eq(key1);
    });
    it('should return non cached response for GET requests', async () => {
      const key = Math.random().toString();
      const { body, headers } = await session.testAgent
        .get(path)
        .set(HEADER_KEYS.IDEMPOTENCY, key)
        .send({})
        .expect(200);

      const { body: bodyDupe } = await session.testAgent
        .get(path)
        .set(HEADER_KEYS.IDEMPOTENCY, key)
        .send({})
        .expect(200);
      expect(typeof body.data.number === 'number').to.be.true;
      expect(typeof bodyDupe.data.number === 'number').to.be.true;
      expect(body.data.number).not.to.equal(bodyDupe.data.number);
      expect(headers[HEADER_KEYS.IDEMPOTENCY]).to.eq(undefined);
    });
    it('should return cached error response for duplicate requests', async () => {
      const key = Math.random().toString();
      const { body, headers } = await session.testAgent
        .post(path)
        .set(HEADER_KEYS.IDEMPOTENCY, key)
        .send({ data: 422 })
        .expect(422);

      const { body: bodyDupe, headers: headerDupe } = await session.testAgent
        .post(path)
        .set(HEADER_KEYS.IDEMPOTENCY, key)
        .send({ data: 422 })
        .expect(422);
      expect(JSON.stringify(body)).to.equal(JSON.stringify(bodyDupe));

      expect(headers[HEADER_KEYS.IDEMPOTENCY]).to.eq(key);
      expect(headerDupe[HEADER_KEYS.IDEMPOTENCY]).to.eq(key);
    });
  });

  describe('when disabled', () => {
    before(async () => {
      session = new UserSession();
      await session.initialize();
      process.env.API_IDEMPOTENCY_ENABLED = 'false';
    });

    it('should not return cached same response for duplicate requests', async () => {
      const key = Math.random().toString();
      const { body } = await session.testAgent
        .post(path)
        .set(HEADER_KEYS.IDEMPOTENCY, key)
        .send({ data: 201 })
        .expect(201);

      const { body: bodyDupe } = await session.testAgent
        .post(path)
        .set(HEADER_KEYS.IDEMPOTENCY, key)
        .send({ data: 201 })
        .expect(201);
      expect(typeof body.data.number === 'number').to.be.true;
      expect(body.data.number).not.to.equal(bodyDupe.data.number);
    });
    it('should return non cached response for unique requests', async () => {
      const key = Math.random().toString();
      const key1 = Math.random().toString();
      const { body } = await session.testAgent
        .post(path)
        .set(HEADER_KEYS.IDEMPOTENCY, key)
        .send({ data: 201 })
        .expect(201);

      const { body: bodyDupe } = await session.testAgent
        .post(path)
        .set(HEADER_KEYS.IDEMPOTENCY, key1)
        .send({ data: 201 })
        .expect(201);
      expect(typeof body.data.number === 'number').to.be.true;
      expect(typeof bodyDupe.data.number === 'number').to.be.true;
      expect(body.data.number).not.to.equal(bodyDupe.data.number);
    });
    it('should return non cached response for GET requests', async () => {
      const key = Math.random().toString();
      const { body } = await session.testAgent.get(path).set(HEADER_KEYS.IDEMPOTENCY, key).send({}).expect(200);

      const { body: bodyDupe } = await session.testAgent
        .get(path)
        .set(HEADER_KEYS.IDEMPOTENCY, key)
        .send({})
        .expect(200);
      expect(typeof body.data.number === 'number').to.be.true;
      expect(typeof bodyDupe.data.number === 'number').to.be.true;
      expect(body.data.number).not.to.equal(bodyDupe.data.number);
    });
    it('should not return cached error response for duplicate requests', async () => {
      const key = Math.random().toString();
      const { body } = await session.testAgent
        .post(path)
        .set(HEADER_KEYS.IDEMPOTENCY, key)
        .send({ data: 500 })
        .expect(500);

      const { body: bodyDupe } = await session.testAgent
        .post(path)
        .set(HEADER_KEYS.IDEMPOTENCY, key)
        .send({ data: 500 })
        .expect(500);
      expect(JSON.stringify(body)).not.to.equal(JSON.stringify(bodyDupe));
    });
  });
});
