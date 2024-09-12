import { Injectable } from '@nestjs/common';
import defaults from 'json-schema-defaults';

import { NotificationTemplateRepository } from '@novu/dal';
import { ApiException, UpsertControlVariables, UpsertControlVariablesCommand } from '@novu/application-generic';
import { JsonSchema } from '@novu/framework';

import { StoreControlVariablesCommand } from './store-control-variables.command';

@Injectable()
export class StoreControlVariables {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private upsertControlVariables: UpsertControlVariables
  ) {}

  async execute(command: StoreControlVariablesCommand) {
    const workflowExist = await this.notificationTemplateRepository.findByTriggerIdentifier(
      command.environmentId,
      command.workflowId
    );

    if (!workflowExist) {
      throw new ApiException('Workflow not found');
    }

    const step = workflowExist?.steps.find((item) => item.stepId === command.stepId);

    if (!step || !step._id) {
      throw new ApiException('Step not found');
    }

    const stepDefaultContorls = defaults(
      (step.template as any)?.controls?.schema || (step.template as any)?.inputs?.schema,
      {}
    ) as JsonSchema;

    return await this.upsertControlVariables.execute(
      UpsertControlVariablesCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        _workflowId: workflowExist._id,
        workflowId: command.workflowId,
        _stepId: step._id,
        stepId: command.stepId,
        controlValues: command.variables,
        defaultControls: { schema: stepDefaultContorls },
      })
    );
  }
}
