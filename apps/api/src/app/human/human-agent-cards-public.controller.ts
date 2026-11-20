import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { ApiRateLimitCategoryEnum } from '@novu/shared';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses } from '../shared/framework/response.decorator';
import type { HumanAgentCardResult } from './dtos/human-agent-card.dto';
import { GetHumanAgentCardCommand } from './usecases/get-human-agent-card/get-human-agent-card.command';
import { GetHumanAgentCard } from './usecases/get-human-agent-card/get-human-agent-card.usecase';

/**
 * An agent's public card, behind `agentinbox.md/p/{handle}` and the picture apps show where its link is shared.
 * Anyone may read it without signing in, so it holds only what the card shows.
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/human/agent-cards')
@ApiExcludeController()
export class HumanAgentCardsPublicController {
  constructor(private readonly getHumanAgentCardUsecase: GetHumanAgentCard) {}

  @Get('/:handle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Read the public card of the agent at this handle' })
  getCard(@Param('handle') handle: string): Promise<HumanAgentCardResult> {
    return this.getHumanAgentCardUsecase.execute(GetHumanAgentCardCommand.create({ handle }));
  }
}
