import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { IJwtPayload } from '@novu/shared';

import { CreateTopicRequestDto, CreateTopicResponseDto } from './dtos/create-topic.dto';
import { CreateTopicCommand, CreateTopicUseCase } from './use-cases';

import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { AnalyticsService } from '../shared/services/analytics/analytics.service';
import { ANALYTICS_SERVICE } from '../shared/shared.module';

@Controller('/topics')
@ApiTags('Topics')
@UseGuards(JwtAuthGuard)
export class TopicsController {
  constructor(
    private createTopicUseCase: CreateTopicUseCase,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService
  ) {}

  @ExternalApiAccessible()
  @ApiOkResponse({
    type: CreateTopicResponseDto,
  })
  @Post('/')
  async createTopic(
    @UserSession() user: IJwtPayload,
    @Body() body: CreateTopicRequestDto
  ): Promise<CreateTopicResponseDto> {
    const topic = await this.createTopicUseCase.execute(
      CreateTopicCommand.create({
        environmentId: user.environmentId,
        key: body.key,
        name: body.name,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );

    return {
      _id: topic._id,
    };
  }
}
