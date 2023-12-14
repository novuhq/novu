import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ChannelTypeEnum, IJwtPayload } from '@novu/shared';

import { GetActivityFeed } from './usecases/get-activity-feed/get-activity-feed.usecase';
import { GetActivityFeedCommand } from './usecases/get-activity-feed/get-activity-feed.command';
import { GetActivityStats, GetActivityStatsCommand } from './usecases/get-activity-stats';
import { GetActivityGraphStats } from './usecases/get-activity-graph-states/get-activity-graph-states.usecase';
import { GetActivityGraphStatsCommand } from './usecases/get-activity-graph-states/get-activity-graph-states.command';
import { ActivityStatsResponseDto } from './dtos/activity-stats-response.dto';
import { ActivitiesResponseDto, ActivityNotificationResponseDto } from './dtos/activities-response.dto';
import { ActivityGraphStatesResponse } from './dtos/activity-graph-states-response.dto';
import { ActivitiesRequestDto } from './dtos/activities-request.dto';
import { GetActivity } from './usecases/get-activity/get-activity.usecase';
import { GetActivityCommand } from './usecases/get-activity/get-activity.command';

import { UserSession } from '../shared/framework/user.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserAuthGuard } from '../auth/framework/user.auth.guard';
import { ApiCommonResponses, ApiResponse, ApiOkResponse } from '../shared/framework/response.decorator';

@ApiCommonResponses()
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
  @UseGuards(UserAuthGuard)
  @ExternalApiAccessible()
  getNotifications(
    @UserSession() user: IJwtPayload,
    @Query() query: ActivitiesRequestDto
  ): Promise<ActivitiesResponseDto> {
    let channelsQuery: ChannelTypeEnum[] | null = null;

    if (query.channels) {
      channelsQuery = Array.isArray(query.channels) ? query.channels : [query.channels];
    }

    let templatesQuery: string[] | null = null;
    if (query.templates) {
      templatesQuery = Array.isArray(query.templates) ? query.templates : [query.templates];
    }

    let emailsQuery: string[] = [];
    if (query.emails) {
      emailsQuery = Array.isArray(query.emails) ? query.emails : [query.emails];
    }

    let subscribersQuery: string[] = [];
    if (query.subscriberIds) {
      subscribersQuery = Array.isArray(query.subscriberIds) ? query.subscriberIds : [query.subscriberIds];
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
        subscriberIds: subscribersQuery,
        transactionId: query.transactionId,
      })
    );
  }

  @ApiResponse(ActivityStatsResponseDto)
  @ApiOperation({
    summary: 'Get notification statistics',
  })
  @Get('/stats')
  @UseGuards(UserAuthGuard)
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
  @UseGuards(UserAuthGuard)
  @ExternalApiAccessible()
  @ApiResponse(ActivityGraphStatesResponse, 200, true)
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
  @ApiResponse(ActivityNotificationResponseDto)
  @ApiOperation({
    summary: 'Get notification',
  })
  @UseGuards(UserAuthGuard)
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
