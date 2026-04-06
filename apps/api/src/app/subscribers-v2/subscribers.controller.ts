import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  CreateOrUpdateSubscriberCommand,
  CreateOrUpdateSubscriberUseCase,
  ExternalApiAccessible,
  RequirePermissions,
  SubscriberResponseDto,
  UserSession,
} from '@novu/application-generic';
import {
  ApiRateLimitCategoryEnum,
  ButtonTypeEnum,
  DirectionEnum,
  MessageActionStatusEnum,
  PermissionsEnum,
  SubscriberCustomData,
  UserSessionData,
} from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { GetPreferencesResponseDto } from '../inbox/dtos/get-preferences-response.dto';
import { BulkUpdatePreferencesCommand } from '../inbox/usecases/bulk-update-preferences/bulk-update-preferences.command';
import { BulkUpdatePreferences } from '../inbox/usecases/bulk-update-preferences/bulk-update-preferences.usecase';
import { DeleteAllNotificationsCommand } from '../inbox/usecases/delete-all-notifications/delete-all-notifications.command';
import { DeleteAllNotifications } from '../inbox/usecases/delete-all-notifications/delete-all-notifications.usecase';
import { DeleteNotificationCommand } from '../inbox/usecases/delete-notification/delete-notification.command';
import { DeleteNotification } from '../inbox/usecases/delete-notification/delete-notification.usecase';
import { GetNotificationsCommand } from '../inbox/usecases/get-notifications/get-notifications.command';
import { GetNotifications } from '../inbox/usecases/get-notifications/get-notifications.usecase';
import { MarkNotificationAsCommand } from '../inbox/usecases/mark-notification-as/mark-notification-as.command';
import { MarkNotificationAs } from '../inbox/usecases/mark-notification-as/mark-notification-as.usecase';
import { MarkNotificationsAsSeenCommand } from '../inbox/usecases/mark-notifications-as-seen/mark-notifications-as-seen.command';
import { MarkNotificationsAsSeen } from '../inbox/usecases/mark-notifications-as-seen/mark-notifications-as-seen.usecase';
import { NotificationsCountCommand } from '../inbox/usecases/notifications-count/notifications-count.command';
import { NotificationsCount } from '../inbox/usecases/notifications-count/notifications-count.usecase';
import { SnoozeNotificationCommand } from '../inbox/usecases/snooze-notification/snooze-notification.command';
import { SnoozeNotification } from '../inbox/usecases/snooze-notification/snooze-notification.usecase';
import { UnsnoozeNotificationCommand } from '../inbox/usecases/unsnooze-notification/unsnooze-notification.command';
import { UnsnoozeNotification } from '../inbox/usecases/unsnooze-notification/unsnooze-notification.usecase';
import { UpdateAllNotificationsCommand } from '../inbox/usecases/update-all-notifications/update-all-notifications.command';
import { UpdateAllNotifications } from '../inbox/usecases/update-all-notifications/update-all-notifications.usecase';
import { UpdateNotificationActionCommand } from '../inbox/usecases/update-notification-action/update-notification-action.command';
import { UpdateNotificationAction } from '../inbox/usecases/update-notification-action/update-notification-action.usecase';
import { ThrottlerCategory } from '../rate-limiting/guards/throttler.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { SdkGroupName, SdkMethodName } from '../shared/framework/swagger/sdk.decorators';
import {
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
} from '../subscribers/usecases/get-subscriber-global-preference';
import { ListSubscriberSubscriptionsQueryDto } from '../topics-v2/dtos/list-subscriber-subscriptions-query.dto';
import { ListTopicSubscriptionsResponseDto } from '../topics-v2/dtos/list-topic-subscriptions-response.dto';
import { ListSubscriberSubscriptionsCommand } from '../topics-v2/usecases/list-subscriber-subscriptions/list-subscriber-subscriptions.command';
import { ListSubscriberSubscriptionsUseCase } from '../topics-v2/usecases/list-subscriber-subscriptions/list-subscriber-subscriptions.usecase';
import { BulkUpdateSubscriberPreferencesDto } from './dtos/bulk-update-subscriber-preferences.dto';
import { ContextKeysQueryDto } from './dtos/context-keys-query.dto';
import { CreateSubscriberRequestDto } from './dtos/create-subscriber.dto';
import { GetSubscriberNotificationsCountQueryDto } from './dtos/get-subscriber-notifications-count-query.dto';
import { GetSubscriberNotificationsCountResponseDto } from './dtos/get-subscriber-notifications-count-response.dto';
import { GetSubscriberNotificationsQueryDto } from './dtos/get-subscriber-notifications-query.dto';
import { GetSubscriberNotificationsResponseDto } from './dtos/get-subscriber-notifications-response.dto';
import { GetSubscriberPreferencesDto } from './dtos/get-subscriber-preferences.dto';
import { GetSubscriberPreferencesRequestDto } from './dtos/get-subscriber-preferences-request.dto';
import { InboxNotificationDto } from './dtos/inbox-notification.dto';
import { ListSubscribersQueryDto } from './dtos/list-subscribers-query.dto';
import { ListSubscribersResponseDto } from './dtos/list-subscribers-response.dto';
import { MarkSubscriberNotificationsAsSeenDto } from './dtos/mark-subscriber-notifications-as-seen.dto';
import { PatchSubscriberRequestDto } from './dtos/patch-subscriber.dto';
import { PatchSubscriberPreferencesDto } from './dtos/patch-subscriber-preferences.dto';
import { RemoveSubscriberResponseDto } from './dtos/remove-subscriber.dto';
import { SnoozeSubscriberNotificationDto } from './dtos/snooze-subscriber-notification.dto';
import { SubscriberGlobalPreferenceDto } from './dtos/subscriber-global-preference.dto';
import { UpdateAllSubscriberNotificationsDto } from './dtos/update-all-subscriber-notifications.dto';
import { GetSubscriberCommand } from './usecases/get-subscriber/get-subscriber.command';
import { GetSubscriber } from './usecases/get-subscriber/get-subscriber.usecase';
import { GetSubscriberPreferencesCommand } from './usecases/get-subscriber-preferences/get-subscriber-preferences.command';
import { GetSubscriberPreferences } from './usecases/get-subscriber-preferences/get-subscriber-preferences.usecase';
import { ListSubscribersCommand } from './usecases/list-subscribers/list-subscribers.command';
import { ListSubscribersUseCase } from './usecases/list-subscribers/list-subscribers.usecase';
import { mapSubscriberEntityToDto } from './usecases/list-subscribers/map-subscriber-entity-to.dto';
import { PatchSubscriberCommand } from './usecases/patch-subscriber/patch-subscriber.command';
import { PatchSubscriber } from './usecases/patch-subscriber/patch-subscriber.usecase';
import { RemoveSubscriberCommand } from './usecases/remove-subscriber/remove-subscriber.command';
import { RemoveSubscriber } from './usecases/remove-subscriber/remove-subscriber.usecase';
import { UpdateSubscriberPreferencesCommand } from './usecases/update-subscriber-preferences/update-subscriber-preferences.command';
import { UpdateSubscriberPreferences } from './usecases/update-subscriber-preferences/update-subscriber-preferences.usecase';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@Controller({ path: '/subscribers', version: '2' })
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Subscribers')
@SdkGroupName('Subscribers')
@RequireAuthentication()
@ApiCommonResponses()
export class SubscribersController {
  constructor(
    private listSubscribersUsecase: ListSubscribersUseCase,
    private getSubscriberUsecase: GetSubscriber,
    private patchSubscriberUsecase: PatchSubscriber,
    private removeSubscriberUsecase: RemoveSubscriber,
    private getSubscriberPreferencesUsecase: GetSubscriberPreferences,
    private updateSubscriberPreferencesUsecase: UpdateSubscriberPreferences,
    private bulkUpdatePreferencesUsecase: BulkUpdatePreferences,
    private createOrUpdateSubscriberUsecase: CreateOrUpdateSubscriberUseCase,
    private listSubscriberSubscriptionsUsecase: ListSubscriberSubscriptionsUseCase,
    private getSubscriberGlobalPreference: GetSubscriberGlobalPreference,
    private getNotificationsUsecase: GetNotifications,
    private notificationsCountUsecase: NotificationsCount,
    private markNotificationAsUsecase: MarkNotificationAs,
    private snoozeNotificationUsecase: SnoozeNotification,
    private unsnoozeNotificationUsecase: UnsnoozeNotification,
    private deleteNotificationUsecase: DeleteNotification,
    private updateNotificationActionUsecase: UpdateNotificationAction,
    private markNotificationsAsSeenUsecase: MarkNotificationsAsSeen,
    private updateAllNotificationsUsecase: UpdateAllNotifications,
    private deleteAllNotificationsUsecase: DeleteAllNotifications
  ) {}

