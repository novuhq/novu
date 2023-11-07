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
    if (!command.triggerIdentifier && !command._workflowId) {
      throw new BadRequestException(`Either triggerIdentifier or _workflowId must be provided`);
    }

    const tenant = await this.tenantRepository.findOne({
      _environmentId: command.environmentId,
      identifier: command.tenantIdentifier,
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with identifier ${command.tenantIdentifier} is not found`);
    }

    let workflow: NotificationTemplateEntity | null = null;

    if (command.triggerIdentifier) {
      workflow = await this.notificationTemplateRepository.findByTriggerIdentifier(
        command.environmentId,
        command.triggerIdentifier
      );
    } else if (command._workflowId) {
      workflow = await this.notificationTemplateRepository.findOne({
        _environmentId: command.environmentId,
        _id: command._workflowId,
      });
    }

    if (!workflow) {
      const triggerIdentifier = command.triggerIdentifier ? ` trigger identifier ${command.triggerIdentifier}` : '';
      const workflowId = command._workflowId ? ` trigger identifier ${command._workflowId}` : '';
      throw new Error(`Unexpected error: workflow is not found` + triggerIdentifier + workflowId);
    }

    return { tenant, workflow };
  }
}
