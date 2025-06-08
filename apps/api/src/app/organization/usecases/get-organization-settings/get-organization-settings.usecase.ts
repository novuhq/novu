import { Injectable, NotFoundException } from '@nestjs/common';
import { CommunityOrganizationRepository, OrganizationEntity } from '@novu/dal';
import { GetOrganizationSettingsCommand } from './get-organization-settings.command';
import { GetOrganizationSettingsDto } from '../../dtos/get-organization-settings.dto';

@Injectable()
export class GetOrganizationSettings {
  constructor(private organizationRepository: CommunityOrganizationRepository) {}

  async execute(command: GetOrganizationSettingsCommand): Promise<GetOrganizationSettingsDto> {
    const organization = await this.organizationRepository.findById(command.organizationId);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return {
      removeNovuBranding: organization.removeNovuBranding || false,
    };
  }
}