  @Get('')
  @ExternalApiAccessible()
  @SdkMethodName('search')
  @ApiOperation({
    summary: 'Search subscribers',
    description: `Search subscribers by their **email**, **phone**, **subscriberId** and **name**. 
    The search is case sensitive and supports pagination.Checkout all available filters in the query section.`,
  })
  @ApiResponse(ListSubscribersResponseDto)
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_READ)
  async searchSubscribers(
    @UserSession() user: UserSessionData,
    @Query() query: ListSubscribersQueryDto
  ): Promise<ListSubscribersResponseDto> {
    return await this.listSubscribersUsecase.execute(
      ListSubscribersCommand.create({
        user,
        limit: Number(query.limit || '10'),
        after: query.after,
        before: query.before,
        orderDirection: query.orderDirection || DirectionEnum.DESC,
        orderBy: query.orderBy || '_id',
        email: query.email,
        phone: query.phone,
        subscriberId: query.subscriberId,
        name: query.name,
        includeCursor: query.includeCursor,
      })
    );
  }

  @Get('/:subscriberId')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Retrieve a subscriber',
    description: `Retrieve a subscriber by its unique key identifier **subscriberId**. 
    **subscriberId** field is required.`,
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiResponse(SubscriberResponseDto)
  @SdkMethodName('retrieve')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_READ)
  async getSubscriber(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string
  ): Promise<SubscriberResponseDto> {
    return await this.getSubscriberUsecase.execute(
      GetSubscriberCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
      })
    );
  }

  @Post('')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Create a subscriber',
    description: `Create a subscriber with the subscriber attributes. 
      **subscriberId** is a required field, rest other fields are optional, if the subscriber already exists, it will be updated`,
  })
  @ApiQuery({
    name: 'failIfExists',
    required: false,
    type: Boolean,
    description: 'If true, the request will fail if a subscriber with the same subscriberId already exists',
  })
  @ApiResponse(SubscriberResponseDto, 201)
  @ApiResponse(SubscriberResponseDto, 409, false, false, {
    description: 'Subscriber already exists (when query param failIfExists=true)',
  })
  @SdkMethodName('create')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  async createSubscriber(
    @UserSession() user: UserSessionData,
    @Body() body: CreateSubscriberRequestDto,
    @Query('failIfExists') failIfExists?: boolean
  ): Promise<SubscriberResponseDto> {
    const subscriberEntity = await this.createOrUpdateSubscriberUsecase.execute(
      CreateOrUpdateSubscriberCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId: body.subscriberId,
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        avatar: body.avatar,
        locale: body.locale,
        timezone: body.timezone,
        // TODO: Change shared type to
        data: (body.data || {}) as SubscriberCustomData,
        /*
         * TODO: In Subscriber V2 API endpoint we haven't added channels yet.
         * channels: body.channels || [],
         */
        failIfExists,
      })
    );

    return mapSubscriberEntityToDto(subscriberEntity);
  }

  @Patch('/:subscriberId')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Update a subscriber',
    description: `Update a subscriber by its unique key identifier **subscriberId**. 
    **subscriberId** is a required field, rest other fields are optional`,
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiResponse(SubscriberResponseDto)
  @SdkMethodName('patch')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  async patchSubscriber(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Body() body: PatchSubscriberRequestDto
  ): Promise<SubscriberResponseDto> {
    return await this.patchSubscriberUsecase.execute(
      PatchSubscriberCommand.create({
        subscriberId,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        patchSubscriberRequestDto: body,
        userId: user._id,
      })
    );
  }

  @Delete('/:subscriberId')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Delete a subscriber',
    description: `Deletes a subscriber entity from the Novu platform along with associated messages, preferences, and topic subscriptions. 
      **subscriberId** is a required field.`,
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiResponse(RemoveSubscriberResponseDto, 200)
  @SdkMethodName('delete')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  async removeSubscriber(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string
  ): Promise<RemoveSubscriberResponseDto> {
    return await this.removeSubscriberUsecase.execute(
      RemoveSubscriberCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
      })
    );
  }

  @Get('/:subscriberId/preferences')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Retrieve subscriber preferences',
    description: `Retrieve subscriber channel preferences by its unique key identifier **subscriberId**. 
    This API returns all five channels preferences for all workflows and global preferences.`,
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiResponse(GetSubscriberPreferencesDto)
  @SdkGroupName('Subscribers.Preferences')
  @SdkMethodName('list')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_READ)
  async getSubscriberPreferences(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Query() query: GetSubscriberPreferencesRequestDto
  ): Promise<GetSubscriberPreferencesDto> {
    return await this.getSubscriberPreferencesUsecase.execute(
      GetSubscriberPreferencesCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        criticality: query.criticality,
        contextKeys: query.contextKeys,
      })
    );
  }

  @Get('/:subscriberId/preferences/global')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Retrieve subscriber global preference',
    description: `Retrieve subscriber global preference. This API returns all five global channels preferences and subscriber schedule.`,
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiResponse(SubscriberGlobalPreferenceDto)
  @SdkGroupName('Subscribers.Preferences')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_READ)
  @SdkMethodName('globalPreference')
  @ApiExcludeEndpoint()
  async getGlobalPreference(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string
  ): Promise<SubscriberGlobalPreferenceDto> {
    const globalPreference = await this.getSubscriberGlobalPreference.execute(
      GetSubscriberGlobalPreferenceCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        subscriberId: subscriberId,
        includeInactiveChannels: false,
      })
    );

    return globalPreference.preference;
  }

  @Patch('/:subscriberId/preferences/bulk')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Bulk update subscriber preferences',
    description: `Bulk update subscriber preferences by its unique key identifier **subscriberId**. 
    This API allows updating multiple workflow preferences in a single request.`,
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiResponse(GetPreferencesResponseDto, 200, true)
  @SdkGroupName('Subscribers.Preferences')
  @SdkMethodName('bulkUpdate')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  async bulkUpdateSubscriberPreferences(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Body() body: BulkUpdateSubscriberPreferencesDto
  ): Promise<GetPreferencesResponseDto[]> {
    const preferences = body.preferences.map((preference) => ({
      workflowId: preference.workflowId,
      email: preference.channels?.email,
      sms: preference.channels?.sms,
      in_app: preference.channels?.in_app,
      push: preference.channels?.push,
      chat: preference.channels?.chat,
    }));

    return await this.bulkUpdatePreferencesUsecase.execute(
      BulkUpdatePreferencesCommand.create({
        organizationId: user.organizationId,
        subscriberId,
        environmentId: user.environmentId,
        preferences,
        context: body.context,
      })
    );
  }

  @Patch('/:subscriberId/preferences')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Update subscriber preferences',
    description: `Update subscriber preferences by its unique key identifier **subscriberId**. 
    **workflowId** is optional field, if provided, this API will update that workflow preference, 
    otherwise it will update global preferences`,
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiResponse(GetSubscriberPreferencesDto)
  @SdkGroupName('Subscribers.Preferences')
  @SdkMethodName('update')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  async updateSubscriberPreferences(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Body() body: PatchSubscriberPreferencesDto
  ): Promise<GetSubscriberPreferencesDto> {
    return await this.updateSubscriberPreferencesUsecase.execute(
      UpdateSubscriberPreferencesCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        workflowIdOrInternalId: body.workflowId,
        channels: body.channels,
        schedule: body.schedule,
        context: body.context,
      })
    );
  }

  @Get('/:subscriberId/subscriptions')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Retrieve subscriber subscriptions',
    description: `Retrieve subscriber's topic subscriptions by its unique key identifier **subscriberId**. 
    Checkout all available filters in the query section.`,
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiResponse(ListTopicSubscriptionsResponseDto)
  @SdkGroupName('Subscribers.Topics')
  @SdkMethodName('list')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_READ)
  async listSubscriberTopics(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Query() query: ListSubscriberSubscriptionsQueryDto
  ): Promise<ListTopicSubscriptionsResponseDto> {
    return await this.listSubscriberSubscriptionsUsecase.execute(
      ListSubscriberSubscriptionsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        topicKey: query.key,
        contextKeys: query.contextKeys,
        limit: query.limit ? Number(query.limit) : 10,
        after: query.after,
        before: query.before,
        orderDirection: query.orderDirection === DirectionEnum.ASC ? 1 : -1,
        orderBy: query.orderBy || '_id',
        includeCursor: query.includeCursor,
      })
    );
  }

  @Get('/:subscriberId/notifications')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Retrieve subscriber notifications',
    description: `Retrieve in-app (inbox) notifications for a subscriber by its unique key identifier **subscriberId**. 
    Supports filtering by tags, read/archived/snoozed/seen state, data attributes, severity, date range, and context keys.`,
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiResponse(GetSubscriberNotificationsResponseDto)
  @SdkGroupName('Subscribers.Notifications')
  @SdkMethodName('list')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_READ)
  async getSubscriberNotifications(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Query() query: GetSubscriberNotificationsQueryDto
  ): Promise<GetSubscriberNotificationsResponseDto> {
    return await this.getNotificationsUsecase.execute(
      GetNotificationsCommand.create({
        organizationId: user.organizationId,
        subscriberId,
        environmentId: user.environmentId,
        contextKeys: query.contextKeys,
        limit: query.limit,
        offset: query.offset,
        after: query.after,
        tags: query.tags,
        read: query.read,
        archived: query.archived,
        snoozed: query.snoozed,
        seen: query.seen,
        data: query.data,
        severity: query.severity,
        createdGte: query.createdGte,
        createdLte: query.createdLte,
      })
    );
  }

  @Get('/:subscriberId/notifications/count')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Retrieve subscriber notifications count',
    description: `Retrieve count of in-app (inbox) notifications for a subscriber by its unique key identifier **subscriberId**. 
    Supports multiple filters to count in-app (inbox) notifications by different criteria, including context keys.`,
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiResponse(GetSubscriberNotificationsCountResponseDto, 200, true)
  @SdkGroupName('Subscribers.Notifications')
  @SdkMethodName('count')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_READ)
  async getSubscriberNotificationsCount(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Query() query: GetSubscriberNotificationsCountQueryDto
  ): Promise<{ data: GetSubscriberNotificationsCountResponseDto[] }> {
    return await this.notificationsCountUsecase.execute(
      NotificationsCountCommand.create({
        organizationId: user.organizationId,
        subscriberId,
        environmentId: user.environmentId,
        filters: query.filters,
      })
    );
  }

  @Patch('/:subscriberId/notifications/:notificationId/read')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Mark a notification as read',
    description: 'Mark a specific in-app (inbox) notification as read by its unique identifier **notificationId**.',
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiParam({ name: 'notificationId', description: 'The identifier of the notification', type: String })
  @ApiQuery({ name: 'contextKeys', required: false, type: [String], description: 'Context keys for filtering' })
  @ApiResponse(InboxNotificationDto, 200, false, false)
  @SdkGroupName('Subscribers.Notifications')
  @SdkMethodName('markAsRead')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  async markNotificationAsRead(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Param('notificationId') notificationId: string,
    @Query() query: ContextKeysQueryDto
  ): Promise<InboxNotificationDto> {
    return await this.markNotificationAsUsecase.execute(
      MarkNotificationAsCommand.create({
        organizationId: user.organizationId,
        subscriberId,
        environmentId: user.environmentId,
        contextKeys: query.contextKeys,
        notificationId,
        read: true,
      })
    );
  }

  @Patch('/:subscriberId/notifications/:notificationId/unread')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Mark a notification as unread',
    description: 'Mark a specific in-app (inbox) notification as unread by its unique identifier **notificationId**.',
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiParam({ name: 'notificationId', description: 'The identifier of the notification', type: String })
  @ApiQuery({ name: 'contextKeys', required: false, type: [String], description: 'Context keys for filtering' })
  @ApiResponse(InboxNotificationDto, 200, false, false)
  @SdkGroupName('Subscribers.Notifications')
  @SdkMethodName('markAsUnread')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  async markNotificationAsUnread(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Param('notificationId') notificationId: string,
    @Query() query: ContextKeysQueryDto
  ): Promise<InboxNotificationDto> {
    return await this.markNotificationAsUsecase.execute(
      MarkNotificationAsCommand.create({
        organizationId: user.organizationId,
        subscriberId,
        environmentId: user.environmentId,
        contextKeys: query.contextKeys,
        notificationId,
        read: false,
      })
    );
  }

  @Patch('/:subscriberId/notifications/:notificationId/archive')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Archive a notification',
    description: 'Archive a specific in-app (inbox) notification by its unique identifier **notificationId**.',
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiParam({ name: 'notificationId', description: 'The identifier of the notification', type: String })
  @ApiQuery({ name: 'contextKeys', required: false, type: [String], description: 'Context keys for filtering' })
  @ApiResponse(InboxNotificationDto, 200, false, false)
  @SdkGroupName('Subscribers.Notifications')
  @SdkMethodName('archive')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  async archiveNotification(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Param('notificationId') notificationId: string,
    @Query() query: ContextKeysQueryDto
  ): Promise<InboxNotificationDto> {
    return await this.markNotificationAsUsecase.execute(
      MarkNotificationAsCommand.create({
        organizationId: user.organizationId,
        subscriberId,
        environmentId: user.environmentId,
        contextKeys: query.contextKeys,
        notificationId,
        archived: true,
      })
    );
  }

  @Patch('/:subscriberId/notifications/:notificationId/unarchive')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Unarchive a notification',
    description: 'Unarchive a specific in-app (inbox) notification by its unique identifier **notificationId**.',
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiParam({ name: 'notificationId', description: 'The identifier of the notification', type: String })
  @ApiQuery({ name: 'contextKeys', required: false, type: [String], description: 'Context keys for filtering' })
  @ApiResponse(InboxNotificationDto, 200, false, false)
  @SdkGroupName('Subscribers.Notifications')
  @SdkMethodName('unarchive')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  async unarchiveNotification(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Param('notificationId') notificationId: string,
    @Query() query: ContextKeysQueryDto
  ): Promise<InboxNotificationDto> {
    return await this.markNotificationAsUsecase.execute(
      MarkNotificationAsCommand.create({
        organizationId: user.organizationId,
        subscriberId,
        environmentId: user.environmentId,
        contextKeys: query.contextKeys,
        notificationId,
        archived: false,
      })
    );
  }

  @Patch('/:subscriberId/notifications/:notificationId/snooze')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Snooze a notification',
    description:
      'Snooze a specific in-app (inbox) notification by its unique identifier **notificationId** until a specified time.',
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiParam({ name: 'notificationId', description: 'The identifier of the notification', type: String })
  @ApiQuery({ name: 'contextKeys', required: false, type: [String], description: 'Context keys for filtering' })
  @ApiResponse(InboxNotificationDto, 200, false, false)
  @SdkGroupName('Subscribers.Notifications')
  @SdkMethodName('snooze')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  async snoozeNotification(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Param('notificationId') notificationId: string,
    @Body() body: SnoozeSubscriberNotificationDto,
    @Query() query: ContextKeysQueryDto
  ): Promise<InboxNotificationDto> {
    return await this.snoozeNotificationUsecase.execute(
      SnoozeNotificationCommand.create({
        organizationId: user.organizationId,
        subscriberId,
        environmentId: user.environmentId,
        contextKeys: query.contextKeys,
        notificationId,
        snoozeUntil: body.snoozeUntil,
      })
    );
  }

  @Patch('/:subscriberId/notifications/:notificationId/unsnooze')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Unsnooze a notification',
    description: 'Unsnooze a specific in-app (inbox) notification by its unique identifier **notificationId**.',
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiParam({ name: 'notificationId', description: 'The identifier of the notification', type: String })
  @ApiQuery({ name: 'contextKeys', required: false, type: [String], description: 'Context keys for filtering' })
  @ApiResponse(InboxNotificationDto, 200, false, false)
  @SdkGroupName('Subscribers.Notifications')
  @SdkMethodName('unsnooze')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  async unsnoozeNotification(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Param('notificationId') notificationId: string,
    @Query() query: ContextKeysQueryDto
  ): Promise<InboxNotificationDto> {
    return await this.unsnoozeNotificationUsecase.execute(
      UnsnoozeNotificationCommand.create({
        organizationId: user.organizationId,
        subscriberId,
        environmentId: user.environmentId,
        contextKeys: query.contextKeys,
        notificationId,
      })
    );
  }

  @Delete('/:subscriberId/notifications/:notificationId')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Delete a notification',
    description:
      'Delete a specific in-app (inbox) notification permanently by its unique identifier **notificationId**.',
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiParam({ name: 'notificationId', description: 'The identifier of the notification', type: String })
  @ApiQuery({ name: 'contextKeys', required: false, type: [String], description: 'Context keys for filtering' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @SdkGroupName('Subscribers.Notifications')
  @SdkMethodName('delete')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  async deleteNotification(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Param('notificationId') notificationId: string,
    @Query() query: ContextKeysQueryDto
  ): Promise<void> {
    await this.deleteNotificationUsecase.execute(
      DeleteNotificationCommand.create({
        organizationId: user.organizationId,
        subscriberId,
        environmentId: user.environmentId,
        contextKeys: query.contextKeys,
        notificationId,
      })
    );
  }

  @Patch('/:subscriberId/notifications/:notificationId/actions/:actionType/complete')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Complete a notification action',
    description:
      "Mark a single in-app (inbox) notification's action (primary or secondary) as completed by its unique identifier **notificationId** and action type **actionType**.",
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiParam({ name: 'notificationId', description: 'The identifier of the notification', type: String })
  @ApiParam({
    name: 'actionType',
    description: 'The type of action (primary or secondary)',
    enum: ButtonTypeEnum,
    type: String,
  })
  @ApiQuery({ name: 'contextKeys', required: false, type: [String], description: 'Context keys for filtering' })
  @ApiResponse(InboxNotificationDto, 200, false, false)
  @SdkGroupName('Subscribers.Notifications')
  @SdkMethodName('completeAction')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  async completeNotificationAction(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Param('notificationId') notificationId: string,
    @Param('actionType') actionType: ButtonTypeEnum,
    @Query() query: ContextKeysQueryDto
  ): Promise<InboxNotificationDto> {
    return await this.updateNotificationActionUsecase.execute(
      UpdateNotificationActionCommand.create({
        organizationId: user.organizationId,
        subscriberId,
        environmentId: user.environmentId,
        contextKeys: query.contextKeys,
        notificationId,
        actionType,
        actionStatus: MessageActionStatusEnum.DONE,
      })
    );
  }

  @Patch('/:subscriberId/notifications/:notificationId/actions/:actionType/revert')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Revert a notification action',
    description:
      "Revert a single in-app (inbox) notification's action (primary or secondary) to pending state by its unique identifier **notificationId** and action type **actionType**.",
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiParam({ name: 'notificationId', description: 'The identifier of the notification', type: String })
  @ApiParam({
    name: 'actionType',
    description: 'The type of action (primary or secondary)',
    enum: ButtonTypeEnum,
    type: String,
  })
  @ApiQuery({ name: 'contextKeys', required: false, type: [String], description: 'Context keys for filtering' })
  @ApiResponse(InboxNotificationDto, 200, false, false)
  @SdkGroupName('Subscribers.Notifications')
  @SdkMethodName('revertAction')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  async revertNotificationAction(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Param('notificationId') notificationId: string,
    @Param('actionType') actionType: ButtonTypeEnum,
    @Query() query: ContextKeysQueryDto
  ): Promise<InboxNotificationDto> {
    return await this.updateNotificationActionUsecase.execute(
      UpdateNotificationActionCommand.create({
        organizationId: user.organizationId,
        subscriberId,
        environmentId: user.environmentId,
        contextKeys: query.contextKeys,
        notificationId,
        actionType,
        actionStatus: MessageActionStatusEnum.PENDING,
      })
    );
  }

  @Post('/:subscriberId/notifications/seen')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Mark notifications as seen',
    description: 'Mark specific and multiple in-app (inbox) notifications as seen. Supports context-based filtering.',
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @HttpCode(HttpStatus.NO_CONTENT)
  @SdkGroupName('Subscribers.Notifications')
  @SdkMethodName('markAsSeen')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  async markNotificationsAsSeen(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Body() body: MarkSubscriberNotificationsAsSeenDto
  ): Promise<void> {
    await this.markNotificationsAsSeenUsecase.execute(
      MarkNotificationsAsSeenCommand.create({
        organizationId: user.organizationId,
        subscriberId,
        environmentId: user.environmentId,
        contextKeys: body.contextKeys,
        notificationIds: body.notificationIds,
        tags: body.tags,
        data: body.data,
      })
    );
  }

  @Post('/:subscriberId/notifications/read')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description:
      'Mark all in-app (inbox) notifications matching the specified filters as read. Supports context-based filtering.',
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @HttpCode(HttpStatus.NO_CONTENT)
  @SdkGroupName('Subscribers.Notifications')
  @SdkMethodName('markAllAsRead')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  async markAllNotificationsAsRead(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Body() body: UpdateAllSubscriberNotificationsDto
  ): Promise<void> {
    await this.updateAllNotificationsUsecase.execute(
      UpdateAllNotificationsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        contextKeys: body.contextKeys,
        from: {
          tags: body.tags,
          data: body.data,
        },
        to: {
          read: true,
        },
      })
    );
  }

  @Post('/:subscriberId/notifications/archive')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Archive all notifications',
    description:
      'Archive all in-app (inbox) notifications matching the specified filters. Supports context-based filtering.',
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @HttpCode(HttpStatus.NO_CONTENT)
  @SdkGroupName('Subscribers.Notifications')
  @SdkMethodName('archiveAll')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  async archiveAllNotifications(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Body() body: UpdateAllSubscriberNotificationsDto
  ): Promise<void> {
    await this.updateAllNotificationsUsecase.execute(
      UpdateAllNotificationsCommand.create({
        organizationId: user.organizationId,
        subscriberId,
        environmentId: user.environmentId,
        contextKeys: body.contextKeys,
        from: {
          tags: body.tags,
          data: body.data,
        },
        to: {
          archived: true,
        },
      })
    );
  }

  @Post('/:subscriberId/notifications/read-archive')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Archive all read notifications',
    description:
      'Archive all read in-app (inbox) notifications matching the specified filters. Supports context-based filtering.',
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @HttpCode(HttpStatus.NO_CONTENT)
  @SdkGroupName('Subscribers.Notifications')
  @SdkMethodName('archiveAllRead')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  async archiveAllReadNotifications(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Body() body: UpdateAllSubscriberNotificationsDto
  ): Promise<void> {
    await this.updateAllNotificationsUsecase.execute(
      UpdateAllNotificationsCommand.create({
        organizationId: user.organizationId,
        subscriberId,
        environmentId: user.environmentId,
        contextKeys: body.contextKeys,
        from: {
          tags: body.tags,
          read: true,
          data: body.data,
        },
        to: {
          archived: true,
        },
      })
    );
  }

  @Post('/:subscriberId/notifications/delete')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Delete all notifications',
    description:
      'Permanently delete all in-app (inbox) notifications matching the specified filters. Supports context-based filtering.',
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @HttpCode(HttpStatus.NO_CONTENT)
  @SdkGroupName('Subscribers.Notifications')
  @SdkMethodName('deleteAll')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  async deleteAllNotifications(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Body() body: UpdateAllSubscriberNotificationsDto
  ): Promise<void> {
    await this.deleteAllNotificationsUsecase.execute(
      DeleteAllNotificationsCommand.create({
        organizationId: user.organizationId,
        subscriberId,
        environmentId: user.environmentId,
        contextKeys: body.contextKeys,
        filters: {
          tags: body.tags,
          data: body.data,
        },
      })
    );
  }
}
