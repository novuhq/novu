import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { SystemVariablesWithTypes } from '@novu/shared';
import { buildVariablesKey, CachedEntity } from '@novu/application-generic';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { GetWorkflowVariablesCommand } from './get-workflow-variables.command';

@Injectable()
export class GetWorkflowVariables {
  constructor(private moduleRef: ModuleRef) {}

  async execute(command: GetWorkflowVariablesCommand) {
    const { environmentId, organizationId } = command;

    return await this.fetchVariables({
      _environmentId: environmentId,
      _organizationId: organizationId,
    });
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
    let translationVariables = {};

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
