import { Injectable } from '@nestjs/common';
import _ from 'lodash';

import { ControlVariablesEntity, ControlVariablesRepository } from '@novu/dal';
import { ControlVariablesLevelEnum } from '@novu/shared';

import { UpsertControlVariablesCommand } from './upsert-control-variables.command';

@Injectable()
export class UpsertControlVariables {
  constructor(private controlVariablesRepository: ControlVariablesRepository) {}

  async execute(command: UpsertControlVariablesCommand) {
    const controlValues = this.difference(
      command.controlValues,
      command.defaultControls.schema,
    );

    const foundControlVariables = await this.controlVariablesRepository.findOne(
      {
        _environmentId: command.environmentId,
        _workflowId: command._workflowId,
        level: ControlVariablesLevelEnum.STEP_CONTROLS,
        priority: 0,
        stepId: command.stepId,
      },
    );

    if (foundControlVariables) {
      return await this.updateControlVariables(
        foundControlVariables,
        command,
        controlValues,
      );
    }

    return await this.controlVariablesRepository.create({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      _workflowId: command._workflowId,
      _stepId: command._stepId,
      level: ControlVariablesLevelEnum.STEP_CONTROLS,
      priority: 0,
      inputs: controlValues,
      controls: controlValues,
      workflowId: command.workflowId,
      stepId: command.stepId,
    });
  }

  private async updateControlVariables(
    found: ControlVariablesEntity,
    command: UpsertControlVariablesCommand,
    controlValues: Record<string, unknown>,
  ) {
    await this.controlVariablesRepository.update(
      {
        _id: found._id,
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
      },
      {
        level: ControlVariablesLevelEnum.STEP_CONTROLS,
        priority: 0,
        inputs: controlValues,
        controls: controlValues,
        workflowId: command.workflowId,
        stepId: command.stepId,
      },
    );

    return this.controlVariablesRepository.findOne({
      _id: found._id,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });
  }

  private difference(object, base) {
    const changes = (objectControl, baseControl) => {
      return _.transform(objectControl, function (result, value, key) {
        if (!_.isEqual(value, base[key])) {
          // eslint-disable-next-line no-param-reassign
          result[key] =
            _.isObject(value) && _.isObject(baseControl[key])
              ? changes(value, baseControl[key])
              : value;
        }
      });
    };

    return changes(object, base);
  }
}
