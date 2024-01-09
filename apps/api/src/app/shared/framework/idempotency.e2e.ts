import { UserSession } from '@novu/testing';
import { CacheService } from '@novu/application-generic';
import { expect } from 'chai';
import { HttpResponseHeaderKeysEnum } from './types';
import { DOCS_LINK } from './idempotency.interceptor';

process.env.LAUNCH_DARKLY_SDK_KEY = ''; // disable Launch Darkly to allow test to define FF state

describe('Idempotency Test', async () => {
  let session: UserSession;
  const path = '/v1/testing/idempotency';
  let cacheService: CacheService | null = null;

  describe('when enabled', () => {
    before(async () => {
      session = new UserSession();
      await session.initialize();
      cacheService = session.testServer?.getService(CacheService);
      process.env.IS_API_IDEMPOTENCY_ENABLED = 'true';
    });

    it('should return cached same response for duplicate requests', async () => {
      const key = `1`;
      const { body, headers } = await session.testAgent
        .post(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({ data: 201 })
        .expect(201);
      const { body: bodyDupe, headers: headerDupe } = await session.testAgent
        .post(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({ data: 201 })
        .expect(201);
      expect(typeof body.data.number === 'number').to.be.true;
      expect(body.data.number).to.equal(bodyDupe.data.number);
      expect(headers[HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY.toLowerCase()]).to.eq(key);
      expect(headerDupe[HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY.toLowerCase()]).to.eq(key);
      expect(headerDupe[HttpResponseHeaderKeysEnum.IDEMPOTENCY_REPLAY.toLowerCase()]).to.eq('true');
    });
    it('should return cached and use correct cache key when apiKey is used', async () => {
      const key = `2`;
      const { body, headers } = await session.testAgent
        .post(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({ data: 201 })
        .expect(201);
      const cacheKey = `test-${session.organization._id}-${key}`;
      session.testServer?.getHttpServer();
      // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      const cacheVal = JSON.stringify(JSON.parse(await cacheService?.get(cacheKey)!).data);
      expect(JSON.stringify(body)).to.eq(cacheVal);
      const { body: bodyDupe, headers: headerDupe } = await session.testAgent
        .post(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({ data: 201 })
        .expect(201);
      expect(typeof body.data.number === 'number').to.be.true;
      expect(body.data.number).to.equal(bodyDupe.data.number);
      expect(headers[HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY.toLowerCase()]).to.eq(key);
      expect(headerDupe[HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY.toLowerCase()]).to.eq(key);
      expect(headerDupe[HttpResponseHeaderKeysEnum.IDEMPOTENCY_REPLAY.toLowerCase()]).to.eq('true');
    });
    it('should return cached and use correct cache key when authToken and apiKey combination is used', async () => {
      const key = `3`;
      const { body, headers } = await session.testAgent
        .post(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .set('authorization', session.token)
        .send({ data: 201 })
        .expect(201);
      const cacheKey = `test-${session.organization._id}-${key}`;
      session.testServer?.getHttpServer();
      // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      const cacheVal = JSON.stringify(JSON.parse(await cacheService?.get(cacheKey)!).data);
      expect(JSON.stringify(body)).to.eq(cacheVal);
      const { body: bodyDupe, headers: headerDupe } = await session.testAgent
        .post(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({ data: 201 })
        .expect(201);
      expect(typeof body.data.number === 'number').to.be.true;
      expect(body.data.number).to.equal(bodyDupe.data.number);
      expect(headers[HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY.toLowerCase()]).to.eq(key);
      expect(headerDupe[HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY.toLowerCase()]).to.eq(key);
      expect(headerDupe[HttpResponseHeaderKeysEnum.IDEMPOTENCY_REPLAY.toLowerCase()]).to.eq('true');
    });
    it('should return conflict when concurrent requests are made', async () => {
      const key = `4`;
      const [{ headers, body, status }, { headers: headerDupe, body: bodyDupe, status: statusDupe }] =
        await Promise.all([
          session.testAgent.post(path).set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key).send({ data: 250 }),
          session.testAgent.post(path).set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key).send({ data: 250 }),
        ]);
      const oneSuccess = status === 201 || statusDupe === 201;
      const oneConflict = status === 409 || statusDupe === 409;
      const conflictBody = status === 201 ? bodyDupe : body;
      const retryHeader =
        headers[HttpResponseHeaderKeysEnum.RETRY_AFTER.toLowerCase()] ||
        headerDupe[HttpResponseHeaderKeysEnum.RETRY_AFTER.toLowerCase()];
      expect(oneSuccess).to.be.true;
      expect(oneConflict).to.be.true;
      expect(headers[HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY.toLowerCase()]).to.eq(key);
      expect(headerDupe[HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY.toLowerCase()]).to.eq(key);
      expect(headerDupe[HttpResponseHeaderKeysEnum.LINK.toLowerCase()]).to.eq(DOCS_LINK);
      expect(retryHeader).to.eq(`1`);
      expect(JSON.stringify(conflictBody)).to.eq(
        JSON.stringify({
          message: `Request with key "${key}" is currently being processed. Please retry after 1 second`,
          error: 'Conflict',
          statusCode: 409,
        })
      );
    });
    it('should return conflict when different body is sent for same key', async () => {
      const key = '5';
      const { headers, body, status } = await session.testAgent
        .post(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({ data: 250 });
      const {
        headers: headerDupe,
        body: bodyDupe,
        status: statusDupe,
      } = await session.testAgent.post(path).set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key).send({ data: 251 });

      const oneSuccess = status === 201 || statusDupe === 201;
      const oneConflict = status === 422 || statusDupe === 422;
      const conflictBody = status === 201 ? bodyDupe : body;
      expect(oneSuccess).to.be.true;
      expect(oneConflict).to.be.true;
      expect(headers[HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY.toLowerCase()]).to.eq(key);
      expect(headerDupe[HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY.toLowerCase()]).to.eq(key);
      expect(headerDupe[HttpResponseHeaderKeysEnum.LINK.toLowerCase()]).to.eq(DOCS_LINK);
      expect(JSON.stringify(conflictBody)).to.eq(
        JSON.stringify({
          message: `Request with key "${key}" is being reused for a different body`,
          error: 'Unprocessable Entity',
          statusCode: 422,
        })
      );
    });
    it('should return non cached response for unique requests', async () => {
      const key = '6';
      const key1 = '7';
      const { body, headers } = await session.testAgent
        .post(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({ data: 201 })
        .expect(201);

      const { body: bodyDupe, headers: headerDupe } = await session.testAgent
        .post(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key1)
        .send({ data: 201 })
        .expect(201);
      expect(typeof body.data.number === 'number').to.be.true;
      expect(typeof bodyDupe.data.number === 'number').to.be.true;
      expect(body.data.number).not.to.equal(bodyDupe.data.number);
      expect(headers[HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY.toLowerCase()]).to.eq(key);
      expect(headerDupe[HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY.toLowerCase()]).to.eq(key1);
    });
    it('should return non cached response for GET requests', async () => {
      const key = '8';
      const { body, headers } = await session.testAgent
        .get(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({})
        .expect(200);

      const { body: bodyDupe } = await session.testAgent
        .get(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({})
        .expect(200);
      expect(typeof body.data.number === 'number').to.be.true;
      expect(typeof bodyDupe.data.number === 'number').to.be.true;
      expect(body.data.number).not.to.equal(bodyDupe.data.number);
      expect(headers[HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY.toLowerCase()]).to.eq(undefined);
    });
    it('should return cached error response for duplicate requests', async () => {
      const key = '9';
      const { body, headers } = await session.testAgent
        .post(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({ data: 422 })
        .expect(422);

      const { body: bodyDupe, headers: headerDupe } = await session.testAgent
        .post(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({ data: 422 })
        .expect(422);
      expect(JSON.stringify(body)).to.equal(JSON.stringify(bodyDupe));

      expect(headers[HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY.toLowerCase()]).to.eq(key);
      expect(headerDupe[HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY.toLowerCase()]).to.eq(key);
    });
    it('should return 400 when key bigger than allowed limit', async () => {
      const key = Array.from({ length: 256 })
        .fill(0)
        .map((i) => i)
        .join('');
      const { body } = await session.testAgent
        .post(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({ data: 250 })
        .expect(400);
      expect(JSON.stringify(body)).to.eq(
        JSON.stringify({
          message: `idempotencyKey "${key}" has exceeded the maximum allowed length of 255 characters`,
          error: 'Bad Request',
          statusCode: 400,
        })
      );
    });

    describe('Allowed Authentication Security Schemes', () => {
      it('should set Idempotency-Key header when ApiKey security scheme is used to authenticate', async () => {
        const key = '10';
        const { headers } = await session.testAgent
          .post(path)
          .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
          .set('authorization', `ApiKey ${session.apiKey}`)
          .send({ data: 201 })
          .expect(201);
        expect(headers[HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY.toLowerCase()]).to.exist;
      });

      it('should set rate limit headers when a Bearer security scheme is used to authenticate', async () => {
        const key = '10';
        const { headers } = await session.testAgent
          .post(path)
          .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
          .set('authorization', session.token)
          .send({ data: 201 })
          .expect(201);
        expect(headers[HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY.toLowerCase()]).to.exist;
      });

      it('should NOT set rate limit headers when NO authorization header is present', async () => {
        const key = '10';
        const { headers } = await session.testAgent
          .post(path)
          .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
          .set('authorization', '')
          .send({ data: 201 })
          .expect(401);
        expect(headers[HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY.toLowerCase()]).not.to.exist;
      });
    });
  });

  describe('when disabled', () => {
    before(async () => {
      session = new UserSession();
      await session.initialize();
      process.env.IS_API_IDEMPOTENCY_ENABLED = 'false';
    });

    it('should not return cached same response for duplicate requests', async () => {
      const key = '10';
      const { body } = await session.testAgent
        .post(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({ data: 201 })
        .expect(201);

      const { body: bodyDupe } = await session.testAgent
        .post(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({ data: 201 })
        .expect(201);
      expect(typeof body.data.number === 'number').to.be.true;
      expect(body.data.number).not.to.equal(bodyDupe.data.number);
    });
    it('should return non cached response for unique requests', async () => {
      const key = '11';
      const key1 = '12';
      const { body } = await session.testAgent
        .post(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({ data: 201 })
        .expect(201);

      const { body: bodyDupe } = await session.testAgent
        .post(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key1)
        .send({ data: 201 })
        .expect(201);
      expect(typeof body.data.number === 'number').to.be.true;
      expect(typeof bodyDupe.data.number === 'number').to.be.true;
      expect(body.data.number).not.to.equal(bodyDupe.data.number);
    });
    it('should return non cached response for GET requests', async () => {
      const key = '13';
      const { body } = await session.testAgent
        .get(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .send({})
        .expect(200);

      const { body: bodyDupe } = await session.testAgent
        .get(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({})
        .expect(200);
      expect(typeof body.data.number === 'number').to.be.true;
      expect(typeof bodyDupe.data.number === 'number').to.be.true;
      expect(body.data.number).not.to.equal(bodyDupe.data.number);
    });
    it('should not return cached error response for duplicate requests', async () => {
      const key = '14';
      const { body } = await session.testAgent
        .post(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({ data: '500' })
        .expect(500);

      const { body: bodyDupe } = await session.testAgent
        .post(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({ data: '500' })
        .expect(500);
      expect(JSON.stringify(body)).not.to.equal(JSON.stringify(bodyDupe));
    });
  });
});
