import { Injectable, NotFoundException } from '@nestjs/common';
import { CommunityOrganizationRepository, OrganizationEntity } from '@novu/dal';
import { UpdateOrganizationSettingsCommand } from './update-organization-settings.command';
import { GetOrganizationSettingsDto } from '../../dtos/get-organization-settings.dto';

@Injectable()
export class UpdateOrganizationSettings {
  constructor(private organizationRepository: CommunityOrganizationRepository) {}

  async execute(command: UpdateOrganizationSettingsCommand): Promise<GetOrganizationSettingsDto> {
    const organization = await this.organizationRepository.findById(command.organizationId);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const updateFields = this.buildUpdateFields(command);

    if (Object.keys(updateFields).length === 0) {
      return this.buildSettingsResponse(organization);
    }

    await this.organizationRepository.updateOne({ _id: organization._id }, { $set: updateFields });

    return this.buildSettingsResponse({
      ...organization,
      ...updateFields,
    });
  }

  private buildUpdateFields(command: UpdateOrganizationSettingsCommand): Partial<OrganizationEntity> {
    const updateFields: Partial<OrganizationEntity> = {};

    if (command.removeNovuBranding !== undefined) {
      updateFields.removeNovuBranding = command.removeNovuBranding;
    }

    return updateFields;
  }

  private buildSettingsResponse(organization: OrganizationEntity): GetOrganizationSettingsDto {
    return {
      removeNovuBranding: organization.removeNovuBranding || false,
    };
  }
}
