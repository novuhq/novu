import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import {
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  TenantEntity,
  TenantRepository,
  WorkflowOverrideRepository,
} from '@novu/dal';

import { CreateWorkflowOverrideCommand } from './create-workflow-override.command';
import { CreateWorkflowOverrideResponseDto } from '../../dto';

@Injectable()
export class CreateWorkflowOverride {
  constructor(
    private tenantRepository: TenantRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private workflowOverrideRepository: WorkflowOverrideRepository
  ) {}

  async execute(command: CreateWorkflowOverrideCommand): Promise<CreateWorkflowOverrideResponseDto> {
    const { tenant, workflow } = await this.extractEntities(command);

    return await this.workflowOverrideRepository.create({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      _tenantId: tenant._id,
      _workflowId: workflow._id,
      active: command.active,
      preferenceSettings: command.preferenceSettings,
    });
  }

  private async extractEntities(
    command: CreateWorkflowOverrideCommand
  ): Promise<{ tenant: TenantEntity; workflow: NotificationTemplateEntity }> {
    const tenant = await this.tenantRepository.findOne({
      _environmentId: command.environmentId,
      _id: command._tenantId,
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with id ${command._tenantId} is not found`);
    }

    const workflow = await this.notificationTemplateRepository.findOne({
      _environmentId: command.environmentId,
      _id: command._workflowId,
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with id ${command._workflowId} is not found`);
    }

    return { tenant, workflow };
  }
}
