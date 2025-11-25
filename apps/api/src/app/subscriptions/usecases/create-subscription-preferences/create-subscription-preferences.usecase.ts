import { Injectable } from '@nestjs/common';
import { GetPreferences, GetPreferencesCommand, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { PreferencesRepository } from '@novu/dal';
import {
  buildWorkflowPreferences,
  PreferencesTypeEnum,
  SeverityLevelEnum,
  WorkflowPreferences,
  WorkflowPreferencesPartial,
} from '@novu/shared';
import { RulesLogic } from 'json-logic-js';
import { SubscriptionPreferenceDto } from '../../../shared/dtos/subscriptions/create-subscriptions-response.dto';
import { CreateSubscriptionPreferencesCommand } from './create-subscription-preferences.command';

@Injectable()
export class CreateSubscriptionPreferencesUsecase {
  constructor(
    private preferencesRepository: PreferencesRepository,
    private getPreferences: GetPreferences,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: CreateSubscriptionPreferencesCommand): Promise<SubscriptionPreferenceDto[] | undefined> {
    if (!command.preferences.length || !command.workflows.length) {
      return undefined;
    }

    const preferencesResult: SubscriptionPreferenceDto[] = [];

    for (const workflow of command.workflows) {
      const workflowPreferences = await this.getWorkflowPreferences(command, workflow);

      if (!workflowPreferences) {
        continue;
      }

      const createdPreference = await this.preferencesRepository.create({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _subscriberId: command._subscriberId,
        _templateId: workflow._id,
        _topicSubscriptionId: command.subscriptionId,
        type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
        preferences: workflowPreferences,
      });

      if (createdPreference) {
        preferencesResult.push({
          workflow: {
            id: workflow._id,
            identifier: workflow.triggers?.[0]?.identifier || '',
            name: workflow.name || '',
            critical: workflow.critical || false,
            tags: workflow.tags,
            data: workflow.data,
            severity: workflow.severity || SeverityLevelEnum.NONE,
          },
          subscriptionId: command.subscriptionId,
          enabled: createdPreference.preferences?.all?.enabled ?? true,
          condition: createdPreference.preferences?.all?.condition as RulesLogic | undefined,
        });
      }
    }

    return preferencesResult.length > 0 ? preferencesResult : undefined;
  }

  private async getWorkflowPreferences(
    command: CreateSubscriptionPreferencesCommand,
    workflow: { _id: string; tags?: string[]; triggers?: Array<{ identifier?: string }> }
  ): Promise<WorkflowPreferences | undefined> {
    const preferenceFilterDefinition = this.findPreferenceFilterDefinition(command, workflow);
    let enabled: boolean | undefined;

    if (preferenceFilterDefinition?.enabled !== undefined) {
      enabled = preferenceFilterDefinition.enabled;
    } else {
      enabled = (
        await this.getPreferences.safeExecute(
          GetPreferencesCommand.create({
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            templateId: workflow._id,
            subscriberId: command._subscriberId,
          })
        )
      )?.preferences.all?.enabled;
    }

    const partialPreferences: WorkflowPreferencesPartial = {
      all: {
        enabled,
        readOnly: false,
        ...(preferenceFilterDefinition?.condition !== undefined && { condition: preferenceFilterDefinition.condition }),
      },
    };

    return buildWorkflowPreferences(partialPreferences);
  }

  private findPreferenceFilterDefinition(
    command: CreateSubscriptionPreferencesCommand,
    workflow: { _id: string; tags?: string[]; triggers?: Array<{ identifier?: string }> }
  ) {
    return command.preferences.find((pref) => {
      if (pref.filter.tags && pref.filter.tags.length > 0) {
        return workflow.tags && pref.filter.tags.some((tag) => workflow.tags?.includes(tag));
      }
      if (pref.filter.workflowIds && pref.filter.workflowIds.length > 0) {
        return pref.filter.workflowIds.some((id) => {
          const workflowIdentifier = workflow.triggers?.[0]?.identifier;
          return id === workflow._id || id === workflowIdentifier;
        });
      }
      return false;
    });
  }
}
