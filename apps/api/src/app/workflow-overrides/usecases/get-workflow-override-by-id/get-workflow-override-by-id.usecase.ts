import { Injectable, NotFoundException } from '@nestjs/common';

import { WorkflowOverrideRepository } from '@novu/dal';

import { GetWorkflowOverrideResponseDto } from '../../dto';
import { GetWorkflowOverrideByIdCommand } from './get-workflow-override-by-id.command';

@Injectable()
export class GetWorkflowOverrideById {
  constructor(private workflowOverrideRepository: WorkflowOverrideRepository) {}

  async execute(command: GetWorkflowOverrideByIdCommand): Promise<GetWorkflowOverrideResponseDto> {
    const workflowOverride = await this.workflowOverrideRepository.findOne({
      _environmentId: command.environmentId,
      _id: command.overrideId,
    });

    if (!workflowOverride) {
      throw new NotFoundException(`Workflow Override with id ${command.overrideId} not found`);
    }

    return workflowOverride;
  }
}
