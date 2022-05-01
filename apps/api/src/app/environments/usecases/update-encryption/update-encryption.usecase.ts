import { Injectable } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';
import { UpdateEncryptionCommand } from './update-encryption.command';

@Injectable()
export class UpdateEncryption {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(command: UpdateEncryptionCommand) {
    return await this.environmentRepository.update(
      {
        _organizationId: command.organizationId,
        _id: command.environmentId,
      },
      { $set: { encrypted: command.encrypted } }
    );
  }
}
