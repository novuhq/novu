import { Injectable, NotFoundException } from '@nestjs/common';

import {
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  TenantEntity,
  TenantRepository,
  WorkflowOverrideRepository,
  WorkflowOverrideEntity,
} from '@novu/dal';
import { UpdateWorkflowOverrideCommand } from './update-workflow-override.command';
import { UpdateWorkflowOverrideResponseDto } from '../../dto/update-workflow-override-response.dto';

@Injectable()
export class UpdateWorkflowOverride {
  constructor(
    private tenantRepository: TenantRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private workflowOverrideRepository: WorkflowOverrideRepository
  ) {}

  async execute(command: UpdateWorkflowOverrideCommand): Promise<UpdateWorkflowOverrideResponseDto> {
    const { tenant, workflow } = await this.extractEntities(command);

    const currentOverrideEntity = await this.workflowOverrideRepository.findOne({
      _environmentId: command.environmentId,
      _workflowId: workflow._id,
      _tenantId: tenant._id,
    });

    if (!currentOverrideEntity) {
      throw new NotFoundException(
        `Workflow override with workflow id ${command._workflowId} and tenant identifier ${command.tenantIdentifier} was not found`
      );
    }

    const updatePayload: Partial<WorkflowOverrideEntity> = {};

    if (command.active != null) {
      updatePayload.active = command.active;
    }

    if (command.preferenceSettings != null) {
      updatePayload.preferenceSettings = {
        ...currentOverrideEntity.preferenceSettings,
        ...command.preferenceSettings,
      };
    }

    await this.workflowOverrideRepository.update(
      {
        _environmentId: command.environmentId,
        _id: currentOverrideEntity._id,
      },
      {
        $set: updatePayload,
      }
    );

    return { ...currentOverrideEntity, ...updatePayload };
  }

  private async extractEntities(
    command: UpdateWorkflowOverrideCommand
  ): Promise<{ tenant: TenantEntity; workflow: NotificationTemplateEntity }> {
    const tenant = await this.tenantRepository.findOne({
      _environmentId: command.environmentId,
      identifier: command.tenantIdentifier,
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with identifier ${command.tenantIdentifier} is not found`);
    }

    const workflow = await this.notificationTemplateRepository.findOne({
      _environmentId: command.environmentId,
      _id: command._workflowId,
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with _workflowId ${command._workflowId} is not found`);
    }

    return { tenant, workflow };
  }
}
