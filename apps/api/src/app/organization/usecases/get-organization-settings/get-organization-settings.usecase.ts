import { Injectable, NotFoundException } from '@nestjs/common';
import { CommunityOrganizationRepository } from '@novu/dal';
import { DEFAULT_LOCALE } from '@novu/shared';
import { GetOrganizationSettingsDto } from '../../dtos/get-organization-settings.dto';
import { GetOrganizationSettingsCommand } from './get-organization-settings.command';

@Injectable()
export class GetOrganizationSettings {
  constructor(private organizationRepository: CommunityOrganizationRepository) {}

  async execute(command: GetOrganizationSettingsCommand): Promise<GetOrganizationSettingsDto> {
    const organization = command.organization ?? (await this.organizationRepository.findById(command.organizationId));

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return {
      removeNovuBranding: organization.removeNovuBranding || false,
      defaultLocale: organization.defaultLocale || DEFAULT_LOCALE,
      targetLocales: organization.targetLocales || [],
    };
  }
}
