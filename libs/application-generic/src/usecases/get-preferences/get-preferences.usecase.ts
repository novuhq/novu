import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PreferencesActorEnum,
  PreferencesEntity,
  PreferencesRepository,
  PreferencesTypeEnum,
} from '@novu/dal';
import {
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

    const workflowPreferences = this.getWorkflowPreferences(items);

    const userPreferences = this.getUserPreferences(items);

    const subscriberGlobalPreferences =
      this.getSubscriberGlobalPreferences(items);

    const subscriberWorkflowPreferences = this.getSubscriberWorkflowPreferences(
      items,
      command.templateId,
    );

    /*
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
      throw new NotFoundException('We could not find any preferences');
    }

    return deepMerge(preferences);
  }

  public async getPreferenceChannels(command: {
    environmentId: string;
    organizationId: string;
    subscriberId: string;
    templateId?: string;
  }): Promise<IPreferenceChannels | undefined> {
    try {
      const result = await this.execute(
        GetPreferencesCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          subscriberId: command.subscriberId,
          templateId: command.templateId,
        }),
      );

      return {
        in_app:
          result.channels.in_app.defaultValue || result.workflow.defaultValue,
        sms: result.channels.sms.defaultValue || result.workflow.defaultValue,
        email:
          result.channels.email.defaultValue || result.workflow.defaultValue,
        push: result.channels.push.defaultValue || result.workflow.defaultValue,
        chat: result.channels.chat.defaultValue || result.workflow.defaultValue,
      };
    } catch (e) {
      // If we cant find preferences lets return undefined instead of throwing it up to caller to make it easier for caller to handle.
      if ((e as Error).name === NotFoundException.name) {
        return undefined;
      }
      throw e;
    }
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

    if (command.templateId) {
      const workflowPreferences = await this.preferencesRepository.find({
        _templateId: command.templateId,
        _environmentId: command.environmentId,
        actor: {
          $ne: PreferencesActorEnum.SUBSCRIBER,
        },
      });

      items.push(...workflowPreferences);
    }

    if (command.subscriberId) {
      const subscriberPreferences = await this.preferencesRepository.find({
        _subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
        actor: PreferencesActorEnum.SUBSCRIBER,
      });

      items.push(...subscriberPreferences);
    }

    return items;
  }
}
