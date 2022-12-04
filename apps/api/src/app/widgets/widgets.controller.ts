import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MessageEntity, SubscriberEntity } from '@novu/dal';
import { SessionInitializeRequestDto } from './dtos/session-initialize-request.dto';
import { InitializeSessionCommand } from './usecases/initialize-session/initialize-session.command';
import { InitializeSession } from './usecases/initialize-session/initialize-session.usecase';
import { GetNotificationsFeed } from './usecases/get-notifications-feed/get-notifications-feed.usecase';
import { GetNotificationsFeedCommand } from './usecases/get-notifications-feed/get-notifications-feed.command';
import { SubscriberSession } from '../shared/framework/user.decorator';
import { GetOrganizationData } from './usecases/get-organization-data/get-organization-data.usecase';
import { GetOrganizationDataCommand } from './usecases/get-organization-data/get-organization-data.command';
import { AnalyticsService } from '../shared/services/analytics/analytics.service';
import { ANALYTICS_SERVICE } from '../shared/shared.module';
import { ButtonTypeEnum, MessageActionStatusEnum } from '@novu/shared';
import { UpdateMessageActions } from './usecases/mark-action-as-done/update-message-actions.usecase';
import { UpdateMessageActionsCommand } from './usecases/mark-action-as-done/update-message-actions.command';
import { ApiExcludeController, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UpdateSubscriberPreferenceResponseDto } from './dtos/update-subscriber-preference-response.dto';
import { SessionInitializeResponseDto } from './dtos/session-initialize-response.dto';
import { UnseenCountResponse } from './dtos/unseen-count-response.dto';
import { LogUsageRequestDto } from './dtos/log-usage-request.dto';
import { LogUsageResponseDto } from './dtos/log-usage-response.dto';
import { OrganizationResponseDto } from './dtos/organization-response.dto';
import { GetSubscriberPreferenceCommand } from '../subscribers/usecases/get-subscriber-preference/get-subscriber-preference.command';
import { GetSubscriberPreference } from '../subscribers/usecases/get-subscriber-preference/get-subscriber-preference.usecase';
import {
  UpdateSubscriberPreference,
  UpdateSubscriberPreferenceCommand,
} from '../subscribers/usecases/update-subscriber-preference';
import { MarkAllMessageAsSeenCommand } from './usecases/mark-all-message-as-seen/mark-all-message-as-seen.command';
import { MarkAllMessageAsSeen } from './usecases/mark-all-message-as-seen/mark-all-message-as-seen.usecase';
import { UpdateSubscriberPreferenceRequestDto } from './dtos/update-subscriber-preference-request.dto';
import { MarkEnum, MarkMessageAsCommand } from './usecases/mark-message-as/mark-message-as.command';
import { MarkMessageAs } from './usecases/mark-message-as/mark-message-as.usecase';
import { StoreQuery } from './queries/store.query';
import { GetFeedCountCommand } from './usecases/get-feed-count/get-feed-count.command';
import { GetFeedCount } from './usecases/get-feed-count/get-feed-count.usecase';
import { GetCountQuery } from './queries/get-count.query';

@Controller('/widgets')
@ApiExcludeController()
export class WidgetsController {
  constructor(
    private initializeSessionUsecase: InitializeSession,
    private getNotificationsFeedUsecase: GetNotificationsFeed,
    private getFeedCountUsecase: GetFeedCount,
    private markMessageAsUsecase: MarkMessageAs,
    private markAllMessageAsSeenUseCase: MarkAllMessageAsSeen,
    private updateMessageActionsUsecase: UpdateMessageActions,
    private getOrganizationUsecase: GetOrganizationData,
    private getSubscriberPreferenceUsecase: GetSubscriberPreference,
    private updateSubscriberPreferenceUsecase: UpdateSubscriberPreference,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService
  ) {}

  @Post('/session/initialize')
  async sessionInitialize(@Body() body: SessionInitializeRequestDto): Promise<SessionInitializeResponseDto> {
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
  @ApiQuery({
    name: 'seen',
    type: Boolean,
    required: false,
  })
  async getNotificationsFeed(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Query('page') page: number,
    @Query('feedIdentifier') feedId: string[] | string,
    @Query() query: StoreQuery
  ) {
    const feedsQuery = this.toArray(feedId);

    const command = GetNotificationsFeedCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession.subscriberId,
      environmentId: subscriberSession._environmentId,
      page,
      feedId: feedsQuery,
      query,
    });

