import { Injectable } from '@nestjs/common';

import { type ControlValuesEntity, ControlValuesRepository } from '@novu/dal';
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
    const mergedControlValues = this.preserveExternallySetFields(found.controls, controlValues);

    await this.controlValuesRepository.update(
      {
        _id: found._id,
        _organizationId: command.organizationId,
      },
      {
        priority: 0,
        controls: mergedControlValues,
      }
    );

    return this.controlValuesRepository.findOne({
      _id: found._id,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });
  }

  /*
   * stepResolverHash is set externally by the deploy endpoint (novu email publish).
   * The dashboard never includes this key in its saves (it is stripped before submission).
   * Rules:
   *   - Key absent in incoming → preserve the existing hash (normal dashboard save).
   *   - Key present in incoming (even as null) → use the incoming value, allowing callers
   *     to explicitly clear the hash (e.g. email block sets it to null when switching away
   *     from react-email renderer).
   */
  private preserveExternallySetFields(
    existingControls: Record<string, unknown> | null | undefined,
    incomingControls: Record<string, unknown>
  ): Record<string, unknown> {
    const existingHash = existingControls?.stepResolverHash;

    if (existingHash && !('stepResolverHash' in incomingControls)) {
      return { ...incomingControls, stepResolverHash: existingHash };
    }

    return incomingControls;
  }
}
