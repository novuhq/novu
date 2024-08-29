import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PreferencesActorEnum,
  PreferencesEntity,
  PreferencesRepository,
} from '@novu/dal';

import { WritePreferencesCommand } from './write-preferences.command';

@Injectable()
export class WritePreferences {
  constructor(private preferencesRepository: PreferencesRepository) {}

  async execute(command: WritePreferencesCommand): Promise<PreferencesEntity> {
    const foundId = await this.getPreferencesId(command);

    if (foundId) {
      return this.updatePreferences(foundId, command);
    }

    return this.createPreferences(command);
  }

  private async createPreferences(
    command: WritePreferencesCommand
  ): Promise<PreferencesEntity> {
    const isSubscriber = command.actor === PreferencesActorEnum.SUBSCRIBER;
    const isUser = command.actor === PreferencesActorEnum.USER;

    if (!isSubscriber && !command.templateId) {
      throw new BadRequestException('Template id is missing for preferences');
    }

    if (isSubscriber && !command.subscriberId) {
      throw new BadRequestException('Subscriber id is missing for preferences');
    }

    if (isUser && !command.userId) {
      throw new BadRequestException('User id is missing for preferences');
    }

    return await this.preferencesRepository.create({
      _subscriberId: command.subscriberId,
      _userId: command.userId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _templateId: command.templateId,
      actor: command.actor,
      preferences: command.preferences,
    });
  }

  private async updatePreferences(
    preferencesId: string,
    command: WritePreferencesCommand
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
      }
    );

    return await this.preferencesRepository.findOne({
      _id: preferencesId,
      _environmentId: command.environmentId,
    });
  }

  private async getPreferencesId(
    command: WritePreferencesCommand
  ): Promise<string | undefined> {
    const found = await this.preferencesRepository.findOne(
      {
        _subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _templateId: command.templateId,
        actor: command.actor,
      },
      '_id'
    );

    return found._id;
  }
}
