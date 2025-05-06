import { UserSession } from '@novu/testing';
import { CacheService, HttpResponseHeaderKeysEnum } from '@novu/application-generic';
import { expect } from 'chai';
import { expectSdkExceptionGeneric } from '../helpers/e2e/sdk/e2e-sdk.helper';
import {
  IdempotenceTestingResponse,
  IdempotencyBehaviorEnum,
  IdempotencyTestingDto,
} from '../../testing/dtos/idempotency.dto';

const DOCS_LINK = 'https://docs.novu.co/additional-resources/idempotency';
// @ts-ignore
process.env.LAUNCH_DARKLY_SDK_KEY = ''; // disable Launch Darkly to allow test to define FF state

const idempotancyKey = HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY.toLowerCase();
const retryAfterHeaderKey = HttpResponseHeaderKeysEnum.RETRY_AFTER.toLowerCase();
const IDEMPOTENCE_IMMEDIATE_EXCEPTION = {
  expectedBehavior: IdempotencyBehaviorEnum.IMMEDIATE_EXCEPTION,
};
const IDEMPOTENCE_IMMEDIATE_RESPONSE = {
  expectedBehavior: IdempotencyBehaviorEnum.IMMEDIATE_RESPONSE,
};
const IDEMPOTENCE_DELAYED_RESPONSE = {
  expectedBehavior: IdempotencyBehaviorEnum.DELAYED_RESPONSE,
};
const idempotancyReplayKey = HttpResponseHeaderKeysEnum.IDEMPOTENCY_REPLAY.toLowerCase();

