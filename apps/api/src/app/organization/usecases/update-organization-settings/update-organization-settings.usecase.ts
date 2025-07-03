import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { CommunityOrganizationRepository, OrganizationEntity } from '@novu/dal';
import { ApiServiceLevelEnum, DEFAULT_LOCALE, FeatureNameEnum, getFeatureForTierAsBoolean } from '@novu/shared';
import { AnalyticsService } from '@novu/application-generic';
import { UpdateOrganizationSettingsCommand } from './update-organization-settings.command';
import { GetOrganizationSettingsDto } from '../../dtos/get-organization-settings.dto';

@Injectable()
export class UpdateOrganizationSettings {
  constructor(
    private organizationRepository: CommunityOrganizationRepository,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: UpdateOrganizationSettingsCommand): Promise<GetOrganizationSettingsDto> {
    const organization = await this.organizationRepository.findById(command.organizationId);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    this.validateTierRestrictions(command, organization);

    const updateFields = this.buildUpdateFields(command);

    if (Object.keys(updateFields).length === 0) {
      return this.buildSettingsResponse(organization);
    }

    await this.organizationRepository.updateOne({ _id: organization._id }, { $set: updateFields });

    if (command.removeNovuBranding !== undefined) {
      this.analyticsService.mixpanelTrack('Remove Branding', command.userId, {
        _organization: command.organizationId,
        newStatus: command.removeNovuBranding,
      });
    }

    return this.buildSettingsResponse({
      ...organization,
      ...updateFields,
    });
  }

  private validateTierRestrictions(command: UpdateOrganizationSettingsCommand, organization: OrganizationEntity): void {
    // Only validate branding feature access if user is trying to update it
    if (command.removeNovuBranding !== undefined) {
      const canRemoveNovuBranding = getFeatureForTierAsBoolean(
        FeatureNameEnum.PLATFORM_REMOVE_NOVU_BRANDING_BOOLEAN,
        organization.apiServiceLevel || ApiServiceLevelEnum.FREE
      );

      if (!canRemoveNovuBranding) {
        throw new HttpException(
          {
            error: 'Payment Required',
            message:
              'Removing Novu branding is not allowed on the free plan. Please upgrade to a paid plan to access this feature.',
          },
          HttpStatus.PAYMENT_REQUIRED
        );
      }
    }
  }

  private buildUpdateFields(command: UpdateOrganizationSettingsCommand): Partial<OrganizationEntity> {
    const updateFields: Partial<OrganizationEntity> = {};

    if (command.removeNovuBranding !== undefined) {
      updateFields.removeNovuBranding = command.removeNovuBranding;
    }

    if (command.defaultLocale !== undefined) {
      updateFields.defaultLocale = command.defaultLocale;
    }

    return updateFields;
  }

  private buildSettingsResponse(organization: OrganizationEntity): GetOrganizationSettingsDto {
    return {
      removeNovuBranding: organization.removeNovuBranding || false,
      defaultLocale: organization.defaultLocale || DEFAULT_LOCALE,
    };
  }
}
