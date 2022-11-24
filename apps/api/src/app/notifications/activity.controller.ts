import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ChannelTypeEnum, IJwtPayload } from '@novu/shared';
import { GetActivityFeed } from './usecases/get-activity-feed/get-activity-feed.usecase';
import { GetActivityFeedCommand } from './usecases/get-activity-feed/get-activity-feed.command';
import { UserSession } from '../shared/framework/user.decorator';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { GetActivityStats } from './usecases/get-activity-stats/get-activity-stats.usecase';
import { GetActivityStatsCommand } from './usecases/get-activity-stats/get-activity-stats.command';
import { GetActivityGraphStats } from './usecases/get-activity-graph-states/get-activity-graph-states.usecase';
import { GetActivityGraphStatsCommand } from './usecases/get-activity-graph-states/get-activity-graph-states.command';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ActivityStatsResponseDto } from './dtos/activity-stats-response.dto';
import { ActivitiesResponseDto } from './dtos/activities-response.dto';
import { ActivityGraphStatesResponse } from './dtos/activity-graph-states-response.dto';
import { ActivitiesRequestDto } from './dtos/activities-request.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';

@Controller('/activity')
@ApiTags('Activity')
export class ActivityController {
  constructor(
    private getActivityFeedUsecase: GetActivityFeed,
    private getActivityStatsUsecase: GetActivityStats,
    private getActivityGraphStatsUsecase: GetActivityGraphStats
  ) {}

  @Get('')
  @ApiOkResponse({
    type: ActivitiesResponseDto,
  })
  @ApiOperation({
    deprecated: true,
    summary: 'Get activity feed',
  })
  @UseGuards(JwtAuthGuard)
  @ExternalApiAccessible()
  getActivityFeed(
    @UserSession() user: IJwtPayload,
    @Query() query: ActivitiesRequestDto
  ): Promise<ActivitiesResponseDto> {
    let channelsQuery: ChannelTypeEnum[];

    if (query.channels) {
      channelsQuery = Array.isArray(query.channels) ? query.channels : [query.channels];
    }

    let templatesQuery: string[];
    if (query.templates) {
      templatesQuery = Array.isArray(query.templates) ? query.templates : [query.templates];
    }

    let emailsQuery: string[];
    if (query.emails) {
      emailsQuery = Array.isArray(query.emails) ? query.emails : [query.emails];
    }

    return this.getActivityFeedUsecase.execute(
      GetActivityFeedCommand.create({
        page: query.page ? Number(query.page) : 0,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
        channels: channelsQuery,
        templates: templatesQuery,
        emails: emailsQuery,
        search: query.search,
      })
    );
  }

  @ApiOkResponse({
    type: ActivityStatsResponseDto,
  })
  @ApiOperation({
    deprecated: true,
    summary: 'Get activity statistics',
  })
  @Get('/stats')
  @UseGuards(JwtAuthGuard)
  @ExternalApiAccessible()
  getActivityStats(@UserSession() user: IJwtPayload): Promise<ActivityStatsResponseDto> {
    return this.getActivityStatsUsecase.execute(
      GetActivityStatsCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
      })
    );
  }

  @Get('/graph/stats')
  @UseGuards(JwtAuthGuard)
  @ExternalApiAccessible()
  @ApiOkResponse({
    type: [ActivityGraphStatesResponse],
  })
  @ApiOperation({
    deprecated: true,
    summary: 'Get activity graph statistics',
  })
  @ApiQuery({
    name: 'days',
    type: Number,
    required: false,
  })
  getActivityGraphStats(
    @UserSession() user: IJwtPayload,
    @Query('days') days = 32
  ): Promise<ActivityGraphStatesResponse[]> {
    return this.getActivityGraphStatsUsecase.execute(
      GetActivityGraphStatsCommand.create({
        days: days ? Number(days) : 32,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
      })
    );
  }
}
