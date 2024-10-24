import { Injectable } from '@nestjs/common';
import { PreferencesEntity, PreferencesRepository } from '@novu/dal';
import { buildWorkflowPreferences, PreferencesTypeEnum } from '@novu/shared';
import { UpsertPreferencesCommand } from './upsert-preferences.command';
import { UpsertWorkflowPreferencesCommand } from './upsert-workflow-preferences.command';
import { UpsertSubscriberGlobalPreferencesCommand } from './upsert-subscriber-global-preferences.command';
import { UpsertSubscriberWorkflowPreferencesCommand } from './upsert-subscriber-workflow-preferences.command';
import { UpsertUserWorkflowPreferencesCommand } from './upsert-user-workflow-preferences.command';

@Injectable()
export class UpsertPreferences {
  constructor(private preferencesRepository: PreferencesRepository) {}

  public async upsertWorkflowPreferences(
    command: UpsertWorkflowPreferencesCommand,
  ) {
    /*
     * Only Workflow Preferences need to be built with default values to ensure
     * there is always a value to fall back to during preference merging.
     */
    const builtPreferences = buildWorkflowPreferences(command.preferences);

    return this.upsert({
      templateId: command.templateId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      preferences: builtPreferences,
      type: PreferencesTypeEnum.WORKFLOW_RESOURCE,
    });
  }

  public async upsertSubscriberGlobalPreferences(
    command: UpsertSubscriberGlobalPreferencesCommand,
  ) {
    await this.deleteSubscriberChannelPreferences(command);

    return this.upsert({
      _subscriberId: command._subscriberId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      preferences: command.preferences,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    });
  }

  private async deleteSubscriberChannelPreferences(
    command: UpsertSubscriberGlobalPreferencesCommand,
  ) {
    const channelTypes = Object.keys(command.preferences?.channels || {});

    const preferenceUnsetPayload = channelTypes.reduce((acc, channelType) => {
      acc[`preferences.channels.${channelType}`] = '';

      return acc;
    }, {});

    await this.preferencesRepository.update(
      {
        _organizationId: command.organizationId,
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

  public async upsertUserWorkflowPreferences(
    command: UpsertUserWorkflowPreferencesCommand,
  ) {
    return this.upsert({
      userId: command.userId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      preferences: command.preferences,
      templateId: command.templateId,
      type: PreferencesTypeEnum.USER_WORKFLOW,
    });
  }

  private async upsert(
    command: UpsertPreferencesCommand,
  ): Promise<PreferencesEntity> {
    const foundId = await this.getPreferencesId(command);

    if (command.preferences === null) {
      return this.deletePreferences(command, foundId);
    }

    if (foundId) {
      return this.updatePreferences(foundId, command);
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
    preferencesId: string,
    command: UpsertPreferencesCommand,
  ): Promise<PreferencesEntity> {
    await this.preferencesRepository.update(
      {
        _id: preferencesId,
        _environmentId: command.environmentId,
      },
      {
        $set: {
          preferences: command.preferences,
          _userId: command.userId,
        },
      },
    );

    return await this.preferencesRepository.findOne({
      _id: preferencesId,
      _environmentId: command.environmentId,
    });
  }

  private async deletePreferences(
    command: UpsertPreferencesCommand,
    preferencesId: string,
  ): Promise<PreferencesEntity> {
    return await this.preferencesRepository.delete({
      _id: preferencesId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _templateId: command.templateId,
    });
  }

  private async getPreferencesId(
    command: UpsertPreferencesCommand,
  ): Promise<string | undefined> {
    const found = await this.preferencesRepository.findOne(
      {
        _subscriberId: command._subscriberId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _templateId: command.templateId,
        type: command.type,
      },
      '_id',
    );

    return found?._id;
  }
}
