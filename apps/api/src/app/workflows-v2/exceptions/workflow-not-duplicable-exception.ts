import { BadRequestException } from '@nestjs/common';
import { WorkflowResponseDto } from '@novu/shared';
import { DUPLICABLE_WORKFLOW_ORIGINS } from '../usecases';

export class WorkflowNotDuplicableException extends BadRequestException {
  constructor(workflow: Pick<WorkflowResponseDto, 'workflowId' | 'origin'>) {
    const reason = `origin '${workflow.origin}' is not allowed (must be one of: ${DUPLICABLE_WORKFLOW_ORIGINS.join(', ')})`;

    super({
      message: `Cannot duplicate workflow: ${reason}`,
      workflowId: workflow.workflowId,
      origin: workflow.origin,
      allowedOrigins: DUPLICABLE_WORKFLOW_ORIGINS,
    });
  }
}
