import { Injectable } from '@nestjs/common';

import { ControlValuesEntity, ControlValuesRepository } from '@novu/dal';
import { ControlValuesLevelEnum } from '@novu/shared';
import { UpsertControlValuesCommand } from './upsert-control-values.command';

@Injectable()
export class UpsertControlValuesUseCase {
  constructor(private controlValuesRepository: ControlValuesRepository) {}

  async execute(command: UpsertControlValuesCommand) {
    const existingControlValues = await this.controlValuesRepository.findFirst({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _workflowId: command.workflowId,
      _stepId: command.stepId,
      _layoutId: command.layoutId,
      level: command.level,
    });

    if (existingControlValues) {
      return await this.updateControlValues(existingControlValues, command, command.newControlValues);
    }

    return await this.controlValuesRepository.create({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      _workflowId: command.workflowId,
      _stepId: command.stepId,
      _layoutId: command.layoutId,
      level: command.level,
      priority: 0,
      controls: command.newControlValues,
    });
  }

  private async updateControlValues(
    found: ControlValuesEntity,
    command: UpsertControlValuesCommand,
    controlValues: Record<string, unknown>
  ) {
    await this.controlValuesRepository.update(
      {
        _id: found._id,
        _organizationId: command.organizationId,
      },
      {
        priority: 0,
        controls: controlValues,
      }
    );

    return this.controlValuesRepository.findOne({
      _id: found._id,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });
  }
}
