import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { OrganizationEntity } from '@novu/dal';
import { IJwtPayload, MemberRoleEnum } from '@novu/shared';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/framework/roles.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateOrganizationDto } from './dtos/create-organization.dto';
import { CreateOrganizationCommand } from './usecases/create-organization/create-organization.command';
import { CreateOrganization } from './usecases/create-organization/create-organization.usecase';
import { GetMyOrganizationCommand } from './usecases/get-my-organization/get-my-organization.command';
import { GetMyOrganization } from './usecases/get-my-organization/get-my-organization.usecase';
import { RemoveMember } from './usecases/membership/remove-member/remove-member.usecase';
import { RemoveMemberCommand } from './usecases/membership/remove-member/remove-member.command';
import { IGetMyOrganizationDto } from './dtos/get-my-organization.dto';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { GetMembersCommand } from './usecases/membership/membership/get-members/get-members.command';
import { GetMembers } from './usecases/membership/membership/get-members/get-members.usecase';
import { ChangeMemberRoleCommand } from './usecases/membership/membership/change-member-role/change-member-role.command';
import { ChangeMemberRole } from './usecases/membership/membership/change-member-role/change-member-role.usecase';
import { UpdateBrandingDetailsCommand } from './usecases/update-branding-details/update-branding-details.command';
import { UpdateBrandingDetails } from './usecases/update-branding-details/update-branding-details.usecase';

@Controller('/organizations')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(
    private createOrganizationUsecase: CreateOrganization,
    private getMyOrganizationUsecase: GetMyOrganization,
    private getMembers: GetMembers,
    private removeMemberUsecase: RemoveMember,
    private changeMemberRoleUsecase: ChangeMemberRole,
    private updateBrandingDetailsUsecase: UpdateBrandingDetails
  ) {}

  @Post('/')
  async createOrganization(
    @UserSession() user: IJwtPayload,
    @Body() body: CreateOrganizationDto
  ): Promise<OrganizationEntity> {
    const command = CreateOrganizationCommand.create({
      userId: user._id,
      logo: body.logo,
      name: body.name,
    });
    const organization = await this.createOrganizationUsecase.execute(command);

    return organization;
  }

  @Delete('/members/:memberId')
  @Roles(MemberRoleEnum.ADMIN)
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
  @Roles(MemberRoleEnum.ADMIN)
  async updateMemberRoles(
    @UserSession() user: IJwtPayload,
    @Param('memberId') memberId: string,
    @Body('role') role: MemberRoleEnum
  ) {
    return await this.changeMemberRoleUsecase.execute(
      ChangeMemberRoleCommand.create({
        memberId,
        role,
        userId: user._id,
        organizationId: user.organizationId,
      })
    );
  }

  @Get('/members')
  @Roles(MemberRoleEnum.ADMIN)
  async getMember(@UserSession() user: IJwtPayload) {
    return await this.getMembers.execute(
      GetMembersCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
      })
    );
  }

  @Post('/members/invite')
  @Roles(MemberRoleEnum.ADMIN)
  async inviteMember(@UserSession() user: IJwtPayload) {
    return await this.getMembers.execute(
      GetMembersCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
      })
    );
  }

  @Get('/me')
  async getMyOrganization(@UserSession() user: IJwtPayload): Promise<IGetMyOrganizationDto> {
    const command = GetMyOrganizationCommand.create({
      userId: user._id,
      id: user.organizationId,
    });

    return await this.getMyOrganizationUsecase.execute(command);
  }

  @Put('/branding')
  async updateBrandingDetails(
    @UserSession() user: IJwtPayload,
    @Body() body: { color: string; logo: string; fontColor: string; contentBackground: string; fontFamily: string }
  ) {
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
}
