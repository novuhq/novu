import { Injectable, NotFoundException } from '@nestjs/common';

import {
  NotificationTemplateRepository,
  TenantRepository,
  WorkflowOverrideRepository,
  WorkflowOverrideEntity,
} from '@novu/dal';

import { UpdateWorkflowOverrideByIdCommand } from './update-workflow-override-by-id.command';
import { UpdateWorkflowOverrideResponseDto } from '../../dto';

@Injectable()
export class UpdateWorkflowOverrideById {
  constructor(
    private tenantRepository: TenantRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private workflowOverrideRepository: WorkflowOverrideRepository
  ) {}

  async execute(command: UpdateWorkflowOverrideByIdCommand): Promise<UpdateWorkflowOverrideResponseDto> {
    const currentOverrideEntity = await this.workflowOverrideRepository.findOne({
      _environmentId: command.environmentId,
      _id: command.overrideId,
    });

    if (!currentOverrideEntity) {
      throw new NotFoundException(`Workflow override with id ${command.overrideId} not found`);
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
}
