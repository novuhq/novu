import { Injectable } from '@nestjs/common';
import { FeatureFlagsService, GetWorkflowByIdsCommand, GetWorkflowByIdsUseCase } from '@novu/application-generic';
import { ContextRepository } from '@novu/dal';
import { ContextPayload, FeatureFlagsKeysEnum, PreferenceLevelEnum, WorkflowCriticalityEnum } from '@novu/shared';
import { plainToInstance } from 'class-transformer';
import { UpdatePreferencesCommand } from '../../../inbox/usecases/update-preferences/update-preferences.command';
import { UpdatePreferences } from '../../../inbox/usecases/update-preferences/update-preferences.usecase';
import { GetSubscriberPreferencesDto } from '../../dtos/get-subscriber-preferences.dto';
import { GetSubscriberPreferences } from '../get-subscriber-preferences/get-subscriber-preferences.usecase';
import { UpdateSubscriberPreferencesCommand } from './update-subscriber-preferences.command';

@Injectable()
export class UpdateSubscriberPreferences {
  constructor(
    private updatePreferencesUsecase: UpdatePreferences,
    private getSubscriberPreferences: GetSubscriberPreferences,
    private getWorkflowByIdsUseCase: GetWorkflowByIdsUseCase,
    private contextRepository: ContextRepository,
    private featureFlagsService: FeatureFlagsService
  ) {}

  async execute(command: UpdateSubscriberPreferencesCommand): Promise<GetSubscriberPreferencesDto> {
    const contextKeys = await this.resolveContexts(command.environmentId, command.organizationId, command.context);

    let workflowId: string | undefined;
    if (command.workflowIdOrInternalId) {
      const workflowEntity = await this.getWorkflowByIdsUseCase.execute(
        GetWorkflowByIdsCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          workflowIdOrInternalId: command.workflowIdOrInternalId,
        })
      );
      workflowId = workflowEntity._id;
    }

    await this.updatePreferencesUsecase.execute(
      UpdatePreferencesCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
        level: command.workflowIdOrInternalId ? PreferenceLevelEnum.TEMPLATE : PreferenceLevelEnum.GLOBAL,
        workflowIdOrIdentifier: workflowId,
        includeInactiveChannels: false,
        ...command.channels,
        schedule: command.schedule,
        contextKeys,
      })
    );

    const subscriberPreferences = await this.getSubscriberPreferences.execute({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      subscriberId: command.subscriberId,
      criticality: WorkflowCriticalityEnum.NON_CRITICAL,
      contextKeys,
    });

    return plainToInstance(GetSubscriberPreferencesDto, {
      global: subscriberPreferences.global,
      workflows: subscriberPreferences.workflows,
    });
  }

  private async resolveContexts(
    environmentId: string,
    organizationId: string,
    context?: ContextPayload
  ): Promise<string[] | undefined> {
    // Check if context preferences feature is enabled
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
      defaultValue: false,
      organization: { _id: organizationId },
    });

    if (!isEnabled) {
      return undefined; // Ignore context when FF is off
    }

    if (!context) {
      return [];
    }

    const contexts = await this.contextRepository.findOrCreateContextsFromPayload(
      environmentId,
      organizationId,
      context
    );

    return contexts.map((ctx) => ctx.key);
  }
}
