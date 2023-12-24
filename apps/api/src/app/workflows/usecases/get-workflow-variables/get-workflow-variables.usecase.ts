import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationTemplateRepository } from '@novu/dal';
import { GetWorkflowVariablesCommand } from './get-workflow-variables.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { ModuleRef } from '@nestjs/core';
import { SystemVariablesWithTypes, TemplateVariableTypeEnum } from '@novu/shared';
import { set, get } from 'lodash';
import { buildVariablesKey, CachedEntity } from '@novu/application-generic';

@Injectable()
export class GetWorkflowVariables {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository, private moduleRef: ModuleRef) {}

  async execute(command: GetWorkflowVariablesCommand) {
    const { workflowId, environmentId, organizationId } = command;
    const workflow = await this.notificationTemplateRepository.findById(workflowId, environmentId);
    if (!workflow) {
      throw new NotFoundException(`Workflow with id ${workflowId} not found`);
    }
    const variableTypeHumanize = {
      [TemplateVariableTypeEnum.STRING]: 'string',
      [TemplateVariableTypeEnum.ARRAY]: 'array',
      [TemplateVariableTypeEnum.BOOLEAN]: 'boolean',
    };

    const variables = workflow?.triggers[0].variables;

    const stepVariables: Record<string, any> = {};
    variables
      .filter((variable) => variable?.type !== TemplateVariableTypeEnum.ARRAY)
      .forEach((variable) => {
        set(stepVariables, variable.name, variable.type && variableTypeHumanize[variable.type]);
      });
    variables
      .filter((variable) => variable?.type === TemplateVariableTypeEnum.ARRAY)
      .forEach((variable) => {
        set(stepVariables, variable.name, [get(stepVariables, variable.name, [])]);
      });

    const variablesWithTypes = await this.fetchVariables({
      _environmentId: environmentId,
      _organizationId: organizationId,
    });

    return { ...variablesWithTypes, variables: stepVariables };
  }

  @CachedEntity({
    builder: (command: { _environmentId: string; _organizationId: string }) =>
      buildVariablesKey({
        _environmentId: command._environmentId,
        _organizationId: command._organizationId,
      }),
  })
  private async fetchVariables({
    _environmentId,
    _organizationId,
  }: {
    _environmentId: string;
    _organizationId: string;
  }) {
    let translationVariables = [];

    try {
      if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
        if (!require('@novu/ee-translation')?.TranslationsService) {
          throw new ApiException('Translation module is not loaded');
        }
        const service = this.moduleRef.get(require('@novu/ee-translation')?.TranslationsService, { strict: false });
        translationVariables = await service.getTranslationVariables(_environmentId, _organizationId);
      }
    } catch (e) {
      Logger.error(e, `Unexpected error while importing enterprise modules`, 'TranslationsService');
    }

    return {
      translations: translationVariables,
      system: SystemVariablesWithTypes,
    };
  }
}
