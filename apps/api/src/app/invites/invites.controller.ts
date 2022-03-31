import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IBulkInviteResponse, IGetInviteResponseDto, IJwtPayload, MemberRoleEnum } from '@novu/shared';
import { UserSession } from '../shared/framework/user.decorator';
import { GetInviteCommand } from './usecases/get-invite/get-invite.command';
import { AcceptInviteCommand } from './usecases/accept-invite/accept-invite.command';
import { Roles } from '../auth/framework/roles.decorator';
import { InviteMemberDto } from '../organization/dtos/invite-member.dto';
import { InviteMemberCommand } from './usecases/invite-member/invite-member.command';
import { BulkInviteMembersDto } from '../organization/dtos/bulk-invite-members.dto';
import { BulkInviteCommand } from './usecases/bulk-invite/bulk-invite.command';
import { InviteMember } from './usecases/invite-member/invite-member.usecase';
import { BulkInvite } from './usecases/bulk-invite/bulk-invite.usecase';
import { AcceptInvite } from './usecases/accept-invite/accept-invite.usecase';
import { GetInvite } from './usecases/get-invite/get-invite.usecase';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('/invites')
export class InvitesController {
  constructor(
    private inviteMemberUsecase: InviteMember,
    private bulkInviteUsecase: BulkInvite,
    private acceptInviteUsecase: AcceptInvite,
    private getInvite: GetInvite
  ) {}

  @Get('/:inviteToken')
  async getInviteData(@Param('inviteToken') inviteToken: string): Promise<IGetInviteResponseDto> {
    const command = GetInviteCommand.create({
      token: inviteToken,
    });

    return await this.getInvite.execute(command);
  }

  @Post('/:inviteToken/accept')
  @UseGuards(AuthGuard('jwt'))
  async acceptInviteToken(
    @UserSession() user: IJwtPayload,
    @Param('inviteToken') inviteToken: string
  ): Promise<string> {
    const command = AcceptInviteCommand.create({
      token: inviteToken,
      userId: user._id,
    });

    return await this.acceptInviteUsecase.execute(command);
  }

  @Post('/')
  @Roles(MemberRoleEnum.ADMIN)
  @UseGuards(AuthGuard('jwt'))
  async inviteMember(@UserSession() user: IJwtPayload, @Body() body: InviteMemberDto): Promise<{ success: boolean }> {
    const command = InviteMemberCommand.create({
      userId: user._id,
      organizationId: user.organizationId,
      email: body.email,
      role: body.role,
    });

    await this.inviteMemberUsecase.execute(command);

    return {
      success: true,
    };
  }

  @Post('/bulk')
  @UseGuards(AuthGuard('jwt'))
  @Roles(MemberRoleEnum.ADMIN)
  async bulkInviteMembers(
    @UserSession() user: IJwtPayload,
    @Body() body: BulkInviteMembersDto
  ): Promise<IBulkInviteResponse[]> {
    const command = BulkInviteCommand.create({
      userId: user._id,
      organizationId: user.organizationId,
      invitees: body.invitees,
    });

    const response = await this.bulkInviteUsecase.execute(command);

    return response;
  }
}
