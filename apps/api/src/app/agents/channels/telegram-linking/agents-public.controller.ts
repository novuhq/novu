import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { ApiRateLimitCategoryEnum } from '@novu/shared';

import { ThrottlerCategory } from '../../../rate-limiting/guards';
import { ApiCommonResponses, ApiResponse } from '../../../shared/framework/response.decorator';
import {
  ConsumeSlackSetupLinkRequestDto,
  ConsumeSlackSetupLinkResponseDto,
} from '../../shared/dtos/consume-slack-setup-link.dto';
import {
  ConsumeTelegramMobileLinkRequestDto,
  ConsumeTelegramMobileLinkResponseDto,
} from '../../shared/dtos/consume-telegram-mobile-link.dto';
import { SlackSetupLinkStatusResponseDto } from '../../shared/dtos/slack-setup-link-status-response.dto';
import { TelegramMobileLinkStatusResponseDto } from '../../shared/dtos/telegram-mobile-link-status-response.dto';
import { ConsumeSlackSetupLinkCommand } from '../slack-linking/consume-slack-setup-link/consume-slack-setup-link.command';
import { ConsumeSlackSetupLink } from '../slack-linking/consume-slack-setup-link/consume-slack-setup-link.usecase';
import { GetSlackSetupLinkStatusCommand } from '../slack-linking/get-slack-setup-link-status/get-slack-setup-link-status.command';
import {
  GetSlackSetupLinkStatus,
  type GetSlackSetupLinkStatusResult,
} from '../slack-linking/get-slack-setup-link-status/get-slack-setup-link-status.usecase';
import { ConsumeTelegramMobileLinkCommand } from './consume-telegram-mobile-link/consume-telegram-mobile-link.command';
import { ConsumeTelegramMobileLink } from './consume-telegram-mobile-link/consume-telegram-mobile-link.usecase';
import { GetTelegramMobileLinkStatusCommand } from './get-telegram-mobile-link-status/get-telegram-mobile-link-status.command';
import {
  GetTelegramMobileLinkStatus,
  type GetTelegramMobileLinkStatusResult,
} from './get-telegram-mobile-link-status/get-telegram-mobile-link-status.usecase';

/**
 * Public, unauthenticated agent endpoints (no session). Add provider-specific
 * route groups under this controller (Telegram mobile configure, Slack setup).
 *
 * Telegram: authorization is an opaque, single-use, short-lived token stored in
 * Redis; the dashboard issues it via authed
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
    private readonly consumeTelegramMobileLinkUsecase: ConsumeTelegramMobileLink,
    private readonly getSlackSetupLinkStatusUsecase: GetSlackSetupLinkStatus,
    private readonly consumeSlackSetupLinkUsecase: ConsumeSlackSetupLink
  ) {}

  @Get('telegram/mobile-configure/status')
  @HttpCode(HttpStatus.OK)
  @ApiResponse(TelegramMobileLinkStatusResponseDto, 200)
  @ApiOperation({
    summary: 'Check the status of a Telegram mobile setup link',
    description:
      'Returns whether a Telegram mobile-setup token is still usable. Designed to be called from the ' +
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
      'Validates the setup token, persists the supplied Bot Token onto the linked Telegram integration, ' +
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

  @Get('slack/setup/status')
  @HttpCode(HttpStatus.OK)
  @ApiResponse(SlackSetupLinkStatusResponseDto, 200)
  @ApiOperation({
    summary: 'Check the status of a Slack setup link',
    description:
      'Returns whether a Slack setup token is still usable. Designed to be called from the ' +
      'setup landing page before showing the credentials form.',
  })
  async getSlackSetupStatus(@Query('token') token: string): Promise<GetSlackSetupLinkStatusResult> {
    return this.getSlackSetupLinkStatusUsecase.execute(GetSlackSetupLinkStatusCommand.create({ token: token ?? '' }));
  }

  @Post('slack/setup')
  @HttpCode(HttpStatus.OK)
  @ApiResponse(ConsumeSlackSetupLinkResponseDto, 200)
  @ApiOperation({
    summary: 'Consume a Slack setup link',
    description:
      'Validates the setup token, runs Slack quick-setup with the supplied App Configuration Token, ' +
      'and creates the Slack app from the Novu manifest. The token becomes invalid after a successful call.',
  })
  async consumeSlackSetup(@Body() body: ConsumeSlackSetupLinkRequestDto): Promise<ConsumeSlackSetupLinkResponseDto> {
    return this.consumeSlackSetupLinkUsecase.execute(
      ConsumeSlackSetupLinkCommand.create({
        token: body.token,
        configToken: body.configToken,
      })
    );
  }
}
