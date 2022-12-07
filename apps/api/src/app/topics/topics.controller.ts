import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiExcludeController, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IJwtPayload } from '@novu/shared';

import {
  CreateTopicRequestDto,
  CreateTopicResponseDto,
  FilterTopicsRequestDto,
  FilterTopicsResponseDto,
  GetTopicResponseDto,
} from './dtos';
import {
  CreateTopicCommand,
  CreateTopicUseCase,
  FilterTopicsCommand,
  FilterTopicsUseCase,
  GetTopicCommand,
  GetTopicUseCase,
} from './use-cases';

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
    private filterTopicsUseCase: FilterTopicsUseCase,
    private getTopicUseCase: GetTopicUseCase,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService
  ) {}

  @ExternalApiAccessible()
  @ApiOkResponse({
    type: CreateTopicResponseDto,
  })
  @Post('')
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

  @ExternalApiAccessible()
  @ApiQuery({
    name: 'key',
    type: String,
    description: 'Topic key',
    required: false,
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    description: 'Number of page for the pagination',
    required: false,
  })
  @ApiQuery({
    name: 'pageSize',
    type: Number,
    description: 'Size of page for the pagination',
    required: false,
  })
  @ApiOkResponse({
    type: FilterTopicsResponseDto,
  })
  @Get('')
  async filterTopics(
    @UserSession() user: IJwtPayload,
    @Query() query?: FilterTopicsRequestDto
  ): Promise<FilterTopicsResponseDto> {
    return await this.filterTopicsUseCase.execute(
      FilterTopicsCommand.create({
        environmentId: user.environmentId,
        key: query?.key,
        organizationId: user.organizationId,
        page: query?.page,
        pageSize: query?.pageSize,
        userId: user._id,
      })
    );
  }

  @ExternalApiAccessible()
  @ApiOkResponse({
    type: GetTopicResponseDto,
  })
  @Get(':topicId')
  async getTopic(@UserSession() user: IJwtPayload, @Param('topicId') topicId: string): Promise<GetTopicResponseDto> {
    return await this.getTopicUseCase.execute(
      GetTopicCommand.create({
        environmentId: user.environmentId,
        id: topicId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }
}
