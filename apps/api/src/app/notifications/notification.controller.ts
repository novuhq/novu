import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import { ChannelTypeEnum, PermissionsEnum, SeverityLevelEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ApiCommonResponses, ApiOkResponse, ApiResponse } from '../shared/framework/response.decorator';
import { SdkGroupName, SdkMethodName } from '../shared/framework/swagger/sdk.decorators';
import { UserSession } from '../shared/framework/user.decorator';
import { ActivitiesRequestDto } from './dtos/activities-request.dto';
import { ActivitiesResponseDto, ActivityNotificationResponseDto } from './dtos/activities-response.dto';
import { ActivityGraphStatesResponse } from './dtos/activity-graph-states-response.dto';
import { ActivityStatsResponseDto } from './dtos/activity-stats-response.dto';
import { GetActivityCommand } from './usecases/get-activity/get-activity.command';
import { GetActivity } from './usecases/get-activity/get-activity.usecase';
import { GetActivityFeedCommand } from './usecases/get-activity-feed/get-activity-feed.command';
import { GetActivityFeed } from './usecases/get-activity-feed/get-activity-feed.usecase';
import { GetActivityGraphStatsCommand } from './usecases/get-activity-graph-states/get-activity-graph-states.command';
import { GetActivityGraphStats } from './usecases/get-activity-graph-states/get-activity-graph-states.usecase';
import { GetActivityStats, GetActivityStatsCommand } from './usecases/get-activity-stats';

@ApiCommonResponses()
@RequireAuthentication()
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
    summary: 'List all events',
    description: `List all notification events (triggered events) for the current environment. 
    This API supports filtering by **channels**, **templates**, **emails**, **subscriberIds**, **transactionId**, **topicKey**. 
    Checkout all available filters in the query section.
    This API returns event triggers, to list each channel notifications, check messages APIs.`,
  })
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.NOTIFICATION_READ)
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

    let transactionIdQuery: string[] | undefined;
    if (query.transactionId) {
      transactionIdQuery = Array.isArray(query.transactionId) ? query.transactionId : [query.transactionId];
    }

    let severityQuery: SeverityLevelEnum[] | null = null;
    if (query.severity) {
      severityQuery = Array.isArray(query.severity) ? query.severity : [query.severity];
    }

    return this.getActivityFeedUsecase.execute(
      GetActivityFeedCommand.create({
        page: query.page,
        limit: query.limit,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
        channels: channelsQuery,
        templates: templatesQuery,
        emails: emailsQuery,
        search: query.search,
        subscriberIds: subscribersQuery,
        transactionId: transactionIdQuery,
        topicKey: query.topicKey,
        severity: severityQuery,
        after: query.after,
        before: query.before,
      })
    );
  }

  @ApiResponse(ActivityStatsResponseDto)
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Retrieve events statistics',
    description: `Retrieve notification statistics for the current environment. 
    This API returns the number of weekly and monthly notifications sent for the current environment.`,
    deprecated: true,
  })
  @Get('/stats')
  @ExternalApiAccessible()
  @SdkGroupName('Notifications.Stats')
  @RequirePermissions(PermissionsEnum.NOTIFICATION_READ)
  getActivityStats(@UserSession() user: UserSessionData): Promise<ActivityStatsResponseDto> {
    return this.getActivityStatsUsecase.execute(
      GetActivityStatsCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
      })
    );
  }

  @Get('/graph/stats')
  @ExternalApiAccessible()
  @ApiExcludeEndpoint()
  @ApiResponse(ActivityGraphStatesResponse, 200, true)
  @ApiOperation({
    summary: 'Retrieve events graph statistics',
    description: `Retrieve events graph statistics for the current environment. 
    This API returns the number of events sent. This data is used to generate the graph in the legacy dashboard.`,
    deprecated: true,
  })
  @ApiQuery({
    name: 'days',
    type: Number,
    required: false,
  })
  @SdkGroupName('Notifications.Stats')
  @SdkMethodName('graph')
  @RequirePermissions(PermissionsEnum.NOTIFICATION_READ)
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
    summary: 'Retrieve an event',
    description: `Retrieve an event by its unique key identifier **notificationId**. 
    Here **notificationId** is of mongodbId type. 
    This API returns the event details - execution logs, status, actual notification (message) generated by each workflow step.`,
  })
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.NOTIFICATION_READ)
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
