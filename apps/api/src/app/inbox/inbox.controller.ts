import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  AddressingTypeEnum,
  MessageActionStatusEnum,
  PreferenceLevelEnum,
  TriggerRequestCategoryEnum,
  UserSessionData,
} from '@novu/shared';
import { TriggerEventRequestDto } from '../events/dtos';
import { TriggerEventResponseDto } from '../events/dtos/trigger-event-response.dto';
import { ParseEventRequestMulticastCommand } from '../events/usecases/parse-event-request';
import { ParseEventRequest } from '../events/usecases/parse-event-request/parse-event-request.usecase';
import { ExcludeFromIdempotency } from '../shared/framework/exclude-from-idempotency';
import { ApiCommonResponses } from '../shared/framework/response.decorator';
import { KeylessAccessible } from '../shared/framework/swagger/keyless.security';
import { SubscriberSession, UserSession } from '../shared/framework/user.decorator';
import { RequestWithReqId } from '../shared/middleware/request-id.middleware';
import {
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
} from '../subscribers/usecases/get-subscriber-global-preference';
import { ActionTypeRequestDto } from './dtos/action-type-request.dto';
import { BulkUpdatePreferencesRequestDto } from './dtos/bulk-update-preferences-request.dto';
import { GetNotificationsCountRequestDto } from './dtos/get-notifications-count-request.dto';
import { GetNotificationsCountResponseDto } from './dtos/get-notifications-count-response.dto';
import { GetNotificationsRequestDto } from './dtos/get-notifications-request.dto';
import { GetNotificationsResponseDto } from './dtos/get-notifications-response.dto';
import { GetPreferencesRequestDto } from './dtos/get-preferences-request.dto';
import { GetPreferencesResponseDto } from './dtos/get-preferences-response.dto';
import { InboxNotificationDto } from './dtos/inbox-notification.dto';
import { MarkNotificationsAsSeenRequestDto } from './dtos/mark-notifications-as-seen-request.dto';
import { SnoozeNotificationRequestDto } from './dtos/snooze-notification-request.dto';
import { SubscriberSessionRequestDto } from './dtos/subscriber-session-request.dto';
import { SubscriberSessionResponseDto } from './dtos/subscriber-session-response.dto';
import { UpdateAllNotificationsRequestDto } from './dtos/update-all-notifications-request.dto';
import { UpdatePreferencesRequestDto } from './dtos/update-preferences-request.dto';
import { ContextCompatibilityInterceptor } from './interceptors/context-compatibility.interceptor';
import { BulkUpdatePreferencesCommand } from './usecases/bulk-update-preferences/bulk-update-preferences.command';
import { BulkUpdatePreferences } from './usecases/bulk-update-preferences/bulk-update-preferences.usecase';
import { DeleteAllNotificationsCommand } from './usecases/delete-all-notifications/delete-all-notifications.command';
import { DeleteAllNotifications } from './usecases/delete-all-notifications/delete-all-notifications.usecase';
import { DeleteNotificationCommand } from './usecases/delete-notification/delete-notification.command';
import { DeleteNotification } from './usecases/delete-notification/delete-notification.usecase';
import { GetInboxPreferencesCommand } from './usecases/get-inbox-preferences/get-inbox-preferences.command';
import { GetInboxPreferences } from './usecases/get-inbox-preferences/get-inbox-preferences.usecase';
import { GetNotificationsCommand } from './usecases/get-notifications/get-notifications.command';
import { GetNotifications } from './usecases/get-notifications/get-notifications.usecase';
import { MarkNotificationAsCommand } from './usecases/mark-notification-as/mark-notification-as.command';
import { MarkNotificationAs } from './usecases/mark-notification-as/mark-notification-as.usecase';
import { MarkNotificationsAsSeenCommand } from './usecases/mark-notifications-as-seen/mark-notifications-as-seen.command';
import { MarkNotificationsAsSeen } from './usecases/mark-notifications-as-seen/mark-notifications-as-seen.usecase';
import { NotificationsCountCommand } from './usecases/notifications-count/notifications-count.command';
import { NotificationsCount } from './usecases/notifications-count/notifications-count.usecase';
import { SessionCommand } from './usecases/session/session.command';
import { Session } from './usecases/session/session.usecase';
import { SnoozeNotificationCommand } from './usecases/snooze-notification/snooze-notification.command';
import { SnoozeNotification } from './usecases/snooze-notification/snooze-notification.usecase';
import { UnsnoozeNotificationCommand } from './usecases/unsnooze-notification/unsnooze-notification.command';
import { UnsnoozeNotification } from './usecases/unsnooze-notification/unsnooze-notification.usecase';
import { UpdateAllNotificationsCommand } from './usecases/update-all-notifications/update-all-notifications.command';
import { UpdateAllNotifications } from './usecases/update-all-notifications/update-all-notifications.usecase';
import { UpdateNotificationActionCommand } from './usecases/update-notification-action/update-notification-action.command';
import { UpdateNotificationAction } from './usecases/update-notification-action/update-notification-action.usecase';
import { UpdatePreferencesCommand } from './usecases/update-preferences/update-preferences.command';
import { UpdatePreferences } from './usecases/update-preferences/update-preferences.usecase';
import type { InboxPreference } from './utils/types';

