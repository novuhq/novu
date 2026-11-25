import { expect } from 'chai';
import { stub } from 'sinon';
import { GetRequestCommand } from './get-request.command';
import { GetRequest } from './get-request.usecase';

describe('GetRequest', () => {
  const command = Object.assign(new GetRequestCommand(), {
    environmentId: 'environment-id',
    organizationId: 'organization-id',
    requestId: 'request-id',
    includeRawTraces: true,
  });

  const trace = {
    id: 'trace-1',
    created_at: '2026-11-20 10:00:00.100',
    event_type: 'workflow_execution_failed',
    title: 'Workflow execution failed',
    message: 'Provider rejected the request',
    raw_data: '{"config":{"headers":{"api-key":"provider-secret"}}}',
    status: 'error',
    entity_type: 'request',
    entity_id: 'request-id',
    organization_id: 'organization-id',
    environment_id: 'environment-id',
    user_id: null,
    external_subscriber_id: 'user_123',
    subscriber_id: null,
  };

  function buildUsecase() {
    const requestLogRepository = {
      findOne: stub().resolves({
        data: {
          id: 'request-id',
          created_at: '2026-11-20 10:00:00.000',
          url: 'https://api.novu.co/v1/events/trigger',
          url_pattern: '/v1/events/trigger',
          method: 'POST',
          status_code: 201,
          path: '/v1/events/trigger',
        },
      }),
    };
    const traceLogRepository = { find: stub().resolves({ data: [trace] }) };

    return new GetRequest(requestLogRepository as never, traceLogRepository as never);
  }

  it('keeps raw trace data only when the caller may read it', async () => {
    const usecase = buildUsecase();

    const withRaw = await usecase.execute(command);
    const withoutRaw = await usecase.execute(
      Object.assign(new GetRequestCommand(), command, { includeRawTraces: false })
    );

    expect(withRaw.traces[0].rawData).to.equal(trace.raw_data);
    expect(withoutRaw.traces[0]).to.include({ title: 'Workflow execution failed', rawData: '' });
  });
});
