import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { SubscriberEntity } from '@novu/dal';

import { SubscriberSessionRequestDto } from './dtos/subscriber-session-request.dto';
import { SubscriberSessionResponseDto } from './dtos/subscriber-session-response.dto';
import { SessionCommand } from './usecases/session/session.command';
import { Session } from './usecases/session/session.usecase';
import { ApiCommonResponses } from '../shared/framework/response.decorator';
import { SubscriberSession } from '../shared/framework/user.decorator';
import { GetNotificationsRequestDto } from './dtos/get-notifications-request.dto';
import { GetNotifications } from './usecases/get-notifications/get-notifications.usecase';
import { GetNotificationsCommand } from './usecases/get-notifications/get-notifications.command';
import { GetNotificationsResponseDto } from './dtos/get-notifications-response.dto';
import { GetNotificationsCountRequestDto } from './dtos/get-notifications-count-request.dto';
import { GetNotificationsCountResponseDto } from './dtos/get-notifications-count-response.dto';
import { NotificationsCount } from './usecases/notifications-count/notifications-count.usecase';
import { NotificationsCountCommand } from './usecases/notifications-count/notifications-count.command';

@ApiCommonResponses()
@Controller('/inbox')
@ApiExcludeController()
export class InboxController {
  constructor(
    private initializeSessionUsecase: Session,
    private getNotificationsUsecase: GetNotifications,
    private notificationsCount: NotificationsCount
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
}
