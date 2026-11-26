import { Body, ClassSerializerInterceptor, Controller, Get, Patch, Put, UseInterceptors } from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExternalApiAccessible, RequirePermissions, SkipPermissionsCheck } from '@novu/application-generic';
import { PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { CopilotSettingsDto, UpdateCopilotSettingsDto } from './dtos/copilot-settings.dto';
import { IGetMyOrganizationDto } from './dtos/get-my-organization.dto';
import { GetOrganizationSettingsDto } from './dtos/get-organization-settings.dto';
import { OrganizationBrandingResponseDto, OrganizationResponseDto } from './dtos/organization-response.dto';
import { RenameOrganizationDto } from './dtos/rename-organization.dto';
import { UpdateBrandingDetailsDto } from './dtos/update-branding-details.dto';
import { UpdateOrganizationSettingsDto } from './dtos/update-organization-settings.dto';
import { GetCopilotSettingsCommand } from './usecases/get-copilot-settings/get-copilot-settings.command';
import { GetCopilotSettings } from './usecases/get-copilot-settings/get-copilot-settings.usecase';
import { GetMyOrganizationCommand } from './usecases/get-my-organization/get-my-organization.command';
import { GetMyOrganization } from './usecases/get-my-organization/get-my-organization.usecase';
import { GetOrganizationSettingsCommand } from './usecases/get-organization-settings/get-organization-settings.command';
import { GetOrganizationSettings } from './usecases/get-organization-settings/get-organization-settings.usecase';
import { RenameOrganization } from './usecases/rename-organization/rename-organization.usecase';
import { RenameOrganizationCommand } from './usecases/rename-organization/rename-organization-command';
import { UpdateBrandingDetailsCommand } from './usecases/update-branding-details/update-branding-details.command';
import { UpdateBrandingDetails } from './usecases/update-branding-details/update-branding-details.usecase';
import { UpdateCopilotSettingsCommand } from './usecases/update-copilot-settings/update-copilot-settings.command';
import { UpdateCopilotSettings } from './usecases/update-copilot-settings/update-copilot-settings.usecase';
import { UpdateOrganizationSettingsCommand } from './usecases/update-organization-settings/update-organization-settings.command';
import { UpdateOrganizationSettings } from './usecases/update-organization-settings/update-organization-settings.usecase';

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
    private updateOrganizationSettingsUsecase: UpdateOrganizationSettings,
    private getCopilotSettingsUsecase: GetCopilotSettings,
    private updateCopilotSettingsUsecase: UpdateCopilotSettings
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
  @ExternalApiAccessible()
  @ApiResponse(OrganizationBrandingResponseDto)
  @ApiOperation({
    summary: 'Update organization branding details',
  })
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_WRITE)
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
  @ExternalApiAccessible()
  @ApiResponse(RenameOrganizationDto)
  @ApiOperation({
    summary: 'Rename organization name',
  })
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_WRITE)
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
  @ExternalApiAccessible()
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
  @ExternalApiAccessible()
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
        targetLocales: body.targetLocales,
      })
    );
  }

  @Get('/settings/copilot')
  @ApiResponse(CopilotSettingsDto)
  @ApiOperation({
    summary: 'Get Copilot settings',
    description: 'Every member reads them: the dashboard shows Copilot as off to everyone once an admin turns it off.',
  })
  @SkipPermissionsCheck()
  async getCopilotSettings(@UserSession() user: UserSessionData): Promise<CopilotSettingsDto> {
    return await this.getCopilotSettingsUsecase.execute(
      GetCopilotSettingsCommand.create({
        organizationId: user.organizationId,
      })
    );
  }

  @Patch('/settings/copilot')
  @ApiResponse(CopilotSettingsDto)
  @ApiOperation({
    summary: 'Update Copilot settings',
  })
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_WRITE)
  async updateCopilotSettings(
    @UserSession() user: UserSessionData,
    @Body() body: UpdateCopilotSettingsDto
  ): Promise<CopilotSettingsDto> {
    return await this.updateCopilotSettingsUsecase.execute(
      UpdateCopilotSettingsCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
        dashboardEnabled: body.dashboardEnabled,
        slackEnabled: body.slackEnabled,
        editsEnabled: body.editsEnabled,
      })
    );
  }
}
