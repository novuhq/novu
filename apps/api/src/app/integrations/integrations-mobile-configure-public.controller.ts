import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { ApiRateLimitCategoryEnum } from '@novu/shared';
import {
  ConsumeTelegramMobileLinkRequestDto,
  ConsumeTelegramMobileLinkResponseDto,
} from '../agents/shared/dtos/consume-telegram-mobile-link.dto';
import { TelegramMobileLinkStatusResponseDto } from '../agents/shared/dtos/telegram-mobile-link-status-response.dto';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { ConsumeTelegramMobileLinkCommand } from '../telegram-linking/consume-telegram-mobile-link/consume-telegram-mobile-link.command';
import { ConsumeTelegramMobileLink } from '../telegram-linking/consume-telegram-mobile-link/consume-telegram-mobile-link.usecase';
import { GetTelegramMobileLinkStatusCommand } from '../telegram-linking/get-telegram-mobile-link-status/get-telegram-mobile-link-status.command';
import {
  GetTelegramMobileLinkStatus,
  type GetTelegramMobileLinkStatusResult,
} from '../telegram-linking/get-telegram-mobile-link-status/get-telegram-mobile-link-status.usecase';

/**
 * Public, unauthenticated endpoints for the agent-backed Telegram mobile setup
 * landing page. Authorization is carried by an opaque, single-use token issued
 * via `POST /v1/integrations/:integrationIdentifier/mobile-link`.
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/integrations/mobile-configure')
@ApiExcludeController()
export class IntegrationsMobileConfigurePublicController {
  constructor(
    private readonly getStatusUsecase: GetTelegramMobileLinkStatus,
    private readonly consumeUsecase: ConsumeTelegramMobileLink
  ) {}

  @Get('/status')
  @HttpCode(HttpStatus.OK)
  @ApiResponse(TelegramMobileLinkStatusResponseDto, 200)
  @ApiOperation({
    summary: 'Check the status of a Telegram mobile setup link',
    description:
      'Returns whether an opaque Telegram mobile-setup token is still usable. Designed to be called from the ' +
      'mobile landing page before showing the credentials form.',
  })
  async getStatus(@Query('token') token: string): Promise<GetTelegramMobileLinkStatusResult> {
    return this.getStatusUsecase.execute(GetTelegramMobileLinkStatusCommand.create({ token: token ?? '' }));
  }

  @Post('/')
  @HttpCode(HttpStatus.OK)
  @ApiResponse(ConsumeTelegramMobileLinkResponseDto, 200)
  @ApiOperation({
    summary: 'Consume a Telegram mobile setup link',
    description:
      'Validates the setup token, persists the supplied Bot Token onto the linked Telegram integration, ' +
      'and registers the webhook with Telegram. The token becomes invalid after a successful call.',
  })
  async consume(@Body() body: ConsumeTelegramMobileLinkRequestDto): Promise<ConsumeTelegramMobileLinkResponseDto> {
    return this.consumeUsecase.execute(
      ConsumeTelegramMobileLinkCommand.create({
        token: body.token,
        botToken: body.botToken,
      })
    );
  }
}
