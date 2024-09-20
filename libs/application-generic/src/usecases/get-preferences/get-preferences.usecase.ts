import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PreferencesEntity,
  PreferencesRepository,
  PreferencesTypeEnum,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  FeatureFlagsKeysEnum,
  IPreferenceChannels,
  WorkflowChannelPreferences,
} from '@novu/shared';
import { deepMerge } from '../../utils';
import { GetFeatureFlag, GetFeatureFlagCommand } from '../get-feature-flag';
import { GetPreferencesCommand } from './get-preferences.command';

@Injectable()
export class GetPreferences {
  constructor(
    private preferencesRepository: PreferencesRepository,
    private getFeatureFlag: GetFeatureFlag,
  ) {}

  async execute(
    command: GetPreferencesCommand,
  ): Promise<WorkflowChannelPreferences> {
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

    if (!mergedPreferences) {
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
    const result = await this.getWorkflowChannelPreferences(command);

    if (!result) {
      return undefined;
    }

    return GetPreferences.mapWorkflowChannelPreferencesToChannelPreferences(
      result,
    );
  }

  /** Safely get WorkflowChannelPreferences by returning undefined if none are found */
  public async getWorkflowChannelPreferences(command: {
    environmentId: string;
    organizationId: string;
    subscriberId: string;
    templateId?: string;
  }): Promise<WorkflowChannelPreferences | undefined> {
    try {
      return await this.execute(
        GetPreferencesCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          subscriberId: command.subscriberId,
          templateId: command.templateId,
        }),
      );
    } catch (e) {
      // If we cant find preferences lets return undefined instead of throwing it up to caller to make it easier for caller to handle.
      if ((e as Error).name === NotFoundException.name) {
        return undefined;
      }
      throw e;
    }
  }

  /** Transform WorkflowChannelPreferences into IPreferenceChannels */
  public static mapWorkflowChannelPreferencesToChannelPreferences(
    workflowPreferences: WorkflowChannelPreferences,
  ): IPreferenceChannels {
    return {
      in_app:
        workflowPreferences.channels.in_app.defaultValue !== undefined
          ? workflowPreferences.channels.in_app.defaultValue
          : workflowPreferences.workflow.defaultValue,
      sms:
        workflowPreferences.channels.sms.defaultValue !== undefined
          ? workflowPreferences.channels.sms.defaultValue
          : workflowPreferences.workflow.defaultValue,
      email:
        workflowPreferences.channels.email.defaultValue !== undefined
          ? workflowPreferences.channels.email.defaultValue
          : workflowPreferences.workflow.defaultValue,
      push:
        workflowPreferences.channels.push.defaultValue !== undefined
          ? workflowPreferences.channels.push.defaultValue
          : workflowPreferences.workflow.defaultValue,
      chat:
        workflowPreferences.channels.chat.defaultValue !== undefined
          ? workflowPreferences.channels.chat.defaultValue
          : workflowPreferences.workflow.defaultValue,
    };
  }

  /** Determine if Workflow Preferences should be marked as critical / readOnly at the top level */
  public static checkIfWorkflowPreferencesIsReadOnly(
    workflowPreferences?: WorkflowChannelPreferences,
  ): boolean {
    if (!workflowPreferences) {
      return false;
    }

    return (
      workflowPreferences.workflow.readOnly ||
      Object.values(workflowPreferences.channels).some(
        ({ readOnly }) => readOnly,
      )
    );
  }

  private mergePreferences(
    items: PreferencesEntity[],
    workflowId?: string,
  ): WorkflowChannelPreferences | undefined {
    const workflowPreferences = this.getWorkflowPreferences(items);
    const userPreferences = this.getUserPreferences(items);

    const resourcePreferences = deepMerge(
      [workflowPreferences, userPreferences]
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
    const preferences = [
      workflowPreferences,
      userPreferences,
      subscriberGlobalPreferences,
      subscriberWorkflowPreferences,
    ]
      .filter((preference) => preference !== undefined)
      .map((item) => item.preferences);

    // ensure we don't merge on an empty list
    if (preferences.length === 0) {
      return;
    }

    /**
     * Order is (almost exactly) reversed of that above because 'readOnly' should be prioritized
     * by the Dashboard (userPreferences) the most.
     */
    const orderedPreferencesForReadOnly = [
      subscriberWorkflowPreferences,
      subscriberGlobalPreferences,
      workflowPreferences,
      userPreferences,
    ]
      .filter((preference) => preference !== undefined)
      .map((item) => item.preferences);

    const readOnlyPreferences = orderedPreferencesForReadOnly.map(
      ({ workflow, channels }) => ({
        workflow: { readOnly: workflow.readOnly },
        channels: {
          in_app: { readOnly: channels.in_app.readOnly },
          email: { readOnly: channels.email.readOnly },
          sms: { readOnly: channels.sms.readOnly },
          chat: { readOnly: channels.chat.readOnly },
          push: { readOnly: channels.push.readOnly },
        },
      }),
    ) as WorkflowChannelPreferences[];

    // by merging only the read-only values after the full objects, we ensure that only the readOnly field is affected.
    const readOnlyPreference = deepMerge([...readOnlyPreferences]);

    // if there is no subscriber preferences, we return the resource preferences
    if (Object.keys(subscriberPreferences).length === 0) {
      return resourcePreferences;
    }

    // if the workflow should be readonly, we return the resource preferences default value for workflow.
    if (readOnlyPreference?.workflow?.readOnly) {
      subscriberPreferences.workflow.defaultValue =
        resourcePreferences?.workflow?.defaultValue;
    }

    // if the workflow channel should be readonly, we return the resource preferences default value for channel.
    for (const channel of Object.values(ChannelTypeEnum)) {
      if (readOnlyPreference?.channels[channel]?.readOnly) {
        subscriberPreferences.channels[channel].defaultValue =
          resourcePreferences?.channels[channel]?.defaultValue;
      }
    }

    // making sure we respond with correct readonly values.
    return deepMerge([subscriberPreferences, readOnlyPreference]);
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

  private getSubscriberGlobalPreferences(items: PreferencesEntity[]) {
    return items.find(
      (item) => item.type === PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    );
  }

  private getUserPreferences(items: PreferencesEntity[]) {
    return items.find(
      (item) => item.type === PreferencesTypeEnum.USER_WORKFLOW,
    );
  }

  private getWorkflowPreferences(items: PreferencesEntity[]) {
    return items.find(
      (item) => item.type === PreferencesTypeEnum.WORKFLOW_RESOURCE,
    );
  }

  private async getPreferencesFromDb(command: GetPreferencesCommand) {
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
