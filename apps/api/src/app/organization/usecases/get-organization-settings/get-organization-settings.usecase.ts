import { Injectable, NotFoundException } from '@nestjs/common';
import { ChannelTypeEnum, CommunityOrganizationRepository, IntegrationRepository, OrganizationEntity } from '@novu/dal';
import { GetOrganizationSettingsCommand } from './get-organization-settings.command';
import { GetOrganizationSettingsDto } from '../../dtos/get-organization-settings.dto';

@Injectable()
export class GetOrganizationSettings {
  constructor(
    private organizationRepository: CommunityOrganizationRepository,
    private integrationRepository: IntegrationRepository
  ) {}

  async execute(command: GetOrganizationSettingsCommand): Promise<GetOrganizationSettingsDto> {
    const organization = await this.organizationRepository.findById(command.organizationId);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const removeNovuBranding = await this.getRemoveNovuBrandingSetting(organization);

    return {
      removeNovuBranding,
    };
  }

  /**
   * Fallback to check integration for migration period
   * TODO: remove integration check when 'removeNovuBranding' migrated to org entity
   */
  private async getRemoveNovuBrandingSetting(organization: OrganizationEntity): Promise<boolean> {
    const { removeNovuBranding, _id } = organization;

    if (removeNovuBranding !== undefined) {
      return removeNovuBranding;
    }

    const hasIntegrationWithBrandingRemoved = await this.integrationRepository.findOne({
      _organizationId: _id,
      channel: ChannelTypeEnum.IN_APP,
      removeNovuBranding: true,
    });

    return !!hasIntegrationWithBrandingRemoved;
  }
}
