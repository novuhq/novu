import { Injectable } from '@nestjs/common';
import defaults from 'json-schema-defaults';

import { NotificationTemplateRepository } from '@novu/dal';
import { JsonSchema } from '@novu/framework';

import { ApiException, UpsertControlValuesCommand, UpsertControlValuesUseCase } from '@novu/application-generic';
import { StoreControlVariablesCommand } from './store-control-variables.command';

@Injectable()
export class StoreControlVariablesUseCase {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private upsertControlValuesUseCase: UpsertControlValuesUseCase
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

    const stepDefaultControls = defaults(
      (step.template as any)?.controls?.schema || (step.template as any)?.inputs?.schema,
      {}
    ) as JsonSchema;

    return await this.upsertControlValuesUseCase.execute(
      UpsertControlValuesCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        notificationStepEntity: step,
        workflowId: command.workflowId,
        newControlValues: command.variables,
        controlSchemas: { schema: stepDefaultControls },
      })
    );
  }
}
