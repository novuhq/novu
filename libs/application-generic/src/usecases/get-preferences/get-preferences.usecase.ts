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
    private getFeatureFlag: GetFeatureFlag
  ) {}

  async execute(
    command: GetPreferencesCommand
  ): Promise<WorkflowOptionsPreferences> {
    const isEnabled = await this.getFeatureFlag.execute(
      GetFeatureFlagCommand.create({
        userId: 'system',
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        key: FeatureFlagsKeysEnum.IS_WORKFLOW_PREFERENCES_ENABLED,
      })
    );

    if (!isEnabled) {
      throw new NotFoundException();
    }

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

    if (items.length === 0) {
      throw new NotFoundException('We could not find any preferences');
    }

    const workflowPreferences = items.find(
      (item) => item.actor === PreferencesActorEnum.WORKFLOW
    );

    const userPreferences = items.find(
      (item) => item.actor === PreferencesActorEnum.USER
    );

    const subscriberGlobalPreferences = items.find(
      (item) =>
        item.actor === PreferencesActorEnum.SUBSCRIBER &&
        item._templateId === undefined
    );

    const subscriberWorkflowPreferences = items.find(
      (item) =>
        item.actor === PreferencesActorEnum.SUBSCRIBER &&
        item._templateId == command.templateId
    );

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
        })
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
}
