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
    const tenant = await this.tenantRepository.findOne({
      _environmentId: command.environmentId,
      identifier: command.tenantIdentifier,
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with identifier ${command.tenantIdentifier} is not found`);
    }

    const workflowOverride = await this.workflowOverrideRepository.findOne({
      _environmentId: command.environmentId,
      _workflowId: command._workflowId,
      _tenantId: tenant._id,
    });

    if (!workflowOverride) {
      throw new NotFoundException(
        `Workflow Override with workflow id ${command._workflowId}, tenant identifier ${command.tenantIdentifier} not found`
      );
    }

    return workflowOverride;
  }
}
