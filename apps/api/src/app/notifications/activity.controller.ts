import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ChannelTypeEnum, IJwtPayload } from '@novu/shared';
import { GetActivityFeed } from './usecases/get-activity-feed/get-activity-feed.usecase';
import { GetActivityFeedCommand } from './usecases/get-activity-feed/get-activity-feed.command';
import { UserSession } from '../shared/framework/user.decorator';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { GetActivityStats } from './usecases/get-activity-stats/get-activity-stats.usecase';
import { GetActivityStatsCommand } from './usecases/get-activity-stats/get-activity-stats.command';
import { GetActivityGraphStats } from './usecases/get-activity-graph-states/get-activity-graph-states.usecase';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ActivityStatsResponseDto } from './dtos/activity-stats-response.dto';
import { ActivitiesResponseDto, ActivityNotificationResponseDto } from './dtos/activities-response.dto';
import { ActivityGraphStatesResponse } from './dtos/activity-graph-states-response.dto';
import { ActivitiesRequestDto } from './dtos/activities-request.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { GetActivity } from './usecases/get-activity/get-activity.usecase';
import { GetActivityCommand } from './usecases/get-activity/get-activity.command';

@Controller('/activity')
@ApiTags('Activity')
export class ActivityController {
  constructor(
    private getActivityFeedUsecase: GetActivityFeed,
    private getActivityStatsUsecase: GetActivityStats,
    private getActivityGraphStatsUsecase: GetActivityGraphStats,
    private getActivityUsecase: GetActivity
  ) {}

  @Get('')
  @ApiOkResponse({
    type: ActivitiesResponseDto,
  })
  @ApiOperation({
    summary: 'Get activity feed',
  })
  @UseGuards(JwtAuthGuard)
  @ExternalApiAccessible()
  getActivityFeed(
    @UserSession() user: IJwtPayload,
    @Query() query: ActivitiesRequestDto
  ): Promise<ActivitiesResponseDto> {
    return this.getActivityFeedUsecase.execute(createACtivityFeedCommand(query, user));
  }

  @ApiOkResponse({
    type: ActivityStatsResponseDto,
  })
  @ApiOperation({
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
    summary: 'Get activity graph statistics',
  })
  getActivityGraphStats(
    @UserSession() user: IJwtPayload,
    @Query() query: ActivitiesRequestDto
  ): Promise<ActivityGraphStatesResponse[]> {
    return this.getActivityGraphStatsUsecase.execute(createACtivityFeedCommand(query, user));
  }

  @Get('/:notificationId')
  @ApiOkResponse({
    type: ActivityNotificationResponseDto,
  })
  @ApiOperation({
    summary: 'Get notification',
  })
  @UseGuards(JwtAuthGuard)
  @ExternalApiAccessible()
  getActivity(
    @UserSession() user: IJwtPayload,
    @Param('notificationId') notificationId: string
  ): Promise<ActivityNotificationResponseDto> {
    return this.getActivityUsecase.execute(
      GetActivityCommand.create({
        notificationId: notificationId,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
      })
    );
  }
}

const createACtivityFeedCommand = (query, user) => {
  let channelsQuery: ChannelTypeEnum[] | null = null;

  if (query.channels) {
    channelsQuery = Array.isArray(query.channels) ? query.channels : [query.channels];
  }

  let templatesQuery: string[] | null = null;
  if (query.templates) {
    templatesQuery = Array.isArray(query.templates) ? query.templates : [query.templates];
  }

  let emailsQuery: string[] | null = null;
  if (query.emails) {
    emailsQuery = Array.isArray(query.emails) ? query.emails : [query.emails];
  }

  return GetActivityFeedCommand.create({
    page: query.page ? Number(query.page) : 0,
    organizationId: user.organizationId,
    environmentId: user.environmentId,
    userId: user._id,
    channels: channelsQuery,
    templates: templatesQuery,
    emails: emailsQuery,
    search: query.search,
    startDate: query.startDate,
    endDate: query.endDate,
    periodicity: query.periodicity,
  });
};
