import { WorkflowRunStatusEnum } from '@novu/application-generic';
import { DeliveryLifecycleDetail, DeliveryLifecycleStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import { stub } from 'sinon';
import { GetWorkflowRunCommand } from './get-workflow-run.command';
import { GetWorkflowRun } from './get-workflow-run.usecase';

describe('GetWorkflowRun', () => {
  const command = Object.assign(new GetWorkflowRunCommand(), {
    environmentId: 'environment-id',
    organizationId: 'organization-id',
    userId: 'user-id',
    workflowRunId: 'workflow-run-id',
    includeRawTraces: true,
  });

  function workflowRunRow(overrides: Record<string, unknown> = {}) {
    return {
      workflow_run_id: 'workflow-run-id',
      workflow_id: 'workflow-id',
      workflow_name: 'Password reset',
      organization_id: 'organization-id',
      environment_id: 'environment-id',
      subscriber_id: 'internal-subscriber-id',
      external_subscriber_id: 'user_123',
      status: WorkflowRunStatusEnum.COMPLETED,
      trigger_identifier: 'password-reset',
      transaction_id: 'txn-1',
      payload: '{}',
      topics: null,
      digested_workflow_run_id: null,
      created_at: '2026-11-20 10:00:00.000',
      updated_at: '2026-11-20 10:00:01.000',
      delivery_lifecycle_status: DeliveryLifecycleStatusEnum.ERRORED,
      delivery_lifecycle_detail: '',
      severity: 'none',
      critical: false,
      context_keys: [],
      ...overrides,
    };
  }

  function stepRunRow(overrides: Record<string, unknown> = {}) {
    return {
      step_run_id: 'step-run-id',
      step_id: 'email-step',
      workflow_run_id: 'workflow-run-id',
      step_type: 'email',
      provider_id: 'sendgrid',
      status: 'failed',
      error_code: null,
      error_message: null,
      transaction_id: 'txn-1',
      created_at: '2026-11-20 10:00:00.000',
      updated_at: '2026-11-20 10:00:01.000',
      digest: null,
      schedule_extensions_count: 0,
      ...overrides,
    };
  }

  function buildUsecase(
    workflowRun: Record<string, unknown>,
    stepRuns: Record<string, unknown>[],
    traces: Record<string, unknown>[] = []
  ) {
    const workflowRunRepository = { findOne: stub().resolves({ data: workflowRun }) };
    const stepRunRepository = { find: stub().resolves({ data: stepRuns }) };
    const traceLogRepository = { find: stub().resolves({ data: traces }) };
    const jobRepository = { find: stub().resolves([]) };
    const notificationRepository = { findOne: stub().resolves({ overrides: { email: { from: 'a@b.c' } } }) };
    const logger = { setContext: stub(), debug: stub(), warn: stub(), error: stub() };

    return new GetWorkflowRun(
      workflowRunRepository as never,
      stepRunRepository as never,
      traceLogRepository as never,
      jobRepository as never,
      notificationRepository as never,
      logger as never
    );
  }

  it('returns the error code and message recorded on a failed step', async () => {
    const usecase = buildUsecase(workflowRunRow(), [
      stepRunRow({ error_code: 'send_message_failed', error_message: 'provider_error' }),
    ]);

    const result = await usecase.execute(command);

    expect(result.steps[0]).to.include({
      errorCode: 'send_message_failed',
      errorMessage: 'provider_error',
      providerId: 'sendgrid',
      status: 'failed',
    });
  });

  it('keeps raw provider traces only when the caller may read them', async () => {
    const trace = {
      entity_id: 'step-run-id',
      id: 'trace-1',
      status: 'error',
      title: 'Message sending failed',
      raw_data: '{"config":{"headers":{"api-key":"provider-secret"}}}',
      created_at: '2026-11-20 10:00:00.500',
      event_type: 'message_sending_failed',
    };
    const usecase = buildUsecase(workflowRunRow(), [stepRunRow()], [trace]);

    const withRaw = await usecase.execute(command);
    const withoutRaw = await usecase.execute(
      Object.assign(new GetWorkflowRunCommand(), command, { includeRawTraces: false })
    );

    expect(withRaw.steps[0].executionDetails[0].raw).to.equal(trace.raw_data);
    expect(withoutRaw.steps[0].executionDetails[0]).to.include({ detail: 'Message sending failed', raw: undefined });
  });

  it('leaves the error fields out of a step that recorded none', async () => {
    const usecase = buildUsecase(workflowRunRow(), [stepRunRow({ status: 'completed' })]);

    const result = await usecase.execute(command);

    expect(result.steps[0].errorCode).to.equal(undefined);
    expect(result.steps[0].errorMessage).to.equal(undefined);
  });

  it('returns the delivery lifecycle detail when one was recorded', async () => {
    const usecase = buildUsecase(
      workflowRunRow({
        delivery_lifecycle_status: DeliveryLifecycleStatusEnum.SKIPPED,
        delivery_lifecycle_detail: DeliveryLifecycleDetail.SUBSCRIBER_PREFERENCE,
      }),
      []
    );

    const result = await usecase.execute(command);

    expect(result.deliveryLifecycleStatus).to.equal(DeliveryLifecycleStatusEnum.SKIPPED);
    expect(result.deliveryLifecycleDetail).to.equal(DeliveryLifecycleDetail.SUBSCRIBER_PREFERENCE);
  });

  it('omits an empty or unknown delivery lifecycle detail', async () => {
    const empty = await buildUsecase(workflowRunRow({ delivery_lifecycle_detail: '' }), []).execute(command);
    const unknown = await buildUsecase(workflowRunRow({ delivery_lifecycle_detail: 'not-a-detail' }), []).execute(
      command
    );

    expect(empty.deliveryLifecycleDetail).to.equal(undefined);
    expect(unknown.deliveryLifecycleDetail).to.equal(undefined);
  });
});
