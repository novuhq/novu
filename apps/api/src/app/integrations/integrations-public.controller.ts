import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { ApiRateLimitCategoryEnum } from '@novu/shared';

import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import {
  ConsumeIntegrationStoreTelegramMobileLinkRequestDto,
  ConsumeIntegrationStoreTelegramMobileLinkResponseDto,
} from './dtos/consume-integration-store-telegram-mobile-link.dto';
import { IntegrationStoreTelegramMobileLinkStatusResponseDto } from './dtos/integration-store-telegram-mobile-link-status-response.dto';
import { ConsumeIntegrationStoreTelegramMobileLinkCommand } from './usecases/consume-integration-store-telegram-mobile-link/consume-integration-store-telegram-mobile-link.command';
import { ConsumeIntegrationStoreTelegramMobileLink } from './usecases/consume-integration-store-telegram-mobile-link/consume-integration-store-telegram-mobile-link.usecase';
import { GetIntegrationStoreTelegramMobileLinkStatusCommand } from './usecases/get-integration-store-telegram-mobile-link-status/get-integration-store-telegram-mobile-link-status.command';
import {
  GetIntegrationStoreTelegramMobileLinkStatus,
  type GetIntegrationStoreTelegramMobileLinkStatusResult,
} from './usecases/get-integration-store-telegram-mobile-link-status/get-integration-store-telegram-mobile-link-status.usecase';

/**
 * Public, unauthenticated endpoints for the integration-store Telegram mobile
 * setup landing page.
 *
 * Authorization is carried entirely by a signed, single-use, short-lived JWT
 * embedded in the request body / query — the dashboard issues these tokens
 * through the authed `POST /v1/integrations/telegram/mobile-link` endpoint.
 *
 * Unlike {@link AgentsPublicController}, this flow has no agent or
 * integration id at issue time. The consume endpoint creates a brand-new
 * Telegram integration in the issuing environment on success.
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/integrations/telegram/mobile-configure')
@ApiExcludeController()
export class IntegrationsPublicController {
  constructor(
    private readonly getStatusUsecase: GetIntegrationStoreTelegramMobileLinkStatus,
    private readonly consumeUsecase: ConsumeIntegrationStoreTelegramMobileLink
  ) {}

  @Get('/status')
  @HttpCode(HttpStatus.OK)
  @ApiResponse(IntegrationStoreTelegramMobileLinkStatusResponseDto, 200)
  @ApiOperation({
    summary: 'Check the status of a Telegram integration-store mobile setup link',
    description:
      'Returns whether a signed Telegram mobile-setup token is still usable. Designed to be called from the ' +
      'mobile landing page before showing the credentials form.',
  })
  async getStatus(@Query('token') token: string): Promise<GetIntegrationStoreTelegramMobileLinkStatusResult> {
    return this.getStatusUsecase.execute(
      GetIntegrationStoreTelegramMobileLinkStatusCommand.create({ token: token ?? '' })
    );
  }

  @Post('/')
  @HttpCode(HttpStatus.OK)
  @ApiResponse(ConsumeIntegrationStoreTelegramMobileLinkResponseDto, 200)
  @ApiOperation({
    summary: 'Consume a Telegram integration-store mobile setup link',
    description:
      'Validates the signed token, calls Telegram getMe to verify the supplied BotFather token, and creates a ' +
      'new Telegram integration in the issuing environment with the bot token stored on its credentials. ' +
      'The token becomes invalid after a successful call.',
  })
  async createTelegramMobileConfiguration(
    @Body() body: ConsumeIntegrationStoreTelegramMobileLinkRequestDto
  ): Promise<ConsumeIntegrationStoreTelegramMobileLinkResponseDto> {
    const result = await this.consumeUsecase.execute(
      ConsumeIntegrationStoreTelegramMobileLinkCommand.create({
        token: body.token,
        botToken: body.botToken,
      })
    );

    return result;
  }
}