describe('Idempotency Test', async () => {
  let session: UserSession;
  const path = '/v1/health-check/test-idempotency';
  let cacheService: CacheService | null = null;

  async function testIdempotencyPost(
    idempotencyTestingDto: IdempotencyTestingDto,
    key: string
  ): Promise<{ body: IdempotenceTestingResponse; headers: Record<string, string> }> {
    const { body, headers } = await session.testAgent
      .post(path)
      .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
      .set('authorization', `ApiKey ${session.apiKey}`)
      .send(idempotencyTestingDto);

    return { body: body.data, headers };
  }
  async function testIdempotencyGet(
    key: string
  ): Promise<{ body: IdempotenceTestingResponse; headers: Record<string, string> }> {
    const { body, headers } = await session.testAgent
      .get(path)
      .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
      .set('authorization', `ApiKey ${session.apiKey}`)
      .send();

    return { body: body.data, headers };
  }

  before(async () => {
    session = new UserSession();
    await session.initialize();
    cacheService = session.testServer?.getService(CacheService);
    process.env.IS_API_IDEMPOTENCY_ENABLED = 'true';
  });

  it('should return cached same response for duplicate requests', async () => {
    const key = `IdempotencyKey1`;
    const res1 = await testIdempotencyPost(IDEMPOTENCE_IMMEDIATE_RESPONSE, key);
    const res2 = await testIdempotencyPost(IDEMPOTENCE_IMMEDIATE_RESPONSE, key);
    expect(res1.body.number).to.equal(res2.body.number);
    expect(res1.headers[idempotancyKey]).to.eq(key);
    expect(res2.headers[idempotancyKey]).to.eq(key);
    expect(res2.headers[idempotancyReplayKey]).to.eq('true');
  });
  it('should return cached and use correct cache key when apiKey is used', async () => {
    const key = `IdempotencyKey2`;
    const res1 = await testIdempotencyPost(IDEMPOTENCE_IMMEDIATE_RESPONSE, key);
    const cacheKey = `test-${session.organization._id}-${key}`;
    session.testServer?.getHttpServer();

    const cacheVal = JSON.stringify(JSON.parse(await cacheService?.get(cacheKey)!).data);
    expect(res1.body.number, cacheVal).to.eq(JSON.parse(cacheVal).data.number);
    const res2 = await testIdempotencyPost(IDEMPOTENCE_IMMEDIATE_RESPONSE, key);
    expect(res1.body.number).to.equal(res2.body.number);
    expect(res1.headers[idempotancyKey]).to.eq(key);
    expect(res2.headers[idempotancyKey]).to.eq(key);
    expect(res2.headers[idempotancyReplayKey]).to.eq('true');
  });
  it('should return cached and use correct cache key when authToken and apiKey combination is used', async () => {
    const key = `3`;
    const res1 = await testIdempotencyPost(IDEMPOTENCE_IMMEDIATE_RESPONSE, key);
    const cacheKey = `test-${session.organization._id}-${key}`;
    session.testServer?.getHttpServer();

    const cacheVal = JSON.stringify(JSON.parse(await cacheService?.get(cacheKey)!).data);
    expect(res1.body.number).to.eq(JSON.parse(cacheVal).data.number);
    const res2 = await testIdempotencyPost(IDEMPOTENCE_IMMEDIATE_RESPONSE, key);
    expect(res1.body.number).to.equal(res2.body.number);
    expect(res1.headers[idempotancyKey]).to.eq(key);
    expect(res2.headers[idempotancyKey]).to.eq(key);
    expect(res2.headers[idempotancyReplayKey]).to.eq('true');
  });
  it('should return conflict when concurrent requests are made', async () => {
    const key = `4`;
    const [{ headers, body, status }, { headers: headerDupe, body: bodyDupe, status: statusDupe }] = await Promise.all([
      session.testAgent
        .post(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .send(IDEMPOTENCE_DELAYED_RESPONSE),
      session.testAgent
        .post(path)
        .set(HttpResponseHeaderKeysEnum.IDEMPOTENCY_KEY, key)
        .send(IDEMPOTENCE_DELAYED_RESPONSE),
    ]);
    const oneSuccess = status === 201 || statusDupe === 201;
    const oneConflict = status === 409 || statusDupe === 409;
    const conflictBody = status === 201 ? bodyDupe : body;
    const retryHeader = headers[retryAfterHeaderKey] || headerDupe[retryAfterHeaderKey];
    expect(oneSuccess).to.be.true;
    expect(oneConflict).to.be.true;
    expect(headers[idempotancyKey]).to.eq(key);
    expect(headerDupe[idempotancyKey], JSON.stringify(headerDupe)).to.eq(key);
    expect(headerDupe[HttpResponseHeaderKeysEnum.LINK.toLowerCase()], JSON.stringify(headerDupe)).to.eq(DOCS_LINK);
    expect(retryHeader).to.eq(`1`);
    expect(conflictBody.message).to.eq(
      `Request with key "${key}" is currently being processed. Please retry after 1 second`
    );
    expect(conflictBody.error).to.eq('Conflict');
    expect(conflictBody.statusCode).to.eq(409);
  });
  it('should return UnprocessableEntity when different body is sent for same key', async () => {
    const key = '5';
    await testIdempotencyPost(IDEMPOTENCE_IMMEDIATE_RESPONSE, key);
    const { error } = await expectSdkExceptionGeneric(() => testIdempotencyPost(IDEMPOTENCE_IMMEDIATE_EXCEPTION, key));
    expect(error?.statusCode).to.eq(422);
  });
  it('should return non cached response for unique requests', async () => {
    const key = '6';
    const key1 = '7';
    const response = await testIdempotencyPost(IDEMPOTENCE_IMMEDIATE_RESPONSE, key);
    const response2 = await testIdempotencyPost(IDEMPOTENCE_IMMEDIATE_RESPONSE, key1);
    expect(response.body.number).to.not.eq(response2.body.number);
    expect(response.headers[idempotancyKey]).to.eq(key);
    expect(response2.headers[idempotancyKey]).to.eq(key1);
  });
  it('should return non cached response for GET requests', async () => {
    const key = '8';
    const response = await testIdempotencyGet(key);
    const response2 = await testIdempotencyGet(key);
    expect(response.body.number).to.not.eq(response2.body.number);
  });
  it('should return cached error response for duplicate requests', async () => {
    const key = '9';
    const { error } = await expectSdkExceptionGeneric(() => testIdempotencyPost(IDEMPOTENCE_IMMEDIATE_EXCEPTION, key));
    const { error: error2 } = await expectSdkExceptionGeneric(() =>
      testIdempotencyPost(IDEMPOTENCE_IMMEDIATE_EXCEPTION, key)
    );
    expect(error?.message).to.eq(error2?.message);
  });
  it('should return 400 when key bigger than allowed limit', async () => {
    const key = Array.from({ length: 256 })
      .fill(0)
      .map((i) => i)
      .join('');
    const { error } = await expectSdkExceptionGeneric(() => testIdempotencyPost(IDEMPOTENCE_IMMEDIATE_EXCEPTION, key));
    expect(error?.statusCode).to.eq(400);
    expect(error?.message).to.include(`has exceeded`);
  });

  describe('Allowed Authentication Security Schemes', () => {
    it('should set Idempotency-Key header when ApiKey security scheme is used to authenticate', async () => {
      const key = '10';
      const { headers } = await testIdempotencyPost(IDEMPOTENCE_IMMEDIATE_RESPONSE, key);
      expect(headers[idempotancyKey]).to.exist;
    });

    it('should set rate limit headers when a Bearer security scheme is used to authenticate', async () => {
      const key = '10';
      const { headers } = await testIdempotencyPost(IDEMPOTENCE_IMMEDIATE_RESPONSE, key);
      expect(headers[idempotancyKey]).to.exist;
    });

    it('should NOT set rate limit headers when NO authorization header is present', async () => {
      const key = '10';
      const { headers } = await testIdempotencyPost(IDEMPOTENCE_IMMEDIATE_RESPONSE, key);
      expect(headers[idempotancyKey]).not.to.exist;
    });
  });
});
