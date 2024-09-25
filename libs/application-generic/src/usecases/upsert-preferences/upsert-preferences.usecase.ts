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
    return this.upsert({
      templateId: command.templateId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      preferences: command.preferences,
      type: PreferencesTypeEnum.WORKFLOW_RESOURCE,
    });
  }

  public async upsertSubscriberGlobalPreferences(
    command: UpsertSubscriberGlobalPreferencesCommand,
  ) {
    return this.upsert({
      _subscriberId: command._subscriberId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      preferences: command.preferences,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    });
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

    const builtPreferences = buildWorkflowPreferences(command.preferences);

    const builtCommand = {
      ...command,
      preferences: builtPreferences,
    };

    if (foundId) {
      return this.updatePreferences(foundId, builtCommand);
    }

    return this.createPreferences(builtCommand);
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
