import { LogRepository, RequestLogRepository, RequestLogSourceEnum } from '@novu/application-generic';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { generateTransactionId } from '../../shared/helpers';

describe('Activity - API key access #novu-v2', () => {
  let session: UserSession;
  let requestLogRepository: RequestLogRepository;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    requestLogRepository = session.testServer?.getService(RequestLogRepository);
  });

  function withApiKey(path: string) {
    return session.testAgent.get(path).set('authorization', `ApiKey ${session.apiKey}`);
  }

  it('lists and retrieves trigger requests with an API key', async () => {
    const transactionId = generateTransactionId();
    await requestLogRepository.createMany(
      [
        {
          user_id: session.user._id,
          environment_id: session.environment._id,
          organization_id: session.organization._id,
          transaction_id: transactionId,
          status_code: 201,
          created_at: LogRepository.formatDateTime64(new Date()) as any,
          path: '/v1/events/trigger',
          url: '/v1/events/trigger',
          url_pattern: '/v1/events/trigger',
          hostname: 'localhost',
          method: 'POST',
          ip: '127.0.0.1',
          user_agent: 'test-agent',
          request_body: '{"name":"password-reset","to":"user_123"}',
          response_body: '{"data":{"acknowledged":true,"status":"processed"}}',
          auth_type: 'ApiKey',
          duration_ms: 12,
          source: RequestLogSourceEnum.HTTP,
        },
      ],
      {
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        userId: session.user._id,
      }
    );

    const { body: list } = await withApiKey('/v1/activity/requests').query({ transactionId }).expect(200);
    expect(list.data).to.have.length(1);

    const { body: detail } = await withApiKey(`/v1/activity/requests/${list.data[0].id}`).expect(200);
    expect(detail.data.request.transactionId).to.equal(transactionId);
  });

  it('lists workflow runs and looks up a run with an API key', async () => {
    const { body } = await withApiKey('/v1/activity/workflow-runs').expect(200);
    expect(body.data).to.be.an('array');

    // Past the auth guard: an unknown run is a 404, not a 401.
    await withApiKey('/v1/activity/workflow-runs/non-existent-workflow-run-id').expect(404);
  });

  it('keeps charts out of API key access', async () => {
    await withApiKey('/v1/activity/charts')
      .query({ reportType: ['delivery-trend'] })
      .expect(401);
  });

  it('publishes the four activity routes, and not charts, in the public OpenAPI document', async () => {
    const { body: document } = await session.testAgent.get('/openapi.json').expect(200);

    for (const path of [
      '/v1/activity/requests',
      '/v1/activity/requests/{requestId}',
      '/v1/activity/workflow-runs',
      '/v1/activity/workflow-runs/{workflowRunId}',
    ]) {
      expect(document.paths[path]?.get?.security, path).to.deep.equal([{ secretKey: [] }]);
    }
    expect(document.paths['/v1/activity/charts']).to.equal(undefined);
  });
});
