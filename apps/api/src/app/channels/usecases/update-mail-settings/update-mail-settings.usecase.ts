import { Injectable } from '@nestjs/common';
import { ApplicationEntity, ApplicationRepository } from '@novu/dal';
import { UpdateMailSettingsCommand } from './update-mail-settings.command';

@Injectable()
export class UpdateMailSettings {
  constructor(private applicationRepository: ApplicationRepository) {}

  async execute(command: UpdateMailSettingsCommand): Promise<ApplicationEntity> {
    await this.applicationRepository.update(
      {
        _id: command.applicationId,
      },
      {
        $set: {
          'channels.email.senderEmail': command.senderEmail,
          'channels.email.senderName': command.senderName,
        },
      }
    );

    return await this.applicationRepository.findById(command.applicationId);
  }
}
