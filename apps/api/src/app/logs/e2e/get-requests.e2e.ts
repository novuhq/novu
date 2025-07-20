import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { format, subHours, isBefore, isAfter } from 'date-fns';
import { Novu } from '@novu/api';
import { LogRepository, RequestLog, RequestLogRepository } from '@novu/application-generic';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import { generateTransactionId } from '../../shared/helpers';
import { mapRequestLogToResponseDto } from '../shared/mappers';
import { RequestLogResponseDto } from '../dtos/get-requests.response.dto';

describe('Logs - /logs/requests (GET) #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;
  let requestLogRepository: RequestLogRepository;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
    requestLogRepository = session.testServer?.getService(RequestLogRepository);
  });

  it('should return a list of http logs', async () => {
    const requestLog: Omit<RequestLog, 'id' | 'expires_at'> = {
      user_id: session.user._id,
      environment_id: session.environment._id,
      organization_id: session.organization._id,
      transaction_id: generateTransactionId(),
      status_code: 200,
      created_at: format(new Date(), 'yyyy-MM-dd HH:mm:ss') as any,
      path: '/test-path',
      url: '/test-url',
      url_pattern: '/test-url-pattern',
      hostname: 'localhost',
      method: 'GET',
      ip: '127.0.0.1',
      user_agent: 'test-agent',
      request_body: '{}',
      response_body: '{}',
      auth_type: 'ApiKey',
      duration_ms: 42,
    };

    await requestLogRepository.insert(requestLog);
    await requestLogRepository.insert(requestLog);

    const { body } = await session.testAgent.get('/v1/logs/requests').expect(200);

    expect(body.data.length).to.be.equal(2);
    expect(body.total).to.be.equal(2);
    expect(body.pageSize).to.be.equal(10);

    const expectedLog = normalizeRequestLogForTesting(mapRequestLogToResponseDto(requestLog as RequestLog));
    const responseLog = normalizeRequestLogForTesting(body.data[0]);
    expect(responseLog).to.deep.equal(expectedLog);
  });

  it('should filter http logs by url, transaction id, and created time', async () => {
    const baseRequestLog: Omit<RequestLog, 'id' | 'expires_at' | 'status_code' | 'url'> = {
      user_id: session.user._id,
      environment_id: session.environment._id,
      organization_id: session.organization._id,
      transaction_id: generateTransactionId(),
      created_at: format(new Date(), 'yyyy-MM-dd HH:mm:ss') as any,
      path: '/test-path',
      url_pattern: '/test-url-pattern',
      hostname: 'localhost',
      method: 'GET',
      ip: '127.0.0.1',
      user_agent: 'test-agent',
      request_body: '{}',
      response_body: '{}',
      auth_type: 'ApiKey',
      duration_ms: 42,
    };

    // Create logs with different status codes, URLs, transaction IDs, and timestamps
    const transactionId1 = generateTransactionId();
    const transactionId2 = generateTransactionId();
    const currentTime = new Date();
    const threeHoursAgo = subHours(currentTime, 3);

    const log200Api = {
      ...baseRequestLog,
      status_code: 200,
      url: '/api/workflows',
      transaction_id: transactionId1,
      created_at: LogRepository.formatDateTime64(currentTime) as any,
    };
    const log404Api = {
      ...baseRequestLog,
      status_code: 404,
      url: '/api/notifications',
      transaction_id: transactionId1,
      created_at: LogRepository.formatDateTime64(currentTime) as any,
    };
    const log500Api = {
      ...baseRequestLog,
      status_code: 500,
      url: '/api/users',
      transaction_id: transactionId2,
      created_at: LogRepository.formatDateTime64(threeHoursAgo) as any,
    };
    const log200Auth = {
      ...baseRequestLog,
      status_code: 200,
      url: '/auth/login',
      transaction_id: transactionId2,
      created_at: LogRepository.formatDateTime64(threeHoursAgo) as any,
    };

    await requestLogRepository.insert(log200Api);
    await requestLogRepository.insert(log404Api);
    await requestLogRepository.insert(log500Api);
    await requestLogRepository.insert(log200Auth);

    // Test 1: Filter by status codes 200 and 404
    const statusFilterResponse = await session.testAgent
      .get('/v1/logs/requests')
      .query({ statusCodes: [200, 404] })
      .expect(200);

    expect(statusFilterResponse.body.data.length).to.be.equal(3);
    expect(statusFilterResponse.body.total).to.be.equal(3);

    const statusCodes = statusFilterResponse.body.data.map((log: RequestLogResponseDto) => log.statusCode);
    expect(statusCodes.length).to.be.equal(3);
    expect(statusCodes).to.include.members([200, 404]);

    // Test 2: Filter by URL containing 'api'
    const urlFilterResponse = await session.testAgent.get('/v1/logs/requests').query({ url: 'api' }).expect(200);

    expect(urlFilterResponse.body.data.length).to.be.equal(3);
    expect(urlFilterResponse.body.total).to.be.equal(3);

    const urls = urlFilterResponse.body.data.map((log: RequestLogResponseDto) => log.url);
    urls.forEach((url: string) => {
      expect(url).to.include('api');
    });

    // Test 3: Combine filters - status codes 200,404 AND URL containing 'workflows'
    const combinedFilterResponse = await session.testAgent
      .get('/v1/logs/requests')
      .query({ statusCodes: [200, 404], url: 'workflows' })
      .expect(200);

    expect(combinedFilterResponse.body.data.length).to.be.equal(1);
    expect(combinedFilterResponse.body.total).to.be.equal(1);

    const combinedResult = combinedFilterResponse.body.data[0];
    expect(combinedResult.statusCode).to.be.equal(200);
    expect(combinedResult.url).to.include('workflows');

    // Test 4: Filter by transaction ID
    const transactionFilterResponse = await session.testAgent
      .get('/v1/logs/requests')
      .query({ transactionId: transactionId1 })
      .expect(200);

    expect(transactionFilterResponse.body.data.length).to.be.equal(2);
    expect(transactionFilterResponse.body.total).to.be.equal(2);

    const transactionIds = transactionFilterResponse.body.data.map((log: RequestLogResponseDto) => log.transactionId);
    transactionIds.forEach((txId: string) => {
      expect(txId).to.be.equal(transactionId1);
    });

    // Verify the correct logs are returned for transactionId1
    const returnedStatusCodes = transactionFilterResponse.body.data.map((log: RequestLogResponseDto) => log.statusCode);
    expect(returnedStatusCodes).to.include.members([200, 404]);

    // Test 5: Filter by created (last 2 hours) - should only return recent logs
    const createdFilterResponse = await session.testAgent.get('/v1/logs/requests').query({ created: 2 }).expect(200);

    expect(createdFilterResponse.body.data.length).to.be.equal(2);
    expect(createdFilterResponse.body.total).to.be.equal(2);

    // Verify only recent logs (within last 2 hours) are returned
    const recentCreatedAt = createdFilterResponse.body.data.map(
      (log: RequestLogResponseDto) => new Date(log.createdAt)
    );
    const twoHoursAgo = subHours(currentTime, 2);
    expect(isAfter(recentCreatedAt[0], twoHoursAgo)).to.be.true;
    expect(isAfter(recentCreatedAt[1], twoHoursAgo)).to.be.true;
  });
});

function normalizeRequestLogForTesting(requestLog: RequestLogResponseDto): Omit<RequestLogResponseDto, 'id'> {
  const { id, ...rest } = requestLog;

  return rest;
}
