import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PreferencesActorEnum,
  PreferencesEntity,
  PreferencesRepository,
} from '@novu/dal';
import { WorkflowOptionsPreferences } from '@novu/framework';
import { deepMerge } from '../../utils';
import { GetPreferencesCommand } from './get-preferences.command';

@Injectable()
export class GetPreferences {
  constructor(private preferencesRepository: PreferencesRepository) {}

  async execute(
    command: GetPreferencesCommand
  ): Promise<WorkflowOptionsPreferences> {
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
}
