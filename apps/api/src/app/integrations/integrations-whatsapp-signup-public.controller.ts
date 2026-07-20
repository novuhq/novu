import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { ApiRateLimitCategoryEnum } from '@novu/shared';

import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { CompleteWhatsAppSignupLinkRequestDto } from './dtos/complete-whatsapp-signup-link.dto';
import { WhatsAppEmbeddedSignupResponseDto } from './dtos/whatsapp-embedded-signup.dto';
import { WhatsAppSignupLinkStatusResponseDto } from './dtos/whatsapp-signup-link-status.dto';
import { CompleteWhatsAppSignupLinkCommand } from './usecases/whatsapp/complete-whatsapp-signup-link.command';
import { CompleteWhatsAppSignupLink } from './usecases/whatsapp/complete-whatsapp-signup-link.usecase';
import { GetWhatsAppSignupLinkStatusCommand } from './usecases/whatsapp/get-whatsapp-signup-link-status.command';
import {
  GetWhatsAppSignupLinkStatus,
  type GetWhatsAppSignupLinkStatusResult,
} from './usecases/whatsapp/get-whatsapp-signup-link-status.usecase';

/**
 * Public, unauthenticated endpoints for the tokenized WhatsApp Embedded
 * Signup page. Authorization is carried by an opaque, single-use token issued
 * via `POST /v1/integrations/whatsapp/signup-link`, following the Telegram
 * mobile-configure pattern.
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/integrations/whatsapp/signup')
@ApiExcludeController()
export class IntegrationsWhatsAppSignupPublicController {
  constructor(
    private readonly getStatusUsecase: GetWhatsAppSignupLinkStatus,
    private readonly completeUsecase: CompleteWhatsAppSignupLink
  ) {}

  @Get('/status')
  @HttpCode(HttpStatus.OK)
  @ApiResponse(WhatsAppSignupLinkStatusResponseDto, 200)
  @ApiOperation({
    summary: 'Check the status of a WhatsApp signup link',
    description:
      'Returns whether an opaque WhatsApp signup token is still usable, plus secret-free signup progress ' +
      '(`credentialsSaved`, display phone number). Polled by the connect CLI and the public signup page.',
  })
  async getStatus(@Query('token') token: string): Promise<GetWhatsAppSignupLinkStatusResult> {
    return this.getStatusUsecase.execute(GetWhatsAppSignupLinkStatusCommand.create({ token: token ?? '' }));
  }

  @Post('/')
  @HttpCode(HttpStatus.OK)
  @ApiResponse(WhatsAppEmbeddedSignupResponseDto, 200)
  @ApiOperation({
    summary: 'Complete WhatsApp Embedded Signup via a signup link',
    description:
      'Validates the signup token, exchanges the Meta Embedded Signup code, persists credentials onto the ' +
      'linked WhatsApp integration, and registers the webhook. The token becomes invalid after a successful call.',
  })
  async complete(@Body() body: CompleteWhatsAppSignupLinkRequestDto): Promise<WhatsAppEmbeddedSignupResponseDto> {
    return this.completeUsecase.execute(
      CompleteWhatsAppSignupLinkCommand.create({
        token: body.token,
        code: body.code,
        wabaId: body.wabaId,
        phoneNumberId: body.phoneNumberId,
      })
    );
  }
}
