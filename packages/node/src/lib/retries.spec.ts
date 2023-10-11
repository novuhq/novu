import nock from 'nock';
import { Novu } from '../index';

const BACKEND_URL = 'http://example.com';

jest.setTimeout(15000);

describe('Novu Node.js package - Retries and idempotency key', () => {
  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  const novu = new Novu('fake-key', {
    backendUrl: BACKEND_URL,
    retryConfig: {
      retryMax: 3,
      waitMax: 2,
      waitMin: 1,
    },
  });

  it('should retry trigger', async () => {
    // prepare backend api mock endpoints:
    nock(BACKEND_URL)
      .post('/v1/events/trigger')
      .times(3)
      .reply(500, { message: 'Server Exception' });

    nock(BACKEND_URL)
      .post('/v1/events/trigger')
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
      .get('/v1/topics')
      .times(3)
      .reply(500, { message: 'Server Exception' });

    nock(BACKEND_URL).get('/v1/topics').reply(200, [{}, {}]);

    const result = await novu.topics.list({});

    expect(result.status).toEqual(200);
    expect(result.request.headers['idempotency-key']).toBeUndefined();
  });
});
