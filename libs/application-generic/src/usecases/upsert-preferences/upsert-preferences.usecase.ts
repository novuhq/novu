import { Injectable } from '@nestjs/common';
import {
  PreferencesActorEnum,
  PreferencesEntity,
  PreferencesRepository,
  PreferencesTypeEnum,
} from '@novu/dal';
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
      actor: PreferencesActorEnum.WORKFLOW,
      preferences: command.preferences,
      type: PreferencesTypeEnum.CODE_FIRST_WORKFLOW,
    });
  }

  public async upsertSubscriberGlobalPreferences(
    command: UpsertSubscriberGlobalPreferencesCommand,
  ) {
    return this.upsert({
      subscriberId: command.subscriberId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      actor: PreferencesActorEnum.SUBSCRIBER,
      preferences: command.preferences,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    });
  }

  public async upsertSubscriberWorkflowPreferences(
    command: UpsertSubscriberWorkflowPreferencesCommand,
  ) {
    return this.upsert({
      subscriberId: command.subscriberId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      actor: PreferencesActorEnum.SUBSCRIBER,
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
      actor: PreferencesActorEnum.USER,
      preferences: command.preferences,
      templateId: command.templateId,
      type: PreferencesTypeEnum.USER_WORKFLOW,
    });
  }

  private async upsert(
    command: UpsertPreferencesCommand,
  ): Promise<PreferencesEntity> {
    const foundId = await this.getPreferencesId(command);

    if (foundId) {
      return this.updatePreferences(foundId, command);
    }

    return this.createPreferences(command);
  }

  private async createPreferences(
    command: UpsertPreferencesCommand,
  ): Promise<PreferencesEntity> {
    return await this.preferencesRepository.create({
      _subscriberId: command.subscriberId,
      _userId: command.userId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _templateId: command.templateId,
      actor: command.actor,
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

  private async getPreferencesId(
    command: UpsertPreferencesCommand,
  ): Promise<string | undefined> {
    const found = await this.preferencesRepository.findOne(
      {
        _subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _templateId: command.templateId,
        actor: command.actor,
        type: command.type,
      },
      '_id',
    );

    return found?._id;
  }
}
