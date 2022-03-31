import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MessageEntity, SubscriberEntity } from '@novu/dal';
import { SessionInitializeBodyDto } from './dtos/session-initialize.dto';
import { InitializeSessionCommand } from './usecases/initialize-session/initialize-session.command';
import { InitializeSession } from './usecases/initialize-session/initialize-session.usecase';
import { GetNotificationsFeed } from './usecases/get-notifications-feed/get-notifications-feed.usecase';
import { GetNotificationsFeedCommand } from './usecases/get-notifications-feed/get-notifications-feed.command';
import { SubscriberSession } from '../shared/framework/user.decorator';
import { GetUnseenCount } from './usecases/get-unseen-count/get-unseen-count.usecase';
import { GetUnseenCountCommand } from './usecases/get-unseen-count/get-unseen-count.command';
import { MarkMessageAsSeenCommand } from './usecases/mark-message-as-seen/mark-message-as-seen.command';
import { MarkMessageAsSeen } from './usecases/mark-message-as-seen/mark-message-as-seen.usecase';
import { GetApplicationData } from './usecases/get-application-data/get-application-data.usecase';
import { GetApplicationDataCommand } from './usecases/get-application-data/get-application-data.command';
import { AnalyticsService } from '../shared/services/analytics/analytics.service';

@Controller('/widgets')
export class WidgetsController {
  constructor(
    private initializeSessionUsecase: InitializeSession,
    private getNotificationsFeedUsecase: GetNotificationsFeed,
    private genUnseenCountUsecase: GetUnseenCount,
    private markMessageAsSeenUsecase: MarkMessageAsSeen,
    private getApplicationUsecase: GetApplicationData,
    private analyticsService: AnalyticsService
  ) {}

  @Post('/session/initialize')
  async sessionInitialize(@Body() body: SessionInitializeBodyDto) {
    return await this.initializeSessionUsecase.execute(
      InitializeSessionCommand.create({
        subscriberId: body.$user_id,
        applicationIdentifier: body.applicationIdentifier,
        email: body.$email,
        firstName: body.$first_name,
        lastName: body.$last_name,
        phone: body.$phone,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/notifications/feed')
  async getNotificationsFeed(@SubscriberSession() subscriberSession: SubscriberEntity, @Query('page') page: number) {
    const command = GetNotificationsFeedCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession._id,
      applicationId: subscriberSession._applicationId,
      page,
    });

    return await this.getNotificationsFeedUsecase.execute(command);
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/notifications/unseen')
  async getUnseenCount(@SubscriberSession() subscriberSession: SubscriberEntity): Promise<{ count: number }> {
    const command = GetUnseenCountCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession._id,
      applicationId: subscriberSession._applicationId,
    });

    return await this.genUnseenCountUsecase.execute(command);
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Post('/messages/:messageId/seen')
  async markMessageAsSeen(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Param('messageId') messageId: string
  ): Promise<MessageEntity> {
    const command = MarkMessageAsSeenCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession._id,
      applicationId: subscriberSession._applicationId,
      messageId,
    });

    return await this.markMessageAsSeenUsecase.execute(command);
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/application')
  async getApplication(@SubscriberSession() subscriberSession: SubscriberEntity) {
    const command = GetApplicationDataCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession._id,
      applicationId: subscriberSession._applicationId,
    });

    return await this.getApplicationUsecase.execute(command);
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Post('/usage/log')
  async logUsage(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Body() body: { name: string; payload: any } // eslint-disable-line @typescript-eslint/no-explicit-any
  ) {
    this.analyticsService.track(body.name, subscriberSession._organizationId, {
      applicationId: subscriberSession._applicationId,
      ...(body.payload || {}),
    });

    return {
      success: true,
    };
  }
}
