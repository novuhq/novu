import { Injectable, NotFoundException } from '@nestjs/common';
import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { UpdateSmsSettingsCommand } from './update-sms-settings.command';

@Injectable()
export class UpdateSmsSettings {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(command: UpdateSmsSettingsCommand): Promise<EnvironmentEntity> {
    await this.environmentRepository.update(
      {
        _id: command.environmentId,
      },
      {
        $set: {
          'channels.sms.twillio.accountSid': command.twillio.accountSid,
          'channels.sms.twillio.authToken': command.twillio.authToken,
          'channels.sms.twillio.phoneNumber': command.twillio.phoneNumber,
        },
      }
    );

    const environment = await this.environmentRepository.findById(command.environmentId);
    if (!environment) throw new NotFoundException(`Environment ${command.environmentId} not found`);

    return environment;
  }
}
