import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { OrganizationEntity } from '@novu/dal';
import { IJwtPayload, MemberRoleEnum } from '@novu/shared';
import { ApiExcludeEndpoint, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/framework/roles.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateOrganizationDto } from './dtos/create-organization.dto';
import { CreateOrganizationCommand } from './usecases/create-organization/create-organization.command';
import { CreateOrganization } from './usecases/create-organization/create-organization.usecase';
import { RemoveMember } from './usecases/membership/remove-member/remove-member.usecase';
import { RemoveMemberCommand } from './usecases/membership/remove-member/remove-member.command';
import { UserAuthGuard } from '../auth/framework/user.auth.guard';
import { GetMembersCommand } from './usecases/membership/get-members/get-members.command';
import { GetMembers } from './usecases/membership/get-members/get-members.usecase';
import { ChangeMemberRoleCommand } from './usecases/membership/change-member-role/change-member-role.command';
import { ChangeMemberRole } from './usecases/membership/change-member-role/change-member-role.usecase';
import { UpdateBrandingDetailsCommand } from './usecases/update-branding-details/update-branding-details.command';
import { UpdateBrandingDetails } from './usecases/update-branding-details/update-branding-details.usecase';
import { GetOrganizationsCommand } from './usecases/get-organizations/get-organizations.command';
import { GetOrganizations } from './usecases/get-organizations/get-organizations.usecase';
import { IGetOrganizationsDto } from './dtos/get-organizations.dto';
import { GetMyOrganization } from './usecases/get-my-organization/get-my-organization.usecase';
import { GetMyOrganizationCommand } from './usecases/get-my-organization/get-my-organization.command';
import { IGetMyOrganizationDto } from './dtos/get-my-organization.dto';
import { RenameOrganizationCommand } from './usecases/rename-organization/rename-organization-command';
import { RenameOrganization } from './usecases/rename-organization/rename-organization.usecase';
import { RenameOrganizationDto } from './dtos/rename-organization.dto';
import { UpdateBrandingDetailsDto } from './dtos/update-branding-details.dto';
import { UpdateMemberRolesDto } from './dtos/update-member-roles.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { OrganizationBrandingResponseDto, OrganizationResponseDto } from './dtos/organization-response.dto';
import { MemberResponseDto } from './dtos/member-response.dto';

@Controller('/organizations')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(UserAuthGuard)
@ApiTags('Organizations')
@ApiCommonResponses()
export class OrganizationController {
  constructor(
    private createOrganizationUsecase: CreateOrganization,
    private getMembers: GetMembers,
    private removeMemberUsecase: RemoveMember,
    private changeMemberRoleUsecase: ChangeMemberRole,
    private updateBrandingDetailsUsecase: UpdateBrandingDetails,
    private getOrganizationsUsecase: GetOrganizations,
    private getMyOrganizationUsecase: GetMyOrganization,
    private renameOrganizationUsecase: RenameOrganization
  ) {}

  @Post('/')
  @ExternalApiAccessible()
  @ApiResponse(OrganizationResponseDto, 201)
  @ApiOperation({
    summary: 'Create an organization',
  })
  async createOrganization(
    @UserSession() user: IJwtPayload,
    @Body() body: CreateOrganizationDto
  ): Promise<OrganizationEntity> {
    return await this.createOrganizationUsecase.execute(
      CreateOrganizationCommand.create({
        userId: user._id,
        logo: body.logo,
        name: body.name,
        jobTitle: body.jobTitle,
        domain: body.domain,
        productUseCases: body.productUseCases,
      })
    );
  }

  @Get('/')
  @ExternalApiAccessible()
  @ApiResponse(OrganizationResponseDto, 200, true)
  @ApiOperation({
    summary: 'Fetch all organizations',
  })
  async getOrganizations(@UserSession() user: IJwtPayload): Promise<IGetOrganizationsDto> {
    const command = GetOrganizationsCommand.create({
      userId: user._id,
    });

    return await this.getOrganizationsUsecase.execute(command);
  }

  @Get('/me')
  @ExternalApiAccessible()
  @ApiResponse(OrganizationResponseDto)
  @ApiOperation({
    summary: 'Fetch current organization details',
  })
  async getMyOrganization(@UserSession() user: IJwtPayload): Promise<IGetMyOrganizationDto> {
    const command = GetMyOrganizationCommand.create({
      userId: user._id,
      id: user.organizationId,
    });

    return await this.getMyOrganizationUsecase.execute(command);
  }

  @Delete('/members/:memberId')
  @ExternalApiAccessible()
  @Roles(MemberRoleEnum.ADMIN)
  @ApiResponse(MemberResponseDto)
  @ApiOperation({
    summary: 'Remove a member from organization using memberId',
  })
  @ApiParam({ name: 'memberId', type: String, required: true })
  async removeMember(@UserSession() user: IJwtPayload, @Param('memberId') memberId: string) {
    return await this.removeMemberUsecase.execute(
      RemoveMemberCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
        memberId,
      })
    );
  }

  @Put('/members/:memberId/roles')
  @ExternalApiAccessible()
  @ApiExcludeEndpoint()
  @Roles(MemberRoleEnum.ADMIN)
  @ApiResponse(MemberResponseDto)
  @ApiOperation({
    summary: 'Update a member role to admin',
  })
  @ApiParam({ name: 'memberId', type: String, required: true })
  async updateMemberRoles(
    @UserSession() user: IJwtPayload,
    @Param('memberId') memberId: string,
    @Body() body: UpdateMemberRolesDto
  ) {
    if (body.role !== MemberRoleEnum.ADMIN) {
      throw new Error('Only admin role can be assigned to a member');
    }

    return await this.changeMemberRoleUsecase.execute(
      ChangeMemberRoleCommand.create({
        memberId,
        role: MemberRoleEnum.ADMIN,
        userId: user._id,
        organizationId: user.organizationId,
      })
    );
  }

  @Get('/members')
  @ExternalApiAccessible()
  @ApiResponse(MemberResponseDto, 200, true)
  @ApiOperation({
    summary: 'Fetch all members of current organizations',
  })
  async getMember(@UserSession() user: IJwtPayload) {
    return await this.getMembers.execute(
      GetMembersCommand.create({
        user,
        userId: user._id,
        organizationId: user.organizationId,
      })
    );
  }

  @Put('/branding')
  @ExternalApiAccessible()
  @ApiResponse(OrganizationBrandingResponseDto)
  @ApiOperation({
    summary: 'Update organization branding details',
  })
  async updateBrandingDetails(@UserSession() user: IJwtPayload, @Body() body: UpdateBrandingDetailsDto) {
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
  async renameOrganization(@UserSession() user: IJwtPayload, @Body() body: RenameOrganizationDto) {
    return await this.renameOrganizationUsecase.execute(
      RenameOrganizationCommand.create({
        name: body.name,
        userId: user._id,
        id: user.organizationId,
      })
    );
  }
}
