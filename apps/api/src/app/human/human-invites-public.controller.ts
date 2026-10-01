import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { ApiRateLimitCategoryEnum } from '@novu/shared';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses } from '../shared/framework/response.decorator';
import {
  HumanInviteChannelRequestDto,
  type HumanInviteStatusResult,
  HumanInviteTokenRequestDto,
} from './dtos/human-invite.dto';
import type { HumanInviteVia } from './services/human-delivery.service';
import { ConnectHumanInviteChannelCommand } from './usecases/connect-human-invite-channel/connect-human-invite-channel.command';
import { ConnectHumanInviteChannel } from './usecases/connect-human-invite-channel/connect-human-invite-channel.usecase';
import { DeclineHumanInviteCommand } from './usecases/decline-human-invite/decline-human-invite.command';
import { DeclineHumanInvite } from './usecases/decline-human-invite/decline-human-invite.usecase';
import { GetHumanInviteStatusCommand } from './usecases/get-human-invite-status/get-human-invite-status.command';
import { GetHumanInviteStatus } from './usecases/get-human-invite-status/get-human-invite-status.usecase';
import { SetHumanInviteDefaultCommand } from './usecases/set-human-invite-default/set-human-invite-default.command';
import { SetHumanInviteDefault } from './usecases/set-human-invite-default/set-human-invite-default.usecase';

/**
 * Public, unauthenticated endpoints behind the invite page on the Human
 * website (`/invite/:token`). The invite token is the only credential.
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/human/invites')
@ApiExcludeController()
export class HumanInvitesPublicController {
  constructor(
    private readonly getHumanInviteStatusUsecase: GetHumanInviteStatus,
    private readonly connectHumanInviteChannelUsecase: ConnectHumanInviteChannel,
    private readonly setHumanInviteDefaultUsecase: SetHumanInviteDefault,
    private readonly declineHumanInviteUsecase: DeclineHumanInvite
  ) {}

  @Get('/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check an invite link and list the apps the human can connect' })
  getStatus(@Query('token') token: string): Promise<HumanInviteStatusResult> {
    return this.getHumanInviteStatusUsecase.execute(GetHumanInviteStatusCommand.create({ token: token ?? '' }));
  }

  @Post('/connect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mint a fresh connect link for one of the invite’s apps' })
  connect(@Body() body: HumanInviteChannelRequestDto): Promise<{ url: string }> {
    return this.connectHumanInviteChannelUsecase.execute(
      ConnectHumanInviteChannelCommand.create({ token: body.token, via: body.via })
    );
  }

  @Post('/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Make one of the connected apps the human’s default channel' })
  setDefault(@Body() body: HumanInviteChannelRequestDto): Promise<{ defaultVia: HumanInviteVia }> {
    return this.setHumanInviteDefaultUsecase.execute(
      SetHumanInviteDefaultCommand.create({ token: body.token, via: body.via })
    );
  }

  @Post('/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline the invite before connecting anything' })
  decline(@Body() body: HumanInviteTokenRequestDto): Promise<{ declined: true }> {
    return this.declineHumanInviteUsecase.execute(DeclineHumanInviteCommand.create({ token: body.token }));
  }
}
