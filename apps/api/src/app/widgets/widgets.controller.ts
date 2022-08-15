import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
import { ButtonTypeEnum, MessageActionStatusEnum } from '@novu/shared';
import { UpdateMessageActions } from './usecases/mark-action-as-done/update-message-actions.usecause';
import { UpdateMessageActionsCommand } from './usecases/mark-action-as-done/update-message-actions.command';
import { GetSubscriberPreference } from '../subscribers/usecases/get-subscriber-preference/get-subscriber-preference.usecase';
import { GetSubscriberPreferenceCommand } from '../subscribers/usecases/get-subscriber-preference/get-subscriber-preference.command';
import {
  UpdateSubscriberPreferenceCommand,
  UpdateSubscriberPreference,
} from '../subscribers/usecases/update-subscriber-preference';
import { UpdateSubscriberPreferenceDto } from './dtos/update-subscriber-preference.dto';

@Controller('/widgets')
export class WidgetsController {
  constructor(
    private initializeSessionUsecase: InitializeSession,
    private getNotificationsFeedUsecase: GetNotificationsFeed,
    private genUnseenCountUsecase: GetUnseenCount,
    private markMessageAsSeenUsecase: MarkMessageAsSeen,
    private updateMessageActionsUsecase: UpdateMessageActions,
    private getOrganizationUsecase: GetOrganizationData,
    private getSubscriberPreferenceUsecase: GetSubscriberPreference,
    private updateSubscriberPreferenceUsecase: UpdateSubscriberPreference,
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
  async getNotificationsFeed(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Query('page') page: number,
    @Query('feedIdentifier') feedId: string[] | string,
    @Query('seen') seen = undefined
  ) {
    let feedsQuery: string[];
    if (feedId) {
      feedsQuery = Array.isArray(feedId) ? feedId : [feedId];
    }

    const command = GetNotificationsFeedCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession._id,
      environmentId: subscriberSession._environmentId,
      page,
      feedId: feedsQuery,
      seen,
    });

    return await this.getNotificationsFeedUsecase.execute(command);
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/notifications/unseen')
  async getUnseenCount(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Query('feedIdentifier') feedId: string[] | string,
    @Query('seen') seen: boolean
  ): Promise<{ count: number }> {
    let feedsQuery: string[];
    if (feedId) {
      feedsQuery = Array.isArray(feedId) ? feedId : [feedId];
    }

    const command = GetUnseenCountCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession._id,
      environmentId: subscriberSession._environmentId,
      feedId: feedsQuery,
      seen,
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
  @Post('/messages/:messageId/actions/:type')
  async markActionAsSeen(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Param('messageId') messageId: string,
    @Param('type') type: ButtonTypeEnum,
    @Body() body: { payload: any; status: MessageActionStatusEnum } // eslint-disable-line @typescript-eslint/no-explicit-any
  ): Promise<MessageEntity> {
    return await this.updateMessageActionsUsecase.execute(
      UpdateMessageActionsCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession._id,
        environmentId: subscriberSession._environmentId,
        messageId,
        type,
        payload: body.payload,
        status: body.status,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/organization')
  async getOrganizationData(@SubscriberSession() subscriberSession: SubscriberEntity) {
    const command = GetOrganizationDataCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession._id,
      environmentId: subscriberSession._environmentId,
    });

    return await this.getOrganizationUsecase.execute(command);
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/preferences')
  async getSubscriberPreference(@SubscriberSession() subscriberSession: SubscriberEntity) {
    const command = GetSubscriberPreferenceCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession._id,
      environmentId: subscriberSession._environmentId,
    });

    return await this.getSubscriberPreferenceUsecase.execute(command);
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Patch('/preferences/:templateId')
  async updateSubscriberPreference(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Param('templateId') templateId: string,
    @Body() body: UpdateSubscriberPreferenceDto
  ) {
    const command = UpdateSubscriberPreferenceCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession._id,
      environmentId: subscriberSession._environmentId,
      templateId: templateId,
      channel: body.channel,
      enabled: body.enabled,
    });

    return await this.updateSubscriberPreferenceUsecase.execute(command);
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
