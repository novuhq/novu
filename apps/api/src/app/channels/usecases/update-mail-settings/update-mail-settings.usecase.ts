import { Injectable } from '@nestjs/common';
import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { UpdateMailSettingsCommand } from './update-mail-settings.command';

@Injectable()
export class UpdateMailSettings {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(command: UpdateMailSettingsCommand): Promise<EnvironmentEntity> {
    await this.environmentRepository.update(
      {
        _id: command.environmentId,
      },
      {
        $set: {
          'channels.email.senderEmail': command.senderEmail,
          'channels.email.senderName': command.senderName,
        },
      }
    );

    return await this.environmentRepository.findById(command.environmentId);
  }
}
