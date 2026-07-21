import { Injectable } from '@nestjs/common';

import { type ControlValuesEntity, ControlValuesRepository } from '@novu/dal';
import { UpsertControlValuesCommand } from './upsert-control-values.command';

@Injectable()
export class UpsertControlValuesUseCase {
  constructor(private controlValuesRepository: ControlValuesRepository) {}

  async execute(command: UpsertControlValuesCommand) {
    const sessionOptions = command.session ? { session: command.session } : {};
    const existingControlValues = await this.controlValuesRepository.findOne(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _workflowId: command.workflowId,
        _stepId: command.stepId,
        _layoutId: command.layoutId,
        level: command.level,
        ...(command.providerId ? { providerId: command.providerId } : {}),
      },
      undefined,
      sessionOptions
    );

    if (existingControlValues) {
      return await this.updateControlValues(existingControlValues, command, command.newControlValues);
    }

    return await this.controlValuesRepository.create(
      {
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
        _workflowId: command.workflowId,
        _stepId: command.stepId,
        _layoutId: command.layoutId,
        level: command.level,
        ...(command.providerId ? { providerId: command.providerId } : {}),
        priority: 0,
        controls: command.newControlValues,
      },
      sessionOptions
    );
  }

  private async updateControlValues(
    found: ControlValuesEntity,
    command: UpsertControlValuesCommand,
    controlValues: Record<string, unknown>
  ) {
    const sessionOptions = command.session ? { session: command.session } : {};

    await this.controlValuesRepository.update(
      {
        _id: found._id,
        _organizationId: command.organizationId,
      },
      {
        priority: 0,
        controls: controlValues,
        ...(command.providerId ? { providerId: command.providerId } : {}),
      },
      sessionOptions
    );

    return this.controlValuesRepository.findOne(
      {
        _id: found._id,
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
      },
      undefined,
      sessionOptions
    );
  }
}
