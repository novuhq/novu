import { Injectable } from '@nestjs/common';
import { OrganizationEntity, OrganizationRepository } from '@novu/dal';
import { GetOrganizationDataCommand } from './get-organization-data.command';

@Injectable()
export class GetOrganizationData {
  constructor(private organizationRepository: OrganizationRepository) {}

  async execute(command: GetOrganizationDataCommand): Promise<Pick<OrganizationEntity, '_id' | 'name' | 'branding'>> {
    const environment = await this.organizationRepository.findById(command.organizationId);

    return {
      _id: environment._id,
      name: environment.name,
      branding: environment.branding,
    };
  }
}