    return await this.getNotificationsFeedUsecase.execute(command);
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/notifications/unseen')
  async getUnseenCount(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Query('feedIdentifier') feedId: string[] | string,
    @Query('seen') seen: boolean
  ): Promise<UnseenCountResponse> {
    const feedsQuery = this.toArray(feedId);

    const command = GetFeedCountCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession.subscriberId,
      environmentId: subscriberSession._environmentId,
      feedId: feedsQuery,
      seen,
    });

    return await this.getFeedCountUsecase.execute(command);
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/notifications/count')
  async getCount(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Query() query: GetCountQuery
  ): Promise<UnseenCountResponse> {
    const feedsQuery = this.toArray(query.feedIdentifier);

    if (query.seen === undefined && query.read === undefined) {
      query.seen = true;
    }

    const command = GetFeedCountCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession.subscriberId,
      environmentId: subscriberSession._environmentId,
      feedId: feedsQuery,
      seen: query.seen,
      read: query.read,
    });

    return await this.getFeedCountUsecase.execute(command);
  }

  @ApiOperation({
    summary: 'Mark a subscriber feed message as seen',
    description: 'This endpoint is deprecated please address /messages/markAs instead',
    deprecated: true,
  })
  @UseGuards(AuthGuard('subscriberJwt'))
  @Post('/messages/:messageId/seen')
  async markMessageAsSeen(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Param('messageId') messageId: string
  ): Promise<MessageEntity> {
    const messageIds = this.toArray(messageId);

    const command = MarkMessageAsCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession.subscriberId,
      environmentId: subscriberSession._environmentId,
      messageIds,
      mark: { [MarkEnum.SEEN]: true },
    });

    return (await this.markMessageAsUsecase.execute(command))[0];
  }

  @ApiOperation({
    summary: 'Mark a subscriber feed message as read',
    description: 'This endpoint is deprecated please address /messages/markAs instead',
    deprecated: true,
  })
  @UseGuards(AuthGuard('subscriberJwt'))
  @Post('/messages/:messageId/read')
  async markMessageAsRead(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Param('messageId') messageId: string | string[]
  ): Promise<MessageEntity[]> {
    const messageIds = this.toArray(messageId);

    const command = MarkMessageAsCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession.subscriberId,
      environmentId: subscriberSession._environmentId,
      messageIds,
      mark: { [MarkEnum.READ]: true },
    });

    return await this.markMessageAsUsecase.execute(command);
  }

  @ApiOperation({
    summary: 'Mark a subscriber feed message or messages as seen or as read',
  })
  @UseGuards(AuthGuard('subscriberJwt'))
  @Post('/messages/markAs')
  async markMessageAs(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Body() body: { messageId: string | string[]; mark: { seen?: boolean; read?: boolean } }
  ): Promise<MessageEntity[]> {
    const messageIds = this.toArray(body.messageId);

    const command = MarkMessageAsCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession.subscriberId,
      environmentId: subscriberSession._environmentId,
      messageIds,
      mark: body.mark,
    });

    return await this.markMessageAsUsecase.execute(command);
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Post('/messages/seen')
  async markAllUnseenAsSeen(@SubscriberSession() subscriberSession: SubscriberEntity): Promise<number> {
    const command = MarkAllMessageAsSeenCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession._id,
      environmentId: subscriberSession._environmentId,
    });

    return await this.markAllMessageAsSeenUseCase.execute(command);
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
        subscriberId: subscriberSession.subscriberId,
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
  async getOrganizationData(
    @SubscriberSession() subscriberSession: SubscriberEntity
  ): Promise<OrganizationResponseDto> {
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
      subscriberId: subscriberSession.subscriberId,
      environmentId: subscriberSession._environmentId,
    });

    return await this.getSubscriberPreferenceUsecase.execute(command);
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Patch('/preferences/:templateId')
  async updateSubscriberPreference(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Param('templateId') templateId: string,
    @Body() body: UpdateSubscriberPreferenceRequestDto
  ): Promise<UpdateSubscriberPreferenceResponseDto> {
    const command = UpdateSubscriberPreferenceCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession.subscriberId,
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
    @Body() body: LogUsageRequestDto
  ): Promise<LogUsageResponseDto> {
    this.analyticsService.track(body.name, subscriberSession._organizationId, {
      environmentId: subscriberSession._environmentId,
      ...(body.payload || {}),
    });

    return {
      success: true,
    };
  }

  private toArray(param: string[] | string): string[] {
    let paramArray: string[];

    if (param) {
      paramArray = Array.isArray(param) ? param : param.split(',');
    }

    return paramArray;
  }
}

/*
 * ValidationPipe convert boolean undefined params default (false)
 * Therefore we need to get string and convert it to boolean
 */
export function initializeSeenParam(seen: string): boolean | null {
  let isSeen: boolean = null;

  if (seen) {
    isSeen = seen == 'true';
  }

  return isSeen;
}
