import { Injectable, NotFoundException } from '@nestjs/common';

import { TenantRepository, WorkflowOverrideRepository } from '@novu/dal';
import { GetWorkflowOverrideResponseDto } from '../../dto/get-workflow-override-response.dto';
import { GetWorkflowOverrideCommand } from './get-workflow-override.command';

@Injectable()
export class GetWorkflowOverride {
  constructor(
    private tenantRepository: TenantRepository,
    private workflowOverrideRepository: WorkflowOverrideRepository
  ) {}

  async execute(command: GetWorkflowOverrideCommand): Promise<GetWorkflowOverrideResponseDto> {
    const workflowOverride = await this.workflowOverrideRepository.findOne({
      _environmentId: command.environmentId,
      _workflowId: command._workflowId,
      _tenantId: command._tenantId,
    });

    if (!workflowOverride) {
      throw new NotFoundException(
        `Workflow Override with workflow id ${command._workflowId}, tenant id ${command._tenantId} not found`
      );
    }

    return workflowOverride;
  }
}
