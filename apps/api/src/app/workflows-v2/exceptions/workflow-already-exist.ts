import { BadRequestException } from '@nestjs/common';
import { UpsertWorkflowCommand } from '../usecases/upsert-workflow/upsert-workflow.command';

export class WorkflowAlreadyExistException extends BadRequestException {
  constructor(command: UpsertWorkflowCommand) {
    super({
      message: 'Workflow with the same name already exists',
      workflowName: command.workflowDto.name,
      environmentId: command.user.environmentId,
    });
  }
}
