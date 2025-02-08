import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ChannelTypeEnum, UserSessionData } from '@novu/shared';

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
import { ApiCommonResponses, ApiOkResponse, ApiResponse } from '../shared/framework/response.decorator';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import { SdkGroupName, SdkMethodName } from '../shared/framework/swagger/sdk.decorators';

@ApiCommonResponses()
@Controller('/notifications')
@ApiTags('Notifications')
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
  @UserAuthentication()
  @ExternalApiAccessible()
  listNotifications(
    @UserSession() user: UserSessionData,
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
        after: query.after,
        before: query.before,
      })
    );
  }

  @ApiResponse(ActivityStatsResponseDto)
  @ApiOperation({
    summary: 'Get notification statistics',
  })
  @Get('/stats')
  @UserAuthentication()
  @ExternalApiAccessible()
  @SdkGroupName('Notifications.Stats')
  getActivityStats(@UserSession() user: UserSessionData): Promise<ActivityStatsResponseDto> {
    return this.getActivityStatsUsecase.execute(
      GetActivityStatsCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
      })
    );
  }

  @Get('/graph/stats')
  @UserAuthentication()
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
  @SdkGroupName('Notifications.Stats')
  @SdkMethodName('graph')
  getActivityGraphStats(
    @UserSession() user: UserSessionData,
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
  @UserAuthentication()
  @ExternalApiAccessible()
  getNotification(
    @UserSession() user: UserSessionData,
    @Param('notificationId') notificationId: string
  ): Promise<ActivityNotificationResponseDto> {
    return this.getActivityUsecase.execute(
      GetActivityCommand.create({
        notificationId,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
      })
    );
  }
}
