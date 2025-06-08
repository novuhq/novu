import { Injectable } from '@nestjs/common';
import { PreferencesEntity, PreferencesRepository } from '@novu/dal';
import {
  PreferencesTypeEnum,
  WorkflowPreferences,
  WorkflowPreferencesPartial,
} from '@novu/shared';
import { UpsertWorkflowPreferencesCommand } from './upsert-workflow-preferences.command';
import { UpsertSubscriberGlobalPreferencesCommand } from './upsert-subscriber-global-preferences.command';
import { UpsertSubscriberWorkflowPreferencesCommand } from './upsert-subscriber-workflow-preferences.command';
import { UpsertUserWorkflowPreferencesCommand } from './upsert-user-workflow-preferences.command';
import { deepMerge } from '../../utils';
import { Instrument } from '../../instrumentation';

export type WorkflowPreferencesFull = Omit<PreferencesEntity, 'preferences'> & {
  preferences: WorkflowPreferences;
};

type UpsertPreferencesCommand = Omit<
  Partial<
    UpsertWorkflowPreferencesCommand &
      UpsertSubscriberGlobalPreferencesCommand &
      UpsertSubscriberWorkflowPreferencesCommand &
      UpsertUserWorkflowPreferencesCommand
  >,
  'preferences'
> & {
  organizationId: string;
  environmentId: string;
  type: PreferencesTypeEnum;
  preferences: WorkflowPreferencesPartial;
};

@Injectable()
export class UpsertPreferences {
  constructor(private preferencesRepository: PreferencesRepository) {}

  @Instrument()
  public async upsertWorkflowPreferences(
    command: UpsertWorkflowPreferencesCommand,
  ): Promise<WorkflowPreferencesFull> {
    return this.upsert({
      templateId: command.templateId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      preferences: command.preferences,
      type: PreferencesTypeEnum.WORKFLOW_RESOURCE,
    }) as Promise<WorkflowPreferencesFull>;
  }

  @Instrument()
  public async upsertSubscriberGlobalPreferences(
    command: UpsertSubscriberGlobalPreferencesCommand,
  ) {
    await this.deleteSubscriberWorkflowChannelPreferences(command);

    return this.upsert({
      _subscriberId: command._subscriberId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      preferences: command.preferences,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    });
  }

  private async deleteSubscriberWorkflowChannelPreferences(
    command: UpsertSubscriberGlobalPreferencesCommand,
  ) {
    const channelTypes = Object.keys(command.preferences?.channels || {});

    if (channelTypes.length === 0) {
      // If there are no channels to update, we don't need to run the update query
      return;
    }

    const preferenceUnsetPayload = channelTypes.reduce((acc, channelType) => {
      acc[`preferences.channels.${channelType}`] = '';

      return acc;
    }, {});

    await this.preferencesRepository.update(
      {
        _environmentId: command.environmentId,
        _subscriberId: command._subscriberId,
        type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
        $or: channelTypes.map((channelType) => ({
          [`preferences.channels.${channelType}`]: { $exists: true },
        })),
      },
      {
        $unset: preferenceUnsetPayload,
      },
    );
  }

  @Instrument()
  public async upsertSubscriberWorkflowPreferences(
    command: UpsertSubscriberWorkflowPreferencesCommand,
  ) {
    return this.upsert({
      _subscriberId: command._subscriberId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      preferences: command.preferences,
      templateId: command.templateId,
      type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    });
  }

  @Instrument()
  public async upsertUserWorkflowPreferences(
    command: UpsertUserWorkflowPreferencesCommand,
  ): Promise<WorkflowPreferencesFull> {
    return this.upsert({
      userId: command.userId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      preferences: command.preferences,
      templateId: command.templateId,
      type: PreferencesTypeEnum.USER_WORKFLOW,
    }) as Promise<WorkflowPreferencesFull>;
  }

  private async upsert(
    command: UpsertPreferencesCommand,
  ): Promise<PreferencesEntity> {
    const foundPreference = await this.getPreference(command);

    if (foundPreference) {
      return this.updatePreferences(foundPreference, command);
    }

    return this.createPreferences(command);
  }

  private async createPreferences(
    command: UpsertPreferencesCommand,
  ): Promise<PreferencesEntity> {
    return await this.preferencesRepository.create({
      _subscriberId: command._subscriberId,
      _userId: command.userId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _templateId: command.templateId,
      preferences: command.preferences,
      type: command.type,
    });
  }

  private async updatePreferences(
    foundPreference: PreferencesEntity,
    command: UpsertPreferencesCommand,
  ): Promise<PreferencesEntity> {
    const mergedPreferences = deepMerge([
      foundPreference.preferences,
      command.preferences as WorkflowPreferencesPartial,
    ]);

    await this.preferencesRepository.update(
      {
        _id: foundPreference._id,
        _environmentId: command.environmentId,
      },
      {
        $set: {
          preferences: mergedPreferences,
          _userId: command.userId,
        },
      },
    );

    return await this.getPreference(command);
  }

  private async deletePreferences(
    command: UpsertPreferencesCommand,
    preferencesId: string,
  ) {
    return await this.preferencesRepository.delete({
      _id: preferencesId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _templateId: command.templateId,
    });
  }

  private async getPreference(
    command: UpsertPreferencesCommand,
  ): Promise<PreferencesEntity | undefined> {
    return await this.preferencesRepository.findOne({
      _subscriberId: command._subscriberId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _templateId: command.templateId,
      type: command.type,
    });
  }
}
