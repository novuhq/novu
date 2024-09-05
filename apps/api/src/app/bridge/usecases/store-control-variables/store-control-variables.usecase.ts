import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import defaults from 'json-schema-defaults';

import { NotificationTemplateRepository, ControlVariablesRepository } from '@novu/dal';
import { ApiException } from '@novu/application-generic';
import { ControlVariablesLevelEnum } from '@novu/shared';

import { StoreControlVariablesCommand } from './store-control-variables.command';

@Injectable()
export class StoreControlVariables {
  constructor(
    private controlVariablesRepository: ControlVariablesRepository,
    private notificationTemplateRepository: NotificationTemplateRepository
  ) {}

  private difference(object, base) {
    const changes = (objectControl, baseControl) => {
      return _.transform(objectControl, function (result, value, key) {
        if (!_.isEqual(value, base[key])) {
          // eslint-disable-next-line no-param-reassign
          result[key] = _.isObject(value) && _.isObject(baseControl[key]) ? changes(value, baseControl[key]) : value;
        }
      });
    };

    return changes(object, base);
  }

  async execute(command: StoreControlVariablesCommand) {
    const workflowExist = await this.notificationTemplateRepository.findByTriggerIdentifier(
      command.environmentId,
      command.workflowId
    );

    if (!workflowExist) {
      throw new ApiException('Workflow not found');
    }

    const step = workflowExist?.steps.find((item) => item.stepId === command.stepId);

    if (!step) {
      throw new ApiException('Step not found');
    }

    const stepDefault = defaults(
      (step.template as any)?.controls?.schema || (step.template as any)?.inputs?.schema,
      {}
    );

    const variables = this.difference(command.variables, stepDefault);

    const found = await this.controlVariablesRepository.findOne({
      _environmentId: command.environmentId,
      _workflowId: workflowExist._id,
      level: ControlVariablesLevelEnum.STEP_CONTROLS,
      priority: 0,
      stepId: command.stepId,
    });

    if (found) {
      await this.controlVariablesRepository.update(
        {
          _id: found._id,
          _organizationId: command.organizationId,
          _environmentId: command.environmentId,
        },
        {
          level: ControlVariablesLevelEnum.STEP_CONTROLS,
          priority: 0,
          inputs: variables,
          controls: variables,
          workflowId: command.workflowId,
          stepId: command.stepId,
        }
      );

      return this.controlVariablesRepository.findOne({
        _id: found._id,
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
      });
    }

    return await this.controlVariablesRepository.create({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      _workflowId: workflowExist._id,
      _stepId: step._id,
      level: ControlVariablesLevelEnum.STEP_CONTROLS,
      priority: 0,
      inputs: variables,
      controls: variables,
      workflowId: command.workflowId,
      stepId: command.stepId,
    });
  }
}
