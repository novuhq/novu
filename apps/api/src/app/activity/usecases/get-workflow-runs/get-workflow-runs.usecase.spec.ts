import { WorkflowRunStatusEnum } from '@novu/application-generic';
import { DeliveryLifecycleDetail, DeliveryLifecycleStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import { stub } from 'sinon';
import { GetWorkflowRunsCommand } from './get-workflow-runs.command';
import { GetWorkflowRuns } from './get-workflow-runs.usecase';

describe('GetWorkflowRuns', () => {
  const command = Object.assign(new GetWorkflowRunsCommand(), {
    environmentId: 'environment-id',
    organizationId: 'organization-id',
    userId: 'user-id',
    limit: 10,
  });

  function workflowRunRow(overrides: Record<string, unknown>) {
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
      created_at: '2026-11-20 10:00:00.000',
      updated_at: '2026-11-20 10:00:01.000',
      delivery_lifecycle_status: DeliveryLifecycleStatusEnum.SKIPPED,
      delivery_lifecycle_detail: '',
      severity: 'none',
      critical: false,
      context_keys: [],
      digested_workflow_run_id: null,
      ...overrides,
    };
  }

  it('returns the delivery lifecycle detail of each run, and none when it is empty', async () => {
    const workflowRunRepository = {
      findWithCursor: stub().resolves({
        data: [
          workflowRunRow({
            workflow_run_id: 'run-skipped',
            delivery_lifecycle_detail: DeliveryLifecycleDetail.USER_MISSING_EMAIL,
          }),
          workflowRunRow({ workflow_run_id: 'run-without-detail', transaction_id: 'txn-2' }),
        ],
      }),
    };
    const usecase = new GetWorkflowRuns(
      workflowRunRepository as never,
      { find: stub().resolves({ data: [] }) } as never,
      {} as never,
      { resolve: stub().resolves({}) } as never,
      { setContext: stub(), debug: stub(), warn: stub(), error: stub() } as never
    );

    const result = await usecase.execute(command);

    expect(workflowRunRepository.findWithCursor.firstCall.args[0].select).to.include('delivery_lifecycle_detail');
    expect(result.data.map((run) => run.deliveryLifecycleDetail)).to.deep.equal([
      DeliveryLifecycleDetail.USER_MISSING_EMAIL,
      undefined,
    ]);
  });
});
