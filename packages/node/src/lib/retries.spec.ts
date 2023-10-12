import nock from 'nock';
import { Novu } from '../index';

const BACKEND_URL = 'http://example.com';
const TOPICS_PATH = '/v1/topics';
const TRIGGER_PATH = '/v1/events/trigger';

jest.setTimeout(15000);

class NetworkError extends Error {
  constructor(public code: string) {
    super('Network Error');
  }
}

describe('Novu Node.js package - Retries and idempotency key', () => {
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

  it('should retry trigger', async () => {
    // prepare backend api mock endpoints:
    nock(BACKEND_URL)
      .post(TRIGGER_PATH)
      .times(3)
      .reply(500, { message: 'Server Exception' });

    nock(BACKEND_URL)
      .post(TRIGGER_PATH)
      .reply(201, { acknowledged: true, transactionId: '1003' });

    const result = await novu.trigger('fake-workflow', {
      to: { subscriberId: '123' },
      payload: {},
    });

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

  it('should retry on various errors until it reach successfull response', async () => {
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

    nock(BACKEND_URL).get(TOPICS_PATH).reply(200, [{}, {}]);

    const novuClient = new Novu('fake-key', {
      backendUrl: BACKEND_URL,
      retryConfig: {
        initialDelay: 0,
        waitMin: 1,
        waitMax: 1,
        retryMax: 6,
      },
    });

    const result = await novuClient.topics.list({});
    expect(result.status).toEqual(200);
  });
});
