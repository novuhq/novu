import { Injectable } from '@nestjs/common';
import { ApplicationEntity, ApplicationRepository } from '@notifire/dal';
import { GetApplicationDataCommand } from './get-application-data.command';

@Injectable()
export class GetApplicationData {
  constructor(private applicationRepository: ApplicationRepository) {}

  async execute(command: GetApplicationDataCommand): Promise<Pick<ApplicationEntity, '_id' | 'name' | 'branding'>> {
    const application = await this.applicationRepository.findById(command.applicationId);

    return {
      _id: application._id,
      name: application.name,
      branding: application.branding,
    };
  }
}
