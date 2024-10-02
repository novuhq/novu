import { BadRequestException } from '@nestjs/common';

export class WorkflowNotFoundException extends BadRequestException {
  constructor(id: string) {
    super({
      message: 'Workflow cannot be found',
      workflowId: id,
    });
  }
}
