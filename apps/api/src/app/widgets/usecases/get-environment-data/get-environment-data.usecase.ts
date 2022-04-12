import { Injectable } from '@nestjs/common';
import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { GetEnvironmentDataCommand } from './get-environment-data.command';

@Injectable()
export class GetEnvironmentData {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(command: GetEnvironmentDataCommand): Promise<Pick<EnvironmentEntity, '_id' | 'name' | 'branding'>> {
    const environment = await this.environmentRepository.findById(command.environmentId);

    return {
      _id: environment._id,
      name: environment.name,
      branding: environment.branding,
    };
  }
}
