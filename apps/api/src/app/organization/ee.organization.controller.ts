import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Logger,
  Patch,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { OrganizationEntity } from '@novu/dal';
import { UserSessionData, MemberRoleEnum, SyncExternalOrganizationDto } from '@novu/shared';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/framework/roles.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { UserAuthGuard } from '../auth/framework/user.auth.guard';
import { UpdateBrandingDetailsCommand } from './usecases/update-branding-details/update-branding-details.command';
import { UpdateBrandingDetails } from './usecases/update-branding-details/update-branding-details.usecase';
import { GetMyOrganization } from './usecases/get-my-organization/get-my-organization.usecase';
import { GetMyOrganizationCommand } from './usecases/get-my-organization/get-my-organization.command';
import { IGetMyOrganizationDto } from './dtos/get-my-organization.dto';
import { RenameOrganizationCommand } from './usecases/rename-organization/rename-organization-command';
import { RenameOrganization } from './usecases/rename-organization/rename-organization.usecase';
import { RenameOrganizationDto } from './dtos/rename-organization.dto';
import { UpdateBrandingDetailsDto } from './dtos/update-branding-details.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { OrganizationBrandingResponseDto, OrganizationResponseDto } from './dtos/organization-response.dto';
import { SyncExternalOrganizationCommand } from './usecases/create-organization/sync-external-organization/sync-external-organization.command';
import { SyncExternalOrganization } from './usecases/create-organization/sync-external-organization/sync-external-organization.usecase';

@Controller('/organizations')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(UserAuthGuard)
@ApiTags('Organizations')
@ApiCommonResponses()
export class EEOrganizationController {
  constructor(
    private syncExternalOrganizationUsecase: SyncExternalOrganization,
    private updateBrandingDetailsUsecase: UpdateBrandingDetails,
    private getMyOrganizationUsecase: GetMyOrganization,
    private renameOrganizationUsecase: RenameOrganization
  ) {}

  @Post('/')
  @ApiResponse(OrganizationResponseDto, 201)
  @ApiOperation({
    summary: 'Sync external Clerk organization with internal db.',
  })
  async syncExternalOrganization(
    @UserSession() user: UserSessionData,
    @Body() body: SyncExternalOrganizationDto
  ): Promise<OrganizationEntity> {
    Logger.verbose('Syncing external Clerk organization', user.organizationId);

    return await this.syncExternalOrganizationUsecase.execute(
      SyncExternalOrganizationCommand.create({
        externalId: user.organizationId,
        userId: user._id,
        jobTitle: body.jobTitle,
        domain: body.domain,
        productUseCases: body.productUseCases,
      })
    );
  }

  @Get('/me')
  @ExternalApiAccessible()
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

  @Put('/branding')
  @ExternalApiAccessible()
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

  @Patch('/')
  @ExternalApiAccessible()
  @Roles(MemberRoleEnum.ADMIN)
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
}
