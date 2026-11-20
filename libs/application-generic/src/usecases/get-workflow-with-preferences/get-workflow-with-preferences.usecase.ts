import { Injectable } from '@nestjs/common';
import { NotificationTemplateEntity } from '@novu/dal';
import { buildWorkflowPreferencesFromPreferenceChannels, DEFAULT_WORKFLOW_PREFERENCES } from '@novu/shared';
import { WorkflowWithPreferencesResponseDto } from '../../dtos/get-workflow-with-preferences.dto';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { GetPreferences, GetPreferencesCommand, GetPreferencesResponseDto, PreferenceSet } from '../get-preferences';
import { MergePreferencesCommand } from '../merge-preferences/merge-preferences.command';
import { MergePreferences } from '../merge-preferences/merge-preferences.usecase';
import { GetWorkflowByIdsUseCase } from '../workflow';
import { GetWorkflowWithPreferencesCommand } from './get-workflow-with-preferences.command';

@Injectable()
export class GetWorkflowWithPreferencesUseCase {
  constructor(
    private getWorkflowByIdsUseCase: GetWorkflowByIdsUseCase,
    private getPreferences: GetPreferences
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

    const workflowPreferences = await this.getWorkflowPreferences(command, workflowEntity);

    return this.withPreferences(workflowEntity, workflowPreferences);
  }

  /**
   * Same result as `execute` for workflows the caller already loaded (with `updatedBy` populated),
   * reading the preferences of all of them in one query.
   */
  @Instrument()
  async withPreferencesBulk(
    workflows: NotificationTemplateEntity[],
    { environmentId, organizationId }: { environmentId: string; organizationId: string }
  ): Promise<WorkflowWithPreferencesResponseDto[]> {
    const preferencesByWorkflowId = await this.getPreferences.getWorkflowPreferencesByIds({
      environmentId,
      organizationId,
      workflowIds: workflows.map((workflow) => workflow._id),
    });

    return workflows.map((workflow) => {
      const [workflowResourcePreference, workflowUserPreference] = preferencesByWorkflowId.get(workflow._id) ?? [
        null,
        null,
      ];
      const merged = MergePreferences.execute(
        MergePreferencesCommand.create({
          workflowResourcePreference: (workflowResourcePreference ??
            undefined) as PreferenceSet['workflowResourcePreference'],
          workflowUserPreference: (workflowUserPreference ?? undefined) as PreferenceSet['workflowUserPreference'],
        })
      );

      return this.withPreferences(workflow, merged.preferences ? merged : undefined);
    });
  }

  private withPreferences(
    workflowEntity: NotificationTemplateEntity,
    workflowPreferences: GetPreferencesResponseDto | undefined
  ): WorkflowWithPreferencesResponseDto {
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
        skipCache: command.skipPreferencesCache,
      })
    );
  }
}
