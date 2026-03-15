import { BadRequestException } from '@nestjs/common';
import { UpsertWorkflowCommand } from '@novu/application-generic';

export class WorkflowAlreadyExistException extends BadRequestException {
  constructor(command: UpsertWorkflowCommand) {
    super({
      message: 'Workflow with the same name already exists',
      workflowName: command.workflowDto.name,
      environmentId: command.user.environmentId,
    });
  }
}
