import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PreferencesActorEnum,
  PreferencesEntity,
  PreferencesRepository,
} from '@novu/dal';
import { WorkflowOptionsPreferences } from '@novu/framework';
import { FeatureFlagsKeysEnum, IPreferenceChannels } from '@novu/shared';
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
  ): Promise<WorkflowOptionsPreferences> {
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
      return undefined;
    }
  }

  private getSubscriberWorkflowPreferences(
    items: PreferencesEntity[],
    templateId: string,
  ) {
    return items.find(
      (item) =>
        item.actor === PreferencesActorEnum.SUBSCRIBER &&
        item._templateId == templateId,
    );
  }

  private getSubscriberGlobalPreferences(items: PreferencesEntity[]) {
    return items.find(
      (item) =>
        item.actor === PreferencesActorEnum.SUBSCRIBER &&
        item._templateId === undefined,
    );
  }

  private getUserPreferences(items: PreferencesEntity[]) {
    return items.find((item) => item.actor === PreferencesActorEnum.USER);
  }

  private getWorkflowPreferences(items: PreferencesEntity[]) {
    return items.find((item) => item.actor === PreferencesActorEnum.WORKFLOW);
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
