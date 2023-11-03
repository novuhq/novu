import nock from 'nock';
import { Novu } from '../index';

const BACKEND_URL = 'http://example.com';
const TOPICS_PATH = '/v1/topics';
const TRIGGER_PATH = '/v1/events/trigger';

jest.setTimeout(15000);

const allEqual = (arr: Array<string>) => arr.every((val) => val === arr[0]);

class NetworkError extends Error {
  constructor(public code: string) {
    super('Network Error');
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
      waitMax: 1,
      waitMin: 1,
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
    expect(allEqual(idempotencyKeys)).toBeTruthy();
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

    expect(allEqual(idempotencyKeys)).toEqual(false);
  });

  it('should retry on status 422 and regenerate idempotency-key for every retry', async () => {
    const idempotencyKeys: string[] = [];

    nock(BACKEND_URL)
      .post(TRIGGER_PATH)
      .times(3)
      .reply(function (_url, _body) {
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
    expect(allEqual(idempotencyKeys)).toBeFalsy();
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
        waitMin: 1,
        waitMax: 1,
        retryMax: 7,
      },
    });

    const result = await novuClient.topics.list({});
    expect(result.status).toEqual(200);
  });
});
