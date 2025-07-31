import { BadRequestException, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { buildVariablesKey, CachedResponse, PinoLogger } from '@novu/application-generic';
import { SystemVariablesWithTypes } from '@novu/shared';
import { GetWorkflowVariablesCommand } from './get-workflow-variables.command';

/**
 * @deprecated use usecases in /workflows directory
 */
@Injectable()
export class GetWorkflowVariables {
  constructor(
    private moduleRef: ModuleRef,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: GetWorkflowVariablesCommand) {
    const { environmentId, organizationId } = command;

    return await this.fetchVariables({
      _environmentId: environmentId,
      _organizationId: organizationId,
    });
  }

  @CachedResponse({
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
        if (!require('@novu/ee-shared-services')?.TranslationsService) {
          throw new BadRequestException('Translation module is not loaded');
        }
        const service = this.moduleRef.get(require('@novu/ee-shared-services')?.TranslationsService, { strict: false });
        translationVariables = await service.getTranslationVariables(_environmentId, _organizationId);
      }
    } catch (e) {
      this.logger.error({ err: e }, `Unexpected error while importing enterprise modules`, 'TranslationsService');
    }

    return {
      translations: translationVariables,
      system: SystemVariablesWithTypes,
    };
  }
}
