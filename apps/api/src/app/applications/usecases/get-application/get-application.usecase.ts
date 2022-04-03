import { Injectable } from '@nestjs/common';
import { ApplicationRepository } from '@novu/dal';
import { GetApplicationCommand } from './get-application.command';

@Injectable()
export class GetApplication {
  constructor(private applicationRepository: ApplicationRepository) {}

  async execute(command: GetApplicationCommand) {
    return await this.applicationRepository.findOne(
      {
        _id: command.applicationId,
        _organizationId: command.organizationId,
      },
      '-apiKeys'
    );
  }
}
