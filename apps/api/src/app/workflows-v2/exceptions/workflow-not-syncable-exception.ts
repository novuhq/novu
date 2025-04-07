import { BadRequestException } from '@nestjs/common';
import { WorkflowResponseDto } from '@novu/shared';
import { SYNCABLE_WORKFLOW_ORIGINS } from '../usecases/sync-to-environment/sync-to-environment.usecase';

export class WorkflowNotSyncableException extends BadRequestException {
  constructor(workflow: Pick<WorkflowResponseDto, 'workflowId' | 'origin' | 'status'>) {
    const reason = !SYNCABLE_WORKFLOW_ORIGINS.includes(workflow.origin)
      ? `origin '${workflow.origin}' is not allowed (must be one of: ${SYNCABLE_WORKFLOW_ORIGINS.join(', ')})`
      : `cannot be synced while in '${workflow.status}' status`;

    super({
      message: `Cannot sync workflow: ${reason}`,
      workflowId: workflow.workflowId,
      status: workflow.status,
      origin: workflow.origin,
      allowedOrigins: SYNCABLE_WORKFLOW_ORIGINS,
    });
  }
}
