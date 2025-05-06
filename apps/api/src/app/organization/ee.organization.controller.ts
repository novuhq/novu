import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Patch,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserSessionData } from '@novu/shared';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
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
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { OrganizationBrandingResponseDto, OrganizationResponseDto } from './dtos/organization-response.dto';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';

@Controller('/organizations')
@UseInterceptors(ClassSerializerInterceptor)
@UserAuthentication()
@ApiTags('Organizations')
@ApiCommonResponses()
@ApiExcludeController()
export class EEOrganizationController {
  constructor(
    private updateBrandingDetailsUsecase: UpdateBrandingDetails,
    private getMyOrganizationUsecase: GetMyOrganization,
    private renameOrganizationUsecase: RenameOrganization
  ) {}

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
