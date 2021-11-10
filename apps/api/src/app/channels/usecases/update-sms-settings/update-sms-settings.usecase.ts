import { Injectable } from '@nestjs/common';
import { ApplicationEntity, ApplicationRepository } from '@notifire/dal';
import { UpdateSmsSettingsCommand } from './update-sms-settings.command';

@Injectable()
export class UpdateSmsSettings {
  constructor(private applicationRepository: ApplicationRepository) {}

  async execute(command: UpdateSmsSettingsCommand): Promise<ApplicationEntity> {
    await this.applicationRepository.update(
      {
        _id: command.applicationId,
      },
      {
        $set: {
          'channels.sms.twillio.accountSid': command.twillio.accountSid,
          'channels.sms.twillio.authToken': command.twillio.authToken,
          'channels.sms.twillio.phoneNumber': command.twillio.phoneNumber,
        },
      }
    );

    return await this.applicationRepository.findById(command.applicationId);
  }
}
