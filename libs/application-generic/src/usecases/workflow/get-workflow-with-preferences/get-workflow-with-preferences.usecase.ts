import { forwardRef, Inject, Injectable } from '@nestjs/common';

import { NotificationTemplateEntity } from '@novu/dal';
import { buildWorkflowPreferencesFromPreferenceChannels, DEFAULT_WORKFLOW_PREFERENCES } from '@novu/shared';
import { GetPreferences, GetPreferencesCommand } from '../../get-preferences';

import { GetWorkflowWithPreferencesCommand } from './get-workflow-with-preferences.command';
import { WorkflowWithPreferencesResponseDto } from './get-workflow-with-preferences.dto';
import { Instrument, InstrumentUsecase } from '../../../instrumentation';
import { GetWorkflowByIdsUseCase } from '../get-workflow-by-ids/get-workflow-by-ids.usecase';
import { GetWorkflowByIdsCommand } from '../get-workflow-by-ids/get-workflow-by-ids.command';

@Injectable()
export class GetWorkflowWithPreferencesUseCase {
  constructor(
    private getWorkflowByIdsUseCase: GetWorkflowByIdsUseCase,
    @Inject(forwardRef(() => GetPreferences))
    private getPreferences: GetPreferences
  ) {}

  @InstrumentUsecase()
  async execute(command: GetWorkflowWithPreferencesCommand): Promise<WorkflowWithPreferencesResponseDto> {
    const workflowEntity = await this.getWorkflowByIdsUseCase.execute(
      GetWorkflowByIdsCommand.create({
        workflowIdOrInternalId: command.workflowIdOrInternalId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      })
    );

    const workflowPreferences = await this.getWorkflowPreferences(command, workflowEntity);

    /**
     * @deprecated - use `userPreferences` and `defaultPreferences` instead
     */
    const preferenceSettings = workflowPreferences
      ? GetPreferences.mapWorkflowPreferencesToChannelPreferences(workflowPreferences.preferences)
      : workflowEntity.preferenceSettings;
    const userPreferences = workflowPreferences
      ? workflowPreferences.source.USER_WORKFLOW
      : buildWorkflowPreferencesFromPreferenceChannels(workflowEntity.critical, workflowEntity.preferenceSettings);
    const defaultPreferences = workflowPreferences
      ? workflowPreferences.source.WORKFLOW_RESOURCE
      : DEFAULT_WORKFLOW_PREFERENCES;

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
