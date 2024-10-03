import { NotFoundException } from '@nestjs/common';

export class WorkflowNotFoundException extends NotFoundException {
  constructor(id: string) {
    super({
      message: 'Workflow cannot be found',
      workflowId: id,
    });
  }
}
