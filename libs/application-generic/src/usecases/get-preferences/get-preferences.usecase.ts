import { Injectable, NotFoundException } from '@nestjs/common';
import { PreferencesEntity, PreferencesRepository } from '@novu/dal';
import {
  FeatureFlagsKeysEnum,
  IPreferenceChannels,
  WorkflowPreferences,
  PreferencesTypeEnum,
  buildWorkflowPreferences,
} from '@novu/shared';
import { deepMerge } from '../../utils';
import { GetFeatureFlag, GetFeatureFlagCommand } from '../get-feature-flag';
import { GetPreferencesCommand } from './get-preferences.command';
import { GetPreferencesResponseDto } from './get-preferences.dto';

@Injectable()
export class GetPreferences {
  constructor(
    private preferencesRepository: PreferencesRepository,
    private getFeatureFlag: GetFeatureFlag,
  ) {}

  async execute(
    command: GetPreferencesCommand,
  ): Promise<GetPreferencesResponseDto> {
    const isEnabled = await this.getFeatureFlag.execute(
      GetFeatureFlagCommand.create({
        userId: 'system',
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        key: FeatureFlagsKeysEnum.IS_WORKFLOW_PREFERENCES_ENABLED,
      }),
    );

    if (!isEnabled) {
      throw new NotFoundException();
    }

    const items = await this.getPreferencesFromDb(command);

    if (items.length === 0) {
      throw new NotFoundException('We could not find any preferences');
    }

    const mergedPreferences = this.mergePreferences(items, command.templateId);

    if (!mergedPreferences.preferences) {
      throw new NotFoundException('We could not find any preferences');
    }

    return mergedPreferences;
  }

  /** Get only simple, channel-level enablement flags */
  public async getPreferenceChannels(command: {
    environmentId: string;
    organizationId: string;
    subscriberId: string;
    templateId?: string;
  }): Promise<IPreferenceChannels | undefined> {
    const result = await this.getWorkflowPreferences(command);

    if (!result) {
      return undefined;
    }

    return GetPreferences.mapWorkflowPreferencesToChannelPreferences(result);
  }

  /** Safely get WorkflowPreferences by returning undefined if none are found */
  public async getWorkflowPreferences(command: {
    environmentId: string;
    organizationId: string;
    subscriberId: string;
    templateId?: string;
  }): Promise<WorkflowPreferences | undefined> {
    try {
      const result = await this.execute(
        GetPreferencesCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          subscriberId: command.subscriberId,
          templateId: command.templateId,
        }),
      );

