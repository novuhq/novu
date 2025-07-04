import { Body, ClassSerializerInterceptor, Controller, Get, Patch, Put, UseInterceptors } from '@nestjs/common';
import { PermissionsEnum, UserSessionData } from '@novu/shared';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import { UserSession } from '../shared/framework/user.decorator';
import { UpdateBrandingDetailsCommand } from './usecases/update-branding-details/update-branding-details.command';
import { UpdateBrandingDetails } from './usecases/update-branding-details/update-branding-details.usecase';
import { GetMyOrganization } from './usecases/get-my-organization/get-my-organization.usecase';
import { GetMyOrganizationCommand } from './usecases/get-my-organization/get-my-organization.command';
import { IGetMyOrganizationDto } from './dtos/get-my-organization.dto';
import { RenameOrganizationCommand } from './usecases/rename-organization/rename-organization-command';
import { RenameOrganization } from './usecases/rename-organization/rename-organization.usecase';
import { RenameOrganizationDto } from './dtos/rename-organization.dto';
import { UpdateBrandingDetailsDto } from './dtos/update-branding-details.dto';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { OrganizationBrandingResponseDto, OrganizationResponseDto } from './dtos/organization-response.dto';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { GetOrganizationSettings } from './usecases/get-organization-settings/get-organization-settings.usecase';
import { GetOrganizationSettingsCommand } from './usecases/get-organization-settings/get-organization-settings.command';
import { UpdateOrganizationSettings } from './usecases/update-organization-settings/update-organization-settings.usecase';
import { UpdateOrganizationSettingsCommand } from './usecases/update-organization-settings/update-organization-settings.command';
import { UpdateOrganizationSettingsDto } from './dtos/update-organization-settings.dto';
import { GetOrganizationSettingsDto } from './dtos/get-organization-settings.dto';

@Controller('/organizations')
@UseInterceptors(ClassSerializerInterceptor)
@RequireAuthentication()
@ApiTags('Organizations')
@ApiCommonResponses()
@ApiExcludeController()
export class EEOrganizationController {
  constructor(
    private updateBrandingDetailsUsecase: UpdateBrandingDetails,
    private getMyOrganizationUsecase: GetMyOrganization,
    private renameOrganizationUsecase: RenameOrganization,
    private getOrganizationSettingsUsecase: GetOrganizationSettings,
    private updateOrganizationSettingsUsecase: UpdateOrganizationSettings
  ) {}

  /**
   * @deprecated - used in v1 legacy web
   */
  @Get('/me')
  @ApiResponse(OrganizationResponseDto)
  @ApiOperation({
    summary: 'Fetch current organization details',
  })
  async getMyOrganization(@UserSession() user: UserSessionData): Promise<IGetMyOrganizationDto> {
    const command = GetMyOrganizationCommand.create({
      userId: user._id,
      id: user.organizationId,
    });

    return await this.getMyOrganizationUsecase.execute(command);
  }

  /**
   * @deprecated - used in v1 legacy web
   */
  @Put('/branding')
  @ApiResponse(OrganizationBrandingResponseDto)
  @ApiOperation({
    summary: 'Update organization branding details',
  })
  async updateBrandingDetails(@UserSession() user: UserSessionData, @Body() body: UpdateBrandingDetailsDto) {
    return await this.updateBrandingDetailsUsecase.execute(
      UpdateBrandingDetailsCommand.create({
        logo: body.logo,
        color: body.color,
        userId: user._id,
        id: user.organizationId,
        fontColor: body.fontColor,
        fontFamily: body.fontFamily,
        contentBackground: body.contentBackground,
      })
    );
  }

  /**
   * @deprecated - used in v1 legacy web
   */
  @Patch('/')
  @ApiResponse(RenameOrganizationDto)
  @ApiOperation({
    summary: 'Rename organization name',
  })
  async renameOrganization(@UserSession() user: UserSessionData, @Body() body: RenameOrganizationDto) {
    return await this.renameOrganizationUsecase.execute(
      RenameOrganizationCommand.create({
        name: body.name,
        userId: user._id,
        id: user.organizationId,
      })
    );
  }

  @Get('/settings')
  @ApiResponse(GetOrganizationSettingsDto)
  @ApiOperation({
    summary: 'Get organization settings',
  })
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_READ)
  async getSettings(@UserSession() user: UserSessionData) {
    return await this.getOrganizationSettingsUsecase.execute(
      GetOrganizationSettingsCommand.create({
        organizationId: user.organizationId,
      })
    );
  }

  @Patch('/settings')
  @ApiResponse(UpdateOrganizationSettingsDto)
  @ApiOperation({
    summary: 'Update organization settings',
  })
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_WRITE)
  async updateSettings(@UserSession() user: UserSessionData, @Body() body: UpdateOrganizationSettingsDto) {
    return await this.updateOrganizationSettingsUsecase.execute(
      UpdateOrganizationSettingsCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
        removeNovuBranding: body.removeNovuBranding,
        defaultLocale: body.defaultLocale,
      })
    );
  }
}
