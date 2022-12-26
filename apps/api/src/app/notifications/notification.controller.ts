import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
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
import { ActivitiesResponseDto, ActivityNotificationResponseDto } from './dtos/activities-response.dto';
import { ActivityGraphStatesResponse } from './dtos/activity-graph-states-response.dto';
import { ActivitiesRequestDto } from './dtos/activities-request.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { GetActivity } from './usecases/get-activity/get-activity.usecase';
import { GetActivityCommand } from './usecases/get-activity/get-activity.command';

@Controller('/notifications')
@ApiTags('Notification')
export class NotificationsController {
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
    summary: 'Get notifications',
  })
  @UseGuards(JwtAuthGuard)
  @ExternalApiAccessible()
  getNotifications(
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
        transactionId: query.transactionId,
      })
    );
  }

  @ApiOkResponse({
    type: ActivityStatsResponseDto,
  })
  @ApiOperation({
    summary: 'Get notification statistics',
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
    summary: 'Get notification graph statistics',
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