      return result.preferences;
    } catch (e) {
      // If we cant find preferences lets return undefined instead of throwing it up to caller to make it easier for caller to handle.
      if ((e as Error).name === NotFoundException.name) {
        return undefined;
      }
      throw e;
    }
  }

  /** Transform WorkflowPreferences into IPreferenceChannels */
  public static mapWorkflowPreferencesToChannelPreferences(
    workflowPreferences: WorkflowPreferences,
  ): IPreferenceChannels {
    const builtPreferences = buildWorkflowPreferences(workflowPreferences);

    const mappedPreferences = Object.entries(builtPreferences.channels).reduce(
      (acc, [channel, preference]) => ({
        ...acc,
        [channel]: preference.enabled,
      }),
      {} as IPreferenceChannels,
    );

    return mappedPreferences;
  }

  private mergePreferences(
    items: PreferencesEntity[],
    workflowId?: string,
  ): GetPreferencesResponseDto {
    const workflowResourcePreferences =
      this.getWorkflowResourcePreferences(items);
    const workflowUserPreferences = this.getWorkflowUserPreferences(items);

    const workflowPreferences = deepMerge(
      [workflowResourcePreferences, workflowUserPreferences]
        .filter((preference) => preference !== undefined)
        .map((item) => item.preferences),
    );

    const subscriberGlobalPreferences =
      this.getSubscriberGlobalPreferences(items);
    const subscriberWorkflowPreferences = this.getSubscriberWorkflowPreferences(
      items,
      workflowId,
    );

    const subscriberPreferences = deepMerge(
      [subscriberGlobalPreferences, subscriberWorkflowPreferences]
        .filter((preference) => preference !== undefined)
        .map((item) => item.preferences),
    );

    /**
     * Order is important here because we like the workflowPreferences (that comes from the bridge)
     * to be overridden by any other preferences and then we have preferences defined in dashboard and
     * then subscribers global preferences and the once that should be used if it says other then anything before it
     * we use subscribers workflow preferences
     */
    const preferencesEntities = [
      workflowResourcePreferences,
      workflowUserPreferences,
      subscriberGlobalPreferences,
      subscriberWorkflowPreferences,
    ];
    const source = Object.values(PreferencesTypeEnum).reduce(
      (acc, type) => {
        const preference = items.find((item) => item.type === type);
        if (preference) {
          acc[type] = preference.preferences;
        } else {
          acc[type] = null;
        }

        return acc;
      },
      {} as GetPreferencesResponseDto['source'],
    );
    const preferences = preferencesEntities
      .filter((preference) => preference !== undefined)
      .map((item) => item.preferences);

    // ensure we don't merge on an empty list
    if (preferences.length === 0) {
      return { preferences: undefined, type: undefined, source };
    }

    /**
     * Order is (almost exactly) reversed of that above because 'readOnly' should be prioritized
     * by the Dashboard (userPreferences) the most.
     */
    const orderedPreferencesForReadOnly = [
      subscriberWorkflowPreferences,
      subscriberGlobalPreferences,
      workflowResourcePreferences,
      workflowUserPreferences,
    ]
      .filter((preference) => preference !== undefined)
      .map((item) => item.preferences);

    const readOnlyPreferences = orderedPreferencesForReadOnly.map(
      ({ all }) => ({
        all: { readOnly: all.readOnly },
      }),
    ) as WorkflowPreferences[];

    const readOnlyPreference = deepMerge([...readOnlyPreferences]);

    // Determine the most specific preference applied
    let mostSpecificPreference: PreferencesTypeEnum | undefined;
    if (subscriberWorkflowPreferences) {
      mostSpecificPreference = PreferencesTypeEnum.SUBSCRIBER_WORKFLOW;
    } else if (subscriberGlobalPreferences) {
      mostSpecificPreference = PreferencesTypeEnum.SUBSCRIBER_GLOBAL;
    } else if (workflowUserPreferences) {
      mostSpecificPreference = PreferencesTypeEnum.USER_WORKFLOW;
    } else if (workflowResourcePreferences) {
      mostSpecificPreference = PreferencesTypeEnum.WORKFLOW_RESOURCE;
    }

    if (Object.keys(subscriberPreferences).length === 0) {
      return {
        preferences: workflowPreferences,
        type: mostSpecificPreference,
        source,
      };
    }
    // if the workflow should be readonly, we return the resource preferences default value for workflow.
    if (readOnlyPreference?.all?.readOnly) {
      subscriberPreferences.all.enabled = workflowPreferences?.all?.enabled;
    }

    // making sure we respond with correct readonly values.
    const mergedPreferences = deepMerge([
      subscriberPreferences,
      readOnlyPreference,
    ]);

    return {
      preferences: mergedPreferences,
      type: mostSpecificPreference,
      source,
    };
  }

  private getSubscriberWorkflowPreferences(
    items: PreferencesEntity[],
    templateId: string,
  ) {
    return items.find(
      (item) =>
        item.type === PreferencesTypeEnum.SUBSCRIBER_WORKFLOW &&
        item._templateId === templateId,
    );
  }

  private getSubscriberGlobalPreferences(
    items: PreferencesEntity[],
  ): PreferencesEntity | undefined {
    return items.find(
      (item) => item.type === PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    );
  }

  private getWorkflowUserPreferences(
    items: PreferencesEntity[],
  ): PreferencesEntity | undefined {
    return items.find(
      (item) => item.type === PreferencesTypeEnum.USER_WORKFLOW,
    );
  }

  private getWorkflowResourcePreferences(
    items: PreferencesEntity[],
  ): PreferencesEntity | undefined {
    return items.find(
      (item) => item.type === PreferencesTypeEnum.WORKFLOW_RESOURCE,
    );
  }

  private async getPreferencesFromDb(
    command: GetPreferencesCommand,
  ): Promise<PreferencesEntity[]> {
    const items: PreferencesEntity[] = [];

    /*
     * Fetch the Workflow Preferences. This includes:
     * - Workflow Resource Preferences - the Code-defined Workflow Preferences
     * - User Workflow Preferences - the Dashboard-defined Workflow Preferences
     */
    if (command.templateId) {
      const workflowPreferences = await this.preferencesRepository.find({
        _templateId: command.templateId,
        _environmentId: command.environmentId,
        type: {
          $in: [
            PreferencesTypeEnum.WORKFLOW_RESOURCE,
            PreferencesTypeEnum.USER_WORKFLOW,
          ],
        },
      });

      items.push(...workflowPreferences);
    }

    // Fetch the Subscriber Global Preference.
    if (command.subscriberId) {
      const subscriberGlobalPreference = await this.preferencesRepository.find({
        _subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
        type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
      });

      items.push(...subscriberGlobalPreference);
    }

    // Fetch the Subscriber Workflow Preference.
    if (command.subscriberId && command.templateId) {
      const subscriberWorkflowPreference =
        await this.preferencesRepository.find({
          _subscriberId: command.subscriberId,
          _templateId: command.templateId,
          _environmentId: command.environmentId,
          type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
        });

      items.push(...subscriberWorkflowPreference);
    }

    return items;
  }
}
