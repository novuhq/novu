import { Injectable } from '@nestjs/common';
import { OrganizationRepository } from '@novu/dal';
import { OrganizationResponseDto } from '../../dtos/organization-response.dto';
import { GetOrganizationDataCommand } from './get-organization-data.command';

@Injectable()
export class GetOrganizationData {
  constructor(private organizationRepository: OrganizationRepository) {}

  async execute(command: GetOrganizationDataCommand): Promise<OrganizationResponseDto> {
    const environment = await this.organizationRepository.findById(command.organizationId);

    return {
      _id: environment._id,
      name: environment.name,
      branding: environment.branding,
    };
  }
}
