import { Novu } from '@novu/api';
import { expect } from 'chai';
import { topicsList } from '@novu/api/funcs/topicsList';
import { FilterTopicsResponseDto } from '@novu/api/src/models/components/filtertopicsresponsedto';
import { expectSdkExceptionGeneric } from '../src/app/shared/helpers/e2e/sdk/e2e-sdk.helper';
import { MockHTTPClient } from './mock-http-server';
import { ErrorDto } from '../src/error-dto';

function getIdempotencyKeys(mockHTTPClient: MockHTTPClient) {
  return mockHTTPClient
    .getRecordedRequests()
    .map((req) => req.request.headers)
    .flatMap((headers) => (headers['Idempotency-Key'] ? [headers['Idempotency-Key']] : []))
    .filter((key) => key !== undefined);
}

describe('Novu Node.js package - Retries and idempotency-key', () => {
  it('should retry trigger and generate idempotency-key only once for request', async () => {
    const mockHTTPClient = new MockHTTPClient([
      {
        baseUrl: BACKEND_URL,
        path: TRIGGER_PATH,
        responseCode: 500,
        responseJson: buildErrorDto(TRIGGER_PATH, 'Server Exception', 500),
        method: 'POST',
        times: 3,
      },
      {
        baseUrl: BACKEND_URL,
        path: TRIGGER_PATH,
        responseCode: 201,
        responseJson: { acknowledged: true, transactionId: '1003', status: 'error' },
        method: 'POST',
        times: 1,
      },
    ]);
    novuClient = new Novu({
      security: {
        secretKey: 'fakeKey',
      },
      serverURL: BACKEND_URL,
      httpClient: mockHTTPClient,
    });

    await novuClient.trigger({
      name: 'fake-workflow',
      to: { subscriberId: '123' },
      payload: {},
    });

    const requestKeys = getIdempotencyRequestKeys(mockHTTPClient);
    expect(hasAllEqual(requestKeys), JSON.stringify(requestKeys)).to.be.eq(true);
  });

  it('should generate different idempotency-key for each request', async () => {
    const httpClient = new MockHTTPClient([
      {
        baseUrl: BACKEND_URL,
        path: TRIGGER_PATH,
        responseCode: 201,
        responseJson: { acknowledged: true, transactionId: '1003', status: 'error' },
        method: 'POST',
        times: 2,
      },
    ]);
    novuClient = new Novu({
      security: {
        secretKey: 'fakeKey',
      },
      serverURL: BACKEND_URL,
      httpClient,
    });
    await novuClient.trigger({ workflowId: 'fake-workflow', to: { subscriberId: '123' }, payload: {} });
    await novuClient.trigger({ workflowId: 'fake-workflow', to: { subscriberId: '123' }, payload: {} });

    const idempotencyRequestKeys = getIdempotencyRequestKeys(httpClient);
    expect(new Set(idempotencyRequestKeys).size, JSON.stringify(idempotencyRequestKeys)).to.be.eq(2);
  });

  it('should retry on status 422 and idempotency-key should be the same for every retry', async () => {
    const mockHTTPClient = new MockHTTPClient([
      {
        baseUrl: BACKEND_URL,
        path: TRIGGER_PATH,
        responseCode: 422,
        responseJson: buildErrorDto(TRIGGER_PATH, 'Unprocessable Content', 422),
        method: 'POST',
        times: 3,
      },
      {
        baseUrl: BACKEND_URL,
        path: TRIGGER_PATH,
        responseCode: 201,
        responseJson: { acknowledged: true, transactionId: '1003', status: 'processed' },
        method: 'POST',
        times: 1,
      },
    ]);
    novuClient = new Novu({
      security: {
        secretKey: 'fakeKey',
      },
      serverURL: BACKEND_URL,
      httpClient: mockHTTPClient,
    });

    await novuClient.trigger({ workflowId: 'fake-workflow', to: { subscriberId: '123' }, payload: {} });
    expect(mockHTTPClient.getRecordedRequests().length).to.eq(4);
    const idempotencyKeys = getIdempotencyKeys(mockHTTPClient);
    expect(hasUniqueOnly(idempotencyKeys)).to.be.eq(true);
  });

  it('should fail after reaching max retries', async () => {
    novuClient = new Novu({
      security: {
        secretKey: 'fakeKey',
      },
      serverURL: BACKEND_URL,
      httpClient: new MockHTTPClient([
        {
          baseUrl: BACKEND_URL,
          path: TOPICS_PATH,
          responseCode: 500,
          responseJson: buildErrorDto(TOPICS_PATH, 'Server Exception', 500),
          method: 'GET',
          times: 4,
        },
        {
          baseUrl: BACKEND_URL,
          path: TOPICS_PATH,
          responseCode: 200,
          responseJson: [{}, {}],
          method: 'GET',
          times: 1,
        },
      ]),
    });

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.topics.list(
        {},
        {
          retries: {
            strategy: 'backoff',
            backoff: {
              initialInterval: 30,
              maxInterval: 60,
              exponent: 1,
              maxElapsedTime: 150,
            },
            retryConnectionErrors: true,
          },
        }
      )
    );
    expect(error?.statusCode).to.be.eq(500);
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
  NON_RECOVERABLE_ERRORS.forEach(([status, message]) => {
    it('should not retry on non-recoverable %i error', async () => {
      novuClient = new Novu({
        security: {
          secretKey: 'fakeKey',
        },
        serverURL: BACKEND_URL,
        httpClient: new MockHTTPClient([
          {
            baseUrl: BACKEND_URL,
            path: TOPICS_PATH,
            responseCode: status,
            responseJson: buildErrorDto(TOPICS_PATH, message, status),
            method: 'GET',
            times: 3,
          },
          {
            baseUrl: BACKEND_URL,
            path: TOPICS_PATH,
            responseCode: 200,
            responseJson: [{}, {}],
            method: 'GET',
            times: 1,
          },
        ]),
      });

      const result = await topicsList(novuClient, {});

      expect(result.ok).to.be.eq(false);
    });
  });

  it('should retry on various errors until it reaches successful response', async () => {
    const mockClient = new MockHTTPClient([
      {
        baseUrl: BACKEND_URL,
        path: TOPICS_PATH,
        responseCode: 429,
        responseJson: buildErrorDto(TOPICS_PATH, 'Too many requests', 429),
        method: 'GET',
        times: 1,
      },
      {
        baseUrl: BACKEND_URL,
        path: TOPICS_PATH,
        responseCode: 408,
        responseJson: buildErrorDto(TOPICS_PATH, 'Request Timeout', 408),
        method: 'GET',
        times: 1,
      },
      {
        baseUrl: BACKEND_URL,
        path: TOPICS_PATH,
        responseCode: 504,
        responseJson: buildErrorDto(TOPICS_PATH, 'Gateway timeout', 504),
        method: 'GET',
        times: 1,
      },
      {
        baseUrl: BACKEND_URL,
        path: TOPICS_PATH,
        responseCode: 422,
        responseJson: buildErrorDto(TOPICS_PATH, 'Unprocessable Content', 422),
        method: 'GET',
        times: 1,
      },
      {
        baseUrl: BACKEND_URL,
        path: TOPICS_PATH,
        responseCode: 200,
        responseJson: { data: [], page: 1, pageSize: 30, totalCount: 0 } as FilterTopicsResponseDto,
        method: 'GET',
        times: 1,
      },
    ]);

    novuClient = new Novu({
      security: {
        secretKey: 'fakeKey',
      },
      serverURL: BACKEND_URL,
      httpClient: mockClient,
    });

    const { error, ok, value } = await topicsList(novuClient, {});
    expect(ok).to.be.true;
  });
});
const BACKEND_URL = 'http://example.com';
const TOPICS_PATH = '/v1/topics';
const TRIGGER_PATH = '/v1/events/trigger';

const hasAllEqual = (arr: Array<string>) => arr.every((val) => val === arr[0]);
const hasUniqueOnly = (arr: Array<string>) => Array.from(new Set(arr)).length === arr.length;

let novuClient: Novu;

function buildErrorDto(path: string, message: string, status: number): ErrorDto {
  return {
    path,
    timestamp: new Date().toDateString(),
    message,
    statusCode: status,
  };
}

const IDEMPOTENCY_HEADER_KEY = 'idempotency-key';

function getIdempotencyRequestKeys(mockHTTPClient: MockHTTPClient) {
  return mockHTTPClient
    .getRecordedRequests()
    .map((pair) => pair.request.headers.get(IDEMPOTENCY_HEADER_KEY))
    .filter((value) => value != null);
}
