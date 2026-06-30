import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { ApiRateLimitCategoryEnum } from '@novu/shared';

import { ThrottlerCategory } from '../../../rate-limiting/guards';
import { ApiCommonResponses, ApiResponse } from '../../../shared/framework/response.decorator';
import {
  ConsumeSlackSetupLinkRequestDto,
  ConsumeSlackSetupLinkResponseDto,
} from '../../shared/dtos/consume-slack-setup-link.dto';
import { SlackSetupLinkStatusResponseDto } from '../../shared/dtos/slack-setup-link-status-response.dto';
import { ConsumeSlackSetupLinkCommand } from './consume-slack-setup-link/consume-slack-setup-link.command';
import { ConsumeSlackSetupLink } from './consume-slack-setup-link/consume-slack-setup-link.usecase';
import { GetSlackSetupLinkStatusCommand } from './get-slack-setup-link-status/get-slack-setup-link-status.command';
import {
  GetSlackSetupLinkStatus,
  type GetSlackSetupLinkStatusResult,
} from './get-slack-setup-link-status/get-slack-setup-link-status.usecase';

/**
 * Public, unauthenticated agent endpoints (no session) for Slack setup links.
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/agents/public')
@ApiExcludeController()
export class AgentsPublicController {
  constructor(
    private readonly getSlackSetupLinkStatusUsecase: GetSlackSetupLinkStatus,
    private readonly consumeSlackSetupLinkUsecase: ConsumeSlackSetupLink
  ) {}

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
