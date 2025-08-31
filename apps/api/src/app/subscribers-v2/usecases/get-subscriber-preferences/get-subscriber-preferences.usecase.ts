import { Injectable } from '@nestjs/common';
import { ISubscriberPreferenceResponse, ShortIsPrefixEnum } from '@novu/shared';
import { plainToInstance } from 'class-transformer';
import { buildSlug } from '../../../shared/helpers/build-slug';
import {
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
} from '../../../subscribers/usecases/get-subscriber-global-preference';
import {
  GetSubscriberPreference,
  GetSubscriberPreferenceCommand,
} from '../../../subscribers/usecases/get-subscriber-preference';
import { GetSubscriberPreferencesDto } from '../../dtos/get-subscriber-preferences.dto';
import { SubscriberGlobalPreferenceDto } from '../../dtos/subscriber-global-preference.dto';
import { SubscriberWorkflowPreferenceDto } from '../../dtos/subscriber-workflow-preference.dto';
import { GetSubscriberPreferencesCommand } from './get-subscriber-preferences.command';

@Injectable()
export class GetSubscriberPreferences {
  constructor(
    private getSubscriberGlobalPreference: GetSubscriberGlobalPreference,
    private getSubscriberPreference: GetSubscriberPreference
  ) {}

  async execute(command: GetSubscriberPreferencesCommand): Promise<GetSubscriberPreferencesDto> {
    const globalPreference = await this.fetchGlobalPreference(command);
    const workflowPreferences = await this.fetchWorkflowPreferences(command);

    return plainToInstance(GetSubscriberPreferencesDto, {
      global: globalPreference,
      workflows: workflowPreferences,
    });
  }

  private async fetchGlobalPreference(
    command: GetSubscriberPreferencesCommand
  ): Promise<SubscriberGlobalPreferenceDto> {
    const { preference } = await this.getSubscriberGlobalPreference.execute(
      GetSubscriberGlobalPreferenceCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
        includeInactiveChannels: false,
      })
    );

    return {
      enabled: preference.enabled,
      channels: preference.channels,
    };
  }

  private async fetchWorkflowPreferences(command: GetSubscriberPreferencesCommand) {
    const subscriberWorkflowPreferences = await this.getSubscriberPreference.execute(
      GetSubscriberPreferenceCommand.create({
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
        organizationId: command.organizationId,
        includeInactiveChannels: false,
        criticality: command.criticality,
      })
    );

    return subscriberWorkflowPreferences.map(this.mapToWorkflowPreference);
  }

  private mapToWorkflowPreference(
    subscriberWorkflowPreference: ISubscriberPreferenceResponse
  ): SubscriberWorkflowPreferenceDto {
    const { preference, template } = subscriberWorkflowPreference;

    return {
      enabled: preference.enabled,
      channels: preference.channels,
      overrides: preference.overrides,
      workflow: {
        slug: buildSlug(template.name, ShortIsPrefixEnum.WORKFLOW, template._id),
        identifier: template.triggers[0].identifier,
        name: template.name,
        updatedAt: template.updatedAt,
      },
    };
  }
}
