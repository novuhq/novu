import { AxiosError } from 'axios';
import nock from 'nock';
import { Novu, defaultRetryCondition } from '../index';
import { RETRYABLE_HTTP_CODES } from './retry';

const BACKEND_URL = 'http://example.com';
const TOPICS_PATH = '/v1/topics';
const TRIGGER_PATH = '/v1/events/trigger';

jest.setTimeout(15000);

const hasAllEqual = (arr: Array<string>) => arr.every((val) => val === arr[0]);
const hasUniqueOnly = (arr: Array<string>) =>
  Array.from(new Set(arr)).length === arr.length;

class NetworkError extends Error {
  constructor(public code: string) {
    super('Network Error');
  }
}

class HttpError extends Error {
  readonly response: { status: number };

  constructor(status: number) {
    super('Http Error');
    this.response = { status };
  }
}

describe('Novu Node.js package - Retries and idempotency-key', () => {
  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  const novu = new Novu('fake-key', {
    backendUrl: BACKEND_URL,
    retryConfig: {
      retryMax: 3,
      waitMax: 0.5,
      waitMin: 0.2,
    },
  });

  it('should retry trigger and generate idempotency-key only once for request', async () => {
    const idempotencyKeys: string[] = [];

    nock(BACKEND_URL)
      .post(TRIGGER_PATH)
      .times(3)
      .reply(function (_url, _body) {
        idempotencyKeys.push(this.req.getHeader('idempotency-key') as string);

        return [500, { message: 'Server Exception' }];
      });

    nock(BACKEND_URL)
      .post(TRIGGER_PATH)
      .reply(201, { acknowledged: true, transactionId: '1003' });

    const result = await novu.trigger('fake-workflow', {
      to: { subscriberId: '123' },
      payload: {},
    });

    // all idempotency keys are supposed to be same.
    expect(hasAllEqual(idempotencyKeys)).toEqual(true);
    expect(result.status).toEqual(201);
    expect(result.request.headers['idempotency-key']).toBeDefined();
  });

  it('should generate different idempotency-key for each request', async () => {
    nock(BACKEND_URL)
      .post(TRIGGER_PATH)
      .reply(500, { message: 'Server Exception' });

    nock(BACKEND_URL)
      .post(TRIGGER_PATH)
      .times(10)
      .reply(201, { acknowledged: true, transactionId: '1003' });

    const idempotencyKeys: string[] = [];

    for (let i = 0; i < 10; i++) {
      const result = await novu.trigger('fake-workflow', {
        to: { subscriberId: '123' },
        payload: {},
      });

      idempotencyKeys.push(result.request?.headers['idempotency-key']);
    }

    expect(hasUniqueOnly(idempotencyKeys)).toEqual(true);
  });

  it('should retry on status 422 and regenerate idempotency-key for every retry', async () => {
    const idempotencyKeys: string[] = [];

    nock(BACKEND_URL)
      .post(TRIGGER_PATH)
      .times(3)
      .reply(function () {
        idempotencyKeys.push(this.req.getHeader('idempotency-key') as string);

        return [422, { message: 'Unprocessable Content' }];
      });

    nock(BACKEND_URL)
      .post(TRIGGER_PATH)
      .reply(201, { acknowledged: true, transactionId: '1003' });

    const result = await novu.trigger('fake-workflow', {
      to: { subscriberId: '123' },
      payload: {},
    });

    // idempotency key should be regenerated for every retry for http status 422.
    expect(hasUniqueOnly(idempotencyKeys)).toEqual(true);
    expect(result.status).toEqual(201);
    expect(result.request.headers['idempotency-key']).toBeDefined();
  });

  it('should retry getting topics list', async () => {
    nock(BACKEND_URL)
      .get(TOPICS_PATH)
      .times(3)
      .reply(500, { message: 'Server Exception' });

    nock(BACKEND_URL).get(TOPICS_PATH).reply(200, [{}, {}]);

    const result = await novu.topics.list({});

    expect(result.status).toEqual(200);
    expect(result.request.headers['idempotency-key']).toBeUndefined();
  });

  it('should fail after reaching max retries', async () => {
    nock(BACKEND_URL)
      .get(TOPICS_PATH)
      .times(4)
      .reply(500, { message: 'Server Exception' });

    nock(BACKEND_URL).get(TOPICS_PATH).reply(200, [{}, {}]);

    await expect(novu.topics.list({})).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  const NON_RECOVERABLE_ERRORS: Array<[number, string]> = [
    [400, 'Bad Request'],
    [401, 'Unauthorized'],
    [403, 'Forbidden'],
    [404, 'Not Found'],
    [405, 'Method not allowed'],
    [413, 'Payload Too Large'],
    [414, 'URI Too Long'],
    [415, 'Unsupported Media Type'],
  ];

  test.each<[number, string]>(NON_RECOVERABLE_ERRORS)(
    'should not retry on non-recoverable %i error',
    async (status, message) => {
      nock(BACKEND_URL).get(TOPICS_PATH).times(3).reply(status, { message });
      nock(BACKEND_URL).get(TOPICS_PATH).reply(200, [{}, {}]);

      await expect(novu.topics.list({})).rejects.toMatchObject({
        response: { status },
      });
    }
  );

  it('should retry on various errors until it reach successful response', async () => {
    nock(BACKEND_URL)
      .get(TOPICS_PATH)
      .reply(429, { message: 'Too many requests' });

    nock(BACKEND_URL)
      .get(TOPICS_PATH)
      .reply(408, { message: 'Request Timeout' });

    nock(BACKEND_URL)
      .get(TOPICS_PATH)
      .replyWithError(new NetworkError('ECONNRESET'));

    nock(BACKEND_URL)
      .get(TOPICS_PATH)
      .replyWithError(new NetworkError('ETIMEDOUT'));

    nock(BACKEND_URL)
      .get(TOPICS_PATH)
      .replyWithError(new NetworkError('ECONNREFUSED'));

    nock(BACKEND_URL)
      .get(TOPICS_PATH)
      .reply(504, { message: 'Gateway timeout' });

    nock(BACKEND_URL)
      .get(TOPICS_PATH)
      .reply(422, { message: 'Unprocessable Content' });

    nock(BACKEND_URL).get(TOPICS_PATH).reply(200, [{}, {}]);

    const novuClient = new Novu('fake-key', {
      backendUrl: BACKEND_URL,
      retryConfig: {
        initialDelay: 0,
        waitMin: 0.2,
        waitMax: 0.5,
        retryMax: 7,
      },
    });

    const result = await novuClient.topics.list({});
    expect(result.status).toEqual(200);
  });

  describe('defaultRetryCondition function', () => {
    test.each<[number, string]>(NON_RECOVERABLE_ERRORS)(
      'should return false when HTTP status is %i',
      (status) => {
        const err = new HttpError(status);
        expect(defaultRetryCondition(err as AxiosError)).toEqual(false);
      }
    );

    test.each<number>(RETRYABLE_HTTP_CODES)(
      'should return true when HTTP status is %i',
      (status) => {
        const err = new HttpError(status);
        expect(defaultRetryCondition(err as AxiosError)).toEqual(true);
      }
    );

    it('should return true when HTTP status is 500', () => {
      const err = new HttpError(500);
      expect(defaultRetryCondition(err as AxiosError)).toEqual(true);
    });

    it('should return true when network code is ECONNRESET', () => {
      const err = new NetworkError('ECONNRESET');
      expect(defaultRetryCondition(err as AxiosError)).toEqual(true);
    });

    it('shoud return false on unknown error', () => {
      const err = new Error('Unexpected error');
      expect(defaultRetryCondition(err as AxiosError)).toEqual(false);
    });
  });

  describe('hasAllEqual helper function', () => {
    it('should return true when all items are equal', () => {
      const arr = ['a', 'a', 'a', 'a'];
      expect(hasAllEqual(arr)).toEqual(true);
    });

    it('should return false when items are not equal', () => {
      const arr = ['a', 'b', 'b', 'b'];
      expect(hasAllEqual(arr)).toEqual(false);
    });
  });

  describe('hasUniqueOnly helper function', () => {
    it('should return true when all items are unique', () => {
      const arr = ['a', 'b', 'c', 'd'];
      expect(hasUniqueOnly(arr)).toEqual(true);
    });

    it('should return false when items are not unique', () => {
      const arr = ['a', 'a', 'c', 'd'];
      expect(hasUniqueOnly(arr)).toEqual(false);
    });
  });
});
