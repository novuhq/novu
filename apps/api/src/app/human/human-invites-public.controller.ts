import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { ApiRateLimitCategoryEnum, HumanChannelViaEnum } from '@novu/shared';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses } from '../shared/framework/response.decorator';
import {
  HumanInviteChannelRequestDto,
  HumanInviteConnectRequestDto,
  type HumanInviteStatusResult,
  HumanInviteTokenRequestDto,
  type RequestAddressVerificationResponseDto,
  VerifyAddressRequestDto,
  type VerifyAddressResponseDto,
  VerifyVoiceCodeRequestDto,
} from './dtos/human-invite.dto';
import type { HumanInviteVia } from './services/human-delivery.service';
import {
  ConfirmVoiceVerification,
  type ConfirmVoiceVerificationResult,
} from './usecases/confirm-voice-verification/confirm-voice-verification.usecase';
import { ConnectHumanInviteChannelCommand } from './usecases/connect-human-invite-channel/connect-human-invite-channel.command';
import { ConnectHumanInviteChannel } from './usecases/connect-human-invite-channel/connect-human-invite-channel.usecase';
import { DeclineHumanInviteCommand } from './usecases/decline-human-invite/decline-human-invite.command';
import { DeclineHumanInvite } from './usecases/decline-human-invite/decline-human-invite.usecase';
import { GetHumanInviteStatusCommand } from './usecases/get-human-invite-status/get-human-invite-status.command';
import { GetHumanInviteStatus } from './usecases/get-human-invite-status/get-human-invite-status.usecase';
import { RemoveVoiceAddress } from './usecases/remove-voice-address/remove-voice-address.usecase';
import { type RequestVoiceVerificationResult } from './usecases/request-voice-verification/request-voice-verification.usecase';
import { SetHumanInviteDefaultCommand } from './usecases/set-human-invite-default/set-human-invite-default.command';
import { SetHumanInviteDefault } from './usecases/set-human-invite-default/set-human-invite-default.usecase';
import { VerifyAddressCommand } from './usecases/verify-address/verify-address.command';
import { VerifyAddress } from './usecases/verify-address/verify-address.usecase';

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
    private readonly declineHumanInviteUsecase: DeclineHumanInvite,
    private readonly confirmVoiceVerificationUsecase: ConfirmVoiceVerification,
    private readonly removeVoiceAddressUsecase: RemoveVoiceAddress
  ) {}

  @Get('/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check an invite link and list the apps the human can connect' })
  getStatus(@Query('token') token: string): Promise<HumanInviteStatusResult> {
    return this.getHumanInviteStatusUsecase.execute(GetHumanInviteStatusCommand.create({ token: token ?? '' }));
  }

  @Post('/connect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mint a fresh connect link (or start email verification) for one of the invite’s apps' })
  connect(
    @Body() body: HumanInviteConnectRequestDto
  ): Promise<
    | { url: string }
    | (RequestAddressVerificationResponseDto & { via: HumanChannelViaEnum.EMAIL })
    | (RequestVoiceVerificationResult & { via: HumanChannelViaEnum.VOICE })
  > {
    return this.connectHumanInviteChannelUsecase.execute(
      ConnectHumanInviteChannelCommand.create({
        token: body.token,
        via: body.via,
        address: body.address,
      })
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

  @Post('/verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a phone number with the code the verification call read' })
  verifyCode(@Body() body: VerifyVoiceCodeRequestDto): Promise<ConfirmVoiceVerificationResult> {
    return this.confirmVoiceVerificationUsecase.executeFromInvite(body.token, body.code);
  }

  @Post('/voice/remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a phone number from the invited contact' })
  removeVoice(@Body() body: HumanInviteTokenRequestDto): Promise<{ removed: true }> {
    return this.removeVoiceAddressUsecase.executeFromInvite(body.token);
  }

  @Post('/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline the invite before connecting anything' })
  decline(@Body() body: HumanInviteTokenRequestDto): Promise<{ declined: true }> {
    return this.declineHumanInviteUsecase.execute(DeclineHumanInviteCommand.create({ token: body.token }));
  }
}

/**
 * Public verification endpoint behind the "Verify this email" button.
 * The verification token is the only credential.
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/human')
@ApiExcludeController()
export class HumanVerifyPublicController {
  constructor(private readonly verifyAddressUsecase: VerifyAddress) {}

  @Post('/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Claim a Human email verification link' })
  verify(@Body() body: VerifyAddressRequestDto): Promise<VerifyAddressResponseDto> {
    return this.verifyAddressUsecase.execute(VerifyAddressCommand.create({ token: body.token }));
  }
}
