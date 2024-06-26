import { Body, Controller, Get, Post, Patch, Query, UseGuards, Param } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { SubscriberEntity } from '@novu/dal';

import type { SubscriberSessionRequestDto } from './dtos/subscriber-session-request.dto';
import type { SubscriberSessionResponseDto } from './dtos/subscriber-session-response.dto';
import { SessionCommand } from './usecases/session/session.command';
import type { Session } from './usecases/session/session.usecase';
import { ApiCommonResponses } from '../shared/framework/response.decorator';
import { SubscriberSession } from '../shared/framework/user.decorator';
import type { GetNotificationsRequestDto } from './dtos/get-notifications-request.dto';
import type { GetNotifications } from './usecases/get-notifications/get-notifications.usecase';
import { GetNotificationsCommand } from './usecases/get-notifications/get-notifications.command';
import type { GetNotificationsResponseDto } from './dtos/get-notifications-response.dto';
import type { GetNotificationsCountRequestDto } from './dtos/get-notifications-count-request.dto';
import type { GetNotificationsCountResponseDto } from './dtos/get-notifications-count-response.dto';
import type { NotificationsCount } from './usecases/notifications-count/notifications-count.usecase';
import { NotificationsCountCommand } from './usecases/notifications-count/notifications-count.command';
import type { UpdateNotificationRequestDto } from './dtos/update-notification-request.dto';
import type { InboxNotification } from './utils/types';
import { UpdateNotificationCommand } from './usecases/update-notification/update-notification.command';
import type { UpdateNotification } from './usecases/update-notification/update-notification.usecase';

@ApiCommonResponses()
@Controller('/inbox')
@ApiExcludeController()
export class InboxController {
  constructor(
    private initializeSessionUsecase: Session,
    private getNotificationsUsecase: GetNotifications,
    private notificationsCount: NotificationsCount,
    private updateNotificationUsecase: UpdateNotification
  ) {}

  @Post('/session')
  async sessionInitialize(@Body() body: SubscriberSessionRequestDto): Promise<SubscriberSessionResponseDto> {
    return await this.initializeSessionUsecase.execute(
      SessionCommand.create({
        subscriberId: body.subscriberId,
        applicationIdentifier: body.applicationIdentifier,
        subscriberHash: body.subscriberHash,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/notifications')
  async getNotifications(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Query()
    query: GetNotificationsRequestDto
  ): Promise<GetNotificationsResponseDto> {
    return await this.getNotificationsUsecase.execute(
      GetNotificationsCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        limit: query.limit,
        offset: query.offset,
        after: query.after,
        tags: query.tags,
        read: query.read,
        archived: query.archived,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/notifications/count')
  async getNotificationsCount(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Query()
    query: GetNotificationsCountRequestDto
  ): Promise<GetNotificationsCountResponseDto> {
    const res = await this.notificationsCount.execute(
      NotificationsCountCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        tags: query.tags,
        read: query.read,
        archived: query.archived,
      })
    );

    return res;
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Patch('/notifications/:id')
  async updateNotification(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Param('id') notificationId: string,
    @Body() body: UpdateNotificationRequestDto
  ): Promise<InboxNotification> {
    return await this.updateNotificationUsecase.execute(
      UpdateNotificationCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        notificationId,
        ...body,
      })
    );
  }
}
