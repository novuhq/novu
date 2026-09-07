import { Injectable, NotFoundException } from '@nestjs/common';
import { UpsertControlValuesCommand, UpsertControlValuesUseCase } from '@novu/application-generic';
import { NotificationTemplateRepository } from '@novu/dal';
import { ControlValuesLevelEnum } from '@novu/shared';
import { StoreControlValuesCommand } from './store-control-values.command';

@Injectable()
export class StoreControlValuesUseCase {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private upsertControlValuesUseCase: UpsertControlValuesUseCase
  ) {}

  async execute(command: StoreControlValuesCommand) {
    const workflowExist = await this.notificationTemplateRepository.findByTriggerIdentifier(
      command.environmentId,
      command.workflowId
    );

    if (!workflowExist) {
      throw new NotFoundException('Workflow not found');
    }

    const step = workflowExist?.steps.find((item) => item.stepId === command.stepId);

    if (!step || !step._id) {
      throw new NotFoundException('Step not found');
    }

    return await this.upsertControlValuesUseCase.execute(
      UpsertControlValuesCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        stepId: step._templateId,
        workflowId: workflowExist._id,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
        newControlValues: command.controlValues,
      })
    );
  }
}
