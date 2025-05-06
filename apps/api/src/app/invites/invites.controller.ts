import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiRateLimitCostEnum,
  IBulkInviteResponse,
  IGetInviteResponseDto,
  MemberRoleEnum,
  UserSessionData,
} from '@novu/shared';
import { ApiExcludeController, ApiTags } from '@nestjs/swagger';
import { UserSession } from '../shared/framework/user.decorator';
import { GetInviteCommand } from './usecases/get-invite/get-invite.command';
import { AcceptInviteCommand } from './usecases/accept-invite/accept-invite.command';
import { InviteMemberDto, InviteWebhookDto } from './dtos/invite-member.dto';
import { InviteMemberCommand } from './usecases/invite-member/invite-member.command';
import { BulkInviteMembersDto } from './dtos/bulk-invite-members.dto';
import { BulkInviteCommand } from './usecases/bulk-invite/bulk-invite.command';
import { InviteMember } from './usecases/invite-member/invite-member.usecase';
import { BulkInvite } from './usecases/bulk-invite/bulk-invite.usecase';
import { AcceptInvite } from './usecases/accept-invite/accept-invite.usecase';
import { GetInvite } from './usecases/get-invite/get-invite.usecase';
import { ResendInviteDto } from './dtos/resend-invite.dto';
import { ResendInviteCommand } from './usecases/resend-invite/resend-invite.command';
import { ResendInvite } from './usecases/resend-invite/resend-invite.usecase';
import { ThrottlerCost } from '../rate-limiting/guards';
import { ApiCommonResponses } from '../shared/framework/response.decorator';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';

@UseInterceptors(ClassSerializerInterceptor)
@ApiCommonResponses()
@Controller('/invites')
@ApiTags('Invites')
@ApiExcludeController()
export class InvitesController {
  constructor(
    private inviteMemberUsecase: InviteMember,
    private bulkInviteUsecase: BulkInvite,
    private acceptInviteUsecase: AcceptInvite,
    private getInvite: GetInvite,
    private resendInviteUsecase: ResendInvite
  ) {}

  @Get('/:inviteToken')
  async getInviteData(@Param('inviteToken') inviteToken: string): Promise<IGetInviteResponseDto> {
    const command = GetInviteCommand.create({
      token: inviteToken,
    });

    return await this.getInvite.execute(command);
  }

  @Post('/:inviteToken/accept')
  @UserAuthentication()
  async acceptInviteToken(
    @UserSession() user: UserSessionData,
    @Param('inviteToken') inviteToken: string
  ): Promise<string> {
    const command = AcceptInviteCommand.create({
      token: inviteToken,
      userId: user._id,
    });

    return await this.acceptInviteUsecase.execute(command);
  }

  @Post('/')
  @UserAuthentication()
  async inviteMember(
    @UserSession() user: UserSessionData,
    @Body() body: InviteMemberDto
  ): Promise<{ success: boolean }> {
    const command = InviteMemberCommand.create({
      userId: user._id,
      organizationId: user.organizationId,
      email: body.email,
      role: MemberRoleEnum.ADMIN,
    });

    await this.inviteMemberUsecase.execute(command);

    return {
      success: true,
    };
  }

  @Post('/resend')
  @UserAuthentication()
  async resendInviteMember(
    @UserSession() user: UserSessionData,
    @Body() body: ResendInviteDto
  ): Promise<{ success: boolean }> {
    const command = ResendInviteCommand.create({
      userId: user._id,
      organizationId: user.organizationId,
      memberId: body.memberId,
    });

    await this.resendInviteUsecase.execute(command);

    return {
      success: true,
    };
  }

  @ThrottlerCost(ApiRateLimitCostEnum.BULK)
  @Post('/bulk')
  @UserAuthentication()
  async bulkInviteMembers(
    @UserSession() user: UserSessionData,
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
