import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { ApiRateLimitCategoryEnum } from '@novu/shared';

import { ThrottlerCategory } from '../../../rate-limiting/guards';
import { ApiCommonResponses, ApiResponse } from '../../../shared/framework/response.decorator';
import {
  ConsumeTelegramMobileLinkRequestDto,
  ConsumeTelegramMobileLinkResponseDto,
} from '../../shared/dtos/consume-telegram-mobile-link.dto';
import { TelegramMobileLinkStatusResponseDto } from '../../shared/dtos/telegram-mobile-link-status-response.dto';
import { ConsumeTelegramMobileLinkCommand } from './consume-telegram-mobile-link/consume-telegram-mobile-link.command';
import { ConsumeTelegramMobileLink } from './consume-telegram-mobile-link/consume-telegram-mobile-link.usecase';
import { GetTelegramMobileLinkStatusCommand } from './get-telegram-mobile-link-status/get-telegram-mobile-link-status.command';
import {
  GetTelegramMobileLinkStatus,
  type GetTelegramMobileLinkStatusResult,
} from './get-telegram-mobile-link-status/get-telegram-mobile-link-status.usecase';

/**
 * Public, unauthenticated agent endpoints (no session). Add provider-specific
 * route groups under this controller — today only Telegram mobile configure.
 *
 * Telegram: authorization is a signed, single-use, short-lived JWT in the
 * request; the dashboard issues it via authed
 * `POST /agents/:id/integrations/:iid/telegram/mobile-link`.
 *
 * Base path `/v1/agents/public` keeps these routes separate from authed
 * `/v1/agents/:identifier/*`.
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/agents/public')
@ApiExcludeController()
export class AgentsPublicController {
  constructor(
    private readonly getTelegramMobileLinkStatusUsecase: GetTelegramMobileLinkStatus,
    private readonly consumeTelegramMobileLinkUsecase: ConsumeTelegramMobileLink
  ) {}

  @Get('telegram/mobile-configure/status')
  @HttpCode(HttpStatus.OK)
  @ApiResponse(TelegramMobileLinkStatusResponseDto, 200)
  @ApiOperation({
    summary: 'Check the status of a Telegram mobile setup link',
    description:
      'Returns whether a signed Telegram mobile-setup token is still usable. Designed to be called from the ' +
      'mobile landing page before showing the credentials form.',
  })
  async getStatus(@Query('token') token: string): Promise<GetTelegramMobileLinkStatusResult> {
    return this.getTelegramMobileLinkStatusUsecase.execute(
      GetTelegramMobileLinkStatusCommand.create({ token: token ?? '' })
    );
  }

  @Post('telegram/mobile-configure')
  @HttpCode(HttpStatus.OK)
  @ApiResponse(ConsumeTelegramMobileLinkResponseDto, 200)
  @ApiOperation({
    summary: 'Consume a Telegram mobile setup link',
    description:
      'Validates the signed token, persists the supplied Bot Token onto the linked Telegram integration, ' +
      'and registers the webhook with Telegram. The token becomes invalid after a successful call.',
  })
  async consume(@Body() body: ConsumeTelegramMobileLinkRequestDto): Promise<ConsumeTelegramMobileLinkResponseDto> {
    const result = await this.consumeTelegramMobileLinkUsecase.execute(
      ConsumeTelegramMobileLinkCommand.create({
        token: body.token,
        botToken: body.botToken,
      })
    );

    return result;
  }
}
