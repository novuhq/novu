import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
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
import { GetOrganizationData } from './usecases/get-organization-data/get-organization-data.usecase';
import { GetOrganizationDataCommand } from './usecases/get-organization-data/get-organization-data.command';
import { AnalyticsService } from '../shared/services/analytics/analytics.service';
import { ANALYTICS_SERVICE } from '../shared/shared.module';
import { ButtonTypeEnum } from '@novu/shared';
import { MarkActionAsDone } from './usecases/mark-action-as-done/mark-action-as-done.usecause';
import { MarkActionAsDoneCommand } from './usecases/mark-action-as-done/mark-action-as-done.command';

@Controller('/widgets')
export class WidgetsController {
  constructor(
    private initializeSessionUsecase: InitializeSession,
    private getNotificationsFeedUsecase: GetNotificationsFeed,
    private genUnseenCountUsecase: GetUnseenCount,
    private markMessageAsSeenUsecase: MarkMessageAsSeen,
    private markActionAsDoneUsecase: MarkActionAsDone,
    private getOrganizationUsecase: GetOrganizationData,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService
  ) {}

  @Post('/session/initialize')
  async sessionInitialize(@Body() body: SessionInitializeBodyDto) {
    return await this.initializeSessionUsecase.execute(
      InitializeSessionCommand.create({
        subscriberId: body.subscriberId,
        applicationIdentifier: body.applicationIdentifier,
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        hmacHash: body.hmacHash,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/notifications/feed')
  async getNotificationsFeed(@SubscriberSession() subscriberSession: SubscriberEntity, @Query('page') page: number) {
    const command = GetNotificationsFeedCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession._id,
      environmentId: subscriberSession._environmentId,
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
      environmentId: subscriberSession._environmentId,
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
      environmentId: subscriberSession._environmentId,
      messageId,
    });

    return await this.markMessageAsSeenUsecase.execute(command);
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Post('/messages/:messageId/actiondone')
  async markActionAsSeen(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Param('messageId') messageId: string,
    @Body() body: { executedType: ButtonTypeEnum } // eslint-disable-line @typescript-eslint/no-explicit-any
  ): Promise<MessageEntity> {
    return await this.markActionAsDoneUsecase.execute(
      MarkActionAsDoneCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession._id,
        environmentId: subscriberSession._environmentId,
        messageId,
        executedType: body.executedType,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/organization')
  async GetOrganizationData(@SubscriberSession() subscriberSession: SubscriberEntity) {
    const command = GetOrganizationDataCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession._id,
      environmentId: subscriberSession._environmentId,
    });

    return await this.getOrganizationUsecase.execute(command);
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Post('/usage/log')
  async logUsage(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Body() body: { name: string; payload: any } // eslint-disable-line @typescript-eslint/no-explicit-any
  ) {
    this.analyticsService.track(body.name, subscriberSession._organizationId, {
      environmentId: subscriberSession._environmentId,
      ...(body.payload || {}),
    });

    return {
      success: true,
    };
  }
}