@ApiCommonResponses()
@Controller('/inbox')
@ApiExcludeController()
@ExcludeFromIdempotency()
export class InboxController {
  constructor(
    private initializeSessionUsecase: Session,
    private getNotificationsUsecase: GetNotifications,
    private notificationsCountUsecase: NotificationsCount,
    private markNotificationAsUsecase: MarkNotificationAs,
    private updateNotificationActionUsecase: UpdateNotificationAction,
    private updateAllNotifications: UpdateAllNotifications,
    private getInboxPreferencesUsecase: GetInboxPreferences,
    private updatePreferencesUsecase: UpdatePreferences,
    private bulkUpdatePreferencesUsecase: BulkUpdatePreferences,
    private snoozeNotificationUsecase: SnoozeNotification,
    private unsnoozeNotificationUsecase: UnsnoozeNotification,
    private markNotificationsAsSeenUsecase: MarkNotificationsAsSeen,
    private parseEventRequest: ParseEventRequest,
    private getSubscriberGlobalPreference: GetSubscriberGlobalPreference,
    private deleteNotificationUsecase: DeleteNotification,
    private deleteAllNotificationsUsecase: DeleteAllNotifications
  ) {}

  @KeylessAccessible()
  @Post('/session')
  async sessionInitialize(
    @Body() body: SubscriberSessionRequestDto,
    @Headers('origin') origin: string
  ): Promise<SubscriberSessionResponseDto> {
    return await this.initializeSessionUsecase.execute(
      SessionCommand.create({
        requestData: body,
        origin,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/notifications')
  async getNotifications(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Query() query: GetNotificationsRequestDto
  ): Promise<GetNotificationsResponseDto> {
    return await this.getNotificationsUsecase.execute(
      GetNotificationsCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        contextKeys: subscriberSession.contextKeys,
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

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/notifications/count')
  async getNotificationsCount(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Query() query: GetNotificationsCountRequestDto
  ): Promise<GetNotificationsCountResponseDto> {
    const res = await this.notificationsCountUsecase.execute(
      NotificationsCountCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        contextKeys: subscriberSession.contextKeys,
        filters: query.filters,
      })
    );

    return res;
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/preferences')
  async getAllPreferences(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Query() query: GetPreferencesRequestDto
  ): Promise<GetPreferencesResponseDto[]> {
    return await this.getInboxPreferencesUsecase.execute(
      GetInboxPreferencesCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        contextKeys: subscriberSession.contextKeys,
        tags: query.tags,
        severity: query.severity,
        criticality: query.criticality,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/preferences/global')
  async getSchedule(@SubscriberSession() subscriberSession: SubscriberSession): Promise<InboxPreference> {
    const globalPreference = await this.getSubscriberGlobalPreference.execute(
      GetSubscriberGlobalPreferenceCommand.create({
        organizationId: subscriberSession._organizationId,
        environmentId: subscriberSession._environmentId,
        subscriberId: subscriberSession.subscriberId,
        contextKeys: subscriberSession.contextKeys,
        includeInactiveChannels: false,
        subscriber: subscriberSession,
      })
    );

    return {
      level: PreferenceLevelEnum.GLOBAL,
      ...globalPreference.preference,
    };
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Patch('/notifications/:id/read')
  async markNotificationAsRead(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Param('id') notificationId: string
  ): Promise<InboxNotificationDto> {
    return await this.markNotificationAsUsecase.execute(
      MarkNotificationAsCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        contextKeys: subscriberSession.contextKeys,
        notificationId,
        read: true,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Patch('/notifications/:id/unread')
  async markNotificationAsUnread(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Param('id') notificationId: string
  ): Promise<InboxNotificationDto> {
    return await this.markNotificationAsUsecase.execute(
      MarkNotificationAsCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        contextKeys: subscriberSession.contextKeys,
        notificationId,
        read: false,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Patch('/notifications/:id/archive')
  async markNotificationAsArchived(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Param('id') notificationId: string
  ): Promise<InboxNotificationDto> {
    return await this.markNotificationAsUsecase.execute(
      MarkNotificationAsCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        contextKeys: subscriberSession.contextKeys,
        notificationId,
        archived: true,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Patch('/notifications/:id/unarchive')
  async markNotificationAsUnarchived(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Param('id') notificationId: string
  ): Promise<InboxNotificationDto> {
    return await this.markNotificationAsUsecase.execute(
      MarkNotificationAsCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        contextKeys: subscriberSession.contextKeys,
        notificationId,
        archived: false,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Patch('/notifications/:id/snooze')
  async snoozeNotification(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Param('id') notificationId: string,
    @Body() body: SnoozeNotificationRequestDto
  ): Promise<InboxNotificationDto> {
    return await this.snoozeNotificationUsecase.execute(
      SnoozeNotificationCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        contextKeys: subscriberSession.contextKeys,
        notificationId,
        snoozeUntil: body.snoozeUntil,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Patch('/notifications/:id/unsnooze')
  async unsnoozeNotification(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Param('id') notificationId: string
  ): Promise<InboxNotificationDto> {
    return await this.unsnoozeNotificationUsecase.execute(
      UnsnoozeNotificationCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        contextKeys: subscriberSession.contextKeys,
        notificationId,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Delete('/notifications/:id/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Param('id') notificationId: string
  ): Promise<void> {
    await this.deleteNotificationUsecase.execute(
      DeleteNotificationCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        contextKeys: subscriberSession.contextKeys,
        notificationId,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Patch('/notifications/:id/complete')
  async completeAction(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Param('id') notificationId: string,
    @Body() body: ActionTypeRequestDto
  ): Promise<InboxNotificationDto> {
    return await this.updateNotificationActionUsecase.execute(
      UpdateNotificationActionCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        contextKeys: subscriberSession.contextKeys,
        notificationId,
        actionType: body.actionType,
        actionStatus: MessageActionStatusEnum.DONE,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Patch('/notifications/:id/revert')
  async revertAction(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Param('id') notificationId: string,
    @Body() body: ActionTypeRequestDto
  ): Promise<InboxNotificationDto> {
    return await this.updateNotificationActionUsecase.execute(
      UpdateNotificationActionCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        contextKeys: subscriberSession.contextKeys,
        notificationId,
        actionType: body.actionType,
        actionStatus: MessageActionStatusEnum.PENDING,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Patch('/preferences')
  async updateGlobalPreference(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Body() body: UpdatePreferencesRequestDto
  ): Promise<InboxPreference> {
    return await this.updatePreferencesUsecase.execute(
      UpdatePreferencesCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        contextKeys: subscriberSession.contextKeys,
        level: PreferenceLevelEnum.GLOBAL,
        chat: body.chat,
        email: body.email,
        in_app: body.in_app,
        push: body.push,
        sms: body.sms,
        schedule: body.schedule,
        includeInactiveChannels: false,
      })
    );
  }

  /**
   * IMPORTANT: Make sure this endpoint route is defined before the single workflow preference update endpoint
   * "PATCH /preferences/:workflowIdOrIdentifier", otherwise, the single workflow preference update endpoint will be triggered instead
   */
  @UseGuards(AuthGuard('subscriberJwt'))
  @Patch('/preferences/bulk')
  async bulkUpdateWorkflowPreferences(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Body() body: BulkUpdatePreferencesRequestDto
  ): Promise<InboxPreference[]> {
    return await this.bulkUpdatePreferencesUsecase.execute(
      BulkUpdatePreferencesCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        contextKeys: subscriberSession.contextKeys,
        preferences: body.preferences,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Patch('/preferences/:workflowIdOrIdentifier')
  async updateWorkflowPreference(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Param('workflowIdOrIdentifier') workflowIdOrIdentifier: string,
    @Body() body: UpdatePreferencesRequestDto
  ): Promise<InboxPreference> {
    return await this.updatePreferencesUsecase.execute(
      UpdatePreferencesCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        contextKeys: subscriberSession.contextKeys,
        level: PreferenceLevelEnum.TEMPLATE,
        all: {
          ...(body.enabled !== undefined && { enabled: body.enabled }),
          ...(body.condition !== undefined && { condition: body.condition }),
        },
        chat: body.chat,
        email: body.email,
        in_app: body.in_app,
        push: body.push,
        sms: body.sms,
        schedule: body.schedule,
        workflowIdOrIdentifier,
        includeInactiveChannels: false,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @UseInterceptors(ContextCompatibilityInterceptor)
  @Patch('/subscriptions/:subscriptionIdentifier/preferences/:workflowIdOrIdentifier')
  async updateSubscriptionWorkflowPreference(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Param('subscriptionIdentifier') subscriptionIdentifier: string,
    @Param('workflowIdOrIdentifier') workflowIdOrIdentifier: string,
    @Body() body: UpdatePreferencesRequestDto
  ): Promise<InboxPreference> {
    return await this.updatePreferencesUsecase.execute(
      UpdatePreferencesCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        contextKeys: subscriberSession.contextKeys,
        level: PreferenceLevelEnum.TEMPLATE,
        subscriptionIdentifier,
        all: {
          ...(body.enabled !== undefined && { enabled: body.enabled }),
          ...(body.condition !== undefined && { condition: body.condition }),
        },
        chat: body.chat,
        email: body.email,
        in_app: body.in_app,
        push: body.push,
        sms: body.sms,
        schedule: body.schedule,
        workflowIdOrIdentifier,
        includeInactiveChannels: false,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Post('/notifications/seen')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markNotificationsAsSeen(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Body() body: MarkNotificationsAsSeenRequestDto
  ): Promise<void> {
    await this.markNotificationsAsSeenUsecase.execute(
      MarkNotificationsAsSeenCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        contextKeys: subscriberSession.contextKeys,
        notificationIds: body.notificationIds,
        tags: body.tags,
        data: body.data,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Post('/notifications/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsRead(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Body() body: UpdateAllNotificationsRequestDto
  ): Promise<void> {
    await this.updateAllNotifications.execute(
      UpdateAllNotificationsCommand.create({
        environmentId: subscriberSession._environmentId,
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        contextKeys: subscriberSession.contextKeys,
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

  @UseGuards(AuthGuard('subscriberJwt'))
  @Post('/notifications/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsArchived(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Body() body: UpdateAllNotificationsRequestDto
  ): Promise<void> {
    await this.updateAllNotifications.execute(
      UpdateAllNotificationsCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        contextKeys: subscriberSession.contextKeys,
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

  @UseGuards(AuthGuard('subscriberJwt'))
  @Post('/notifications/read-archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsReadArchived(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Body() body: UpdateAllNotificationsRequestDto
  ): Promise<void> {
    await this.updateAllNotifications.execute(
      UpdateAllNotificationsCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        contextKeys: subscriberSession.contextKeys,
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

  @UseGuards(AuthGuard('subscriberJwt'))
  @Post('/notifications/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAllNotifications(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Body() body: UpdateAllNotificationsRequestDto
  ): Promise<void> {
    await this.deleteAllNotificationsUsecase.execute(
      DeleteAllNotificationsCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        contextKeys: subscriberSession.contextKeys,
        filters: {
          tags: body.tags,
          data: body.data,
        },
      })
    );
  }

  @KeylessAccessible()
  @UseGuards(AuthGuard('subscriberJwt'))
  @Post('/events')
  async keylessEvents(
    @UserSession() user: UserSessionData,
    @Body() body: TriggerEventRequestDto,
    @Req() req: RequestWithReqId
  ): Promise<TriggerEventResponseDto> {
    const result = await this.parseEventRequest.execute(
      ParseEventRequestMulticastCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier: body.name,
        payload: body.payload || {},
        overrides: body.overrides || {},
        to: body.to,
        actor: body.actor,
        tenant: body.tenant,
        context: body.context,
        transactionId: body.transactionId,
        addressingType: AddressingTypeEnum.MULTICAST,
        requestCategory: TriggerRequestCategoryEnum.SINGLE,
        bridgeUrl: body.bridgeUrl,
        controls: body.controls,
        requestId: req._nvRequestId,
      })
    );

    return result as unknown as TriggerEventResponseDto;
  }
}
