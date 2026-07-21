import { Injectable } from '@nestjs/common';
import { NotificationTemplateEntity } from '@novu/dal';
import {
  buildWorkflowPreferencesFromPreferenceChannels,
  DEFAULT_WORKFLOW_PREFERENCES,
  FeatureFlagsKeysEnum,
} from '@novu/shared';
import { WorkflowWithPreferencesResponseDto } from '../../dtos/get-workflow-with-preferences.dto';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { FeatureFlagsService } from '../../services';
import { GetPreferences, GetPreferencesCommand } from '../get-preferences';
import {
  filterPreferenceChannelsByFeatureFlags,
  filterWorkflowPreferencesByFeatureFlags,
} from '../get-subscriber-template-preference/preference-channels.utils';
import { GetWorkflowByIdsUseCase } from '../workflow';
import { GetWorkflowWithPreferencesCommand } from './get-workflow-with-preferences.command';

@Injectable()
export class GetWorkflowWithPreferencesUseCase {
  constructor(
    private getWorkflowByIdsUseCase: GetWorkflowByIdsUseCase,
    private getPreferences: GetPreferences,
    private featureFlagsService: FeatureFlagsService
  ) {}

  @InstrumentUsecase()
  async execute(command: GetWorkflowWithPreferencesCommand): Promise<WorkflowWithPreferencesResponseDto> {
    const workflowEntity = await this.getWorkflowByIdsUseCase.execute({
      workflowIdOrInternalId: command.workflowIdOrInternalId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      userId: command.userId,
      session: command.session,
      includeUpdatedBy: true,
    });

    const isToolChannelEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_TOOL_CHANNEL_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
    });

    const workflowPreferences = await this.getWorkflowPreferences(command, workflowEntity);

    /**
     * @deprecated - use `userPreferences` and `defaultPreferences` instead
     */
    const preferenceSettings = filterPreferenceChannelsByFeatureFlags(
      workflowPreferences
        ? GetPreferences.mapWorkflowPreferencesToChannelPreferences(workflowPreferences.preferences)
        : workflowEntity.preferenceSettings,
      { isToolChannelEnabled }
    );
    const userPreferences = filterWorkflowPreferencesByFeatureFlags(
      workflowPreferences
        ? workflowPreferences.source.USER_WORKFLOW
        : buildWorkflowPreferencesFromPreferenceChannels(workflowEntity.critical, workflowEntity.preferenceSettings),
      { isToolChannelEnabled }
    );
    const defaultPreferences = filterWorkflowPreferencesByFeatureFlags(
      workflowPreferences?.source.WORKFLOW_RESOURCE ?? DEFAULT_WORKFLOW_PREFERENCES,
      { isToolChannelEnabled }
    );

    return {
      ...workflowEntity,
      preferenceSettings,
      userPreferences,
      defaultPreferences,
    };
  }

  @Instrument()
  private async getWorkflowPreferences(
    command: GetWorkflowWithPreferencesCommand,
    workflowEntity: NotificationTemplateEntity
  ) {
    return await this.getPreferences.safeExecute(
      GetPreferencesCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        templateId: workflowEntity._id,
      })
    );
  }
}
