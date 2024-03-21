import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiExcludeController, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService, GetSubscriberPreference, GetSubscriberPreferenceCommand } from '@novu/application-generic';
import { MessageEntity, PreferenceLevelEnum, SubscriberEntity } from '@novu/dal';
import { MarkMessagesAsEnum, ButtonTypeEnum, MessageActionStatusEnum } from '@novu/shared';

import { SubscriberSession } from '../shared/framework/user.decorator';
import {
  UpdateSubscriberPreference,
  UpdateSubscriberPreferenceCommand,
} from '../subscribers/usecases/update-subscriber-preference';
import { LogUsageRequestDto } from './dtos/log-usage-request.dto';
import { LogUsageResponseDto } from './dtos/log-usage-response.dto';
import { OrganizationResponseDto } from './dtos/organization-response.dto';
import { SessionInitializeRequestDto } from './dtos/session-initialize-request.dto';
import { SessionInitializeResponseDto } from './dtos/session-initialize-response.dto';
import { UnseenCountResponse } from './dtos/unseen-count-response.dto';
import { UpdateSubscriberPreferenceResponseDto } from './dtos/update-subscriber-preference-response.dto';
import { GetNotificationsFeedCommand } from './usecases/get-notifications-feed/get-notifications-feed.command';
import { GetNotificationsFeed } from './usecases/get-notifications-feed/get-notifications-feed.usecase';
import { GetOrganizationDataCommand } from './usecases/get-organization-data/get-organization-data.command';
import { GetOrganizationData } from './usecases/get-organization-data/get-organization-data.usecase';
import { InitializeSessionCommand } from './usecases/initialize-session/initialize-session.command';
import { InitializeSession } from './usecases/initialize-session/initialize-session.usecase';
import { UpdateMessageActionsCommand } from './usecases/mark-action-as-done/update-message-actions.command';
import { UpdateMessageActions } from './usecases/mark-action-as-done/update-message-actions.usecase';
import { UpdateSubscriberPreferenceRequestDto } from './dtos/update-subscriber-preference-request.dto';
import { GetFeedCountCommand } from './usecases/get-feed-count/get-feed-count.command';
import { GetFeedCount } from './usecases/get-feed-count/get-feed-count.usecase';
import { GetCountQuery } from './queries/get-count.query';
import { RemoveMessageCommand } from './usecases/remove-message/remove-message.command';
import { RemoveMessage } from './usecases/remove-message/remove-message.usecase';
import { MarkMessageAsCommand } from './usecases/mark-message-as/mark-message-as.command';
import { MarkMessageAs } from './usecases/mark-message-as/mark-message-as.usecase';
import { MarkAllMessagesAsCommand } from './usecases/mark-all-messages-as/mark-all-messages-as.command';
import { MarkAllMessagesAs } from './usecases/mark-all-messages-as/mark-all-messages-as.usecase';
import { GetNotificationsFeedDto } from './dtos/get-notifications-feed-request.dto';
import { LimitPipe } from './pipes/limit-pipe/limit-pipe';
import { RemoveAllMessagesCommand } from './usecases/remove-messages/remove-all-messages.command';
import { RemoveAllMessages } from './usecases/remove-messages/remove-all-messages.usecase';
import { RemoveAllMessagesDto } from './dtos/remove-all-messages.dto';
import {
  UpdateSubscriberGlobalPreferences,
  UpdateSubscriberGlobalPreferencesCommand,
} from '../subscribers/usecases/update-subscriber-global-preferences';
import { UpdateSubscriberGlobalPreferencesRequestDto } from '../subscribers/dtos/update-subscriber-global-preferences-request.dto';
import { GetPreferencesByLevel } from '../subscribers/usecases/get-preferences-by-level/get-preferences-by-level.usecase';
import { GetPreferencesByLevelCommand } from '../subscribers/usecases/get-preferences-by-level/get-preferences-by-level.command';
import { ApiCommonResponses, ApiNoContentResponse } from '../shared/framework/response.decorator';
import { RemoveMessagesBulkCommand } from './usecases/remove-messages-bulk/remove-messages-bulk.command';
import { RemoveMessagesBulk } from './usecases/remove-messages-bulk/remove-messages-bulk.usecase';
import { RemoveMessagesBulkRequestDto } from './dtos/remove-messages-bulk-request.dto';
import { MessageMarkAsRequestDto } from './dtos/mark-as-request.dto';
import { MarkMessageAsByMark } from './usecases/mark-message-as-by-mark/mark-message-as-by-mark.usecase';
import { MarkMessageAsByMarkCommand } from './usecases/mark-message-as-by-mark/mark-message-as-by-mark.command';

@ApiCommonResponses()
@Controller('/widgets')
@ApiExcludeController()
export class WidgetsController {
  constructor(
    private initializeSessionUsecase: InitializeSession,
    private getNotificationsFeedUsecase: GetNotificationsFeed,
    private getFeedCountUsecase: GetFeedCount,
    private markMessageAsUsecase: MarkMessageAs,
    private markMessageAsByMarkUsecase: MarkMessageAsByMark,
    private removeMessageUsecase: RemoveMessage,
    private removeAllMessagesUsecase: RemoveAllMessages,
    private removeMessagesBulkUsecase: RemoveMessagesBulk,
    private updateMessageActionsUsecase: UpdateMessageActions,
    private getOrganizationUsecase: GetOrganizationData,
    private getSubscriberPreferenceUsecase: GetSubscriberPreference,
    private getSubscriberPreferenceByLevelUsecase: GetPreferencesByLevel,
    private updateSubscriberPreferenceUsecase: UpdateSubscriberPreference,
    private updateSubscriberGlobalPreferenceUsecase: UpdateSubscriberGlobalPreferences,
    private markAllMessagesAsUsecase: MarkAllMessagesAs,
    private analyticsService: AnalyticsService
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
    @Query() query: GetNotificationsFeedDto
  ) {
    let feedsQuery: string[] | undefined;
    if (query.feedIdentifier) {
      feedsQuery = Array.isArray(query.feedIdentifier) ? query.feedIdentifier : [query.feedIdentifier];
    }

    const command = GetNotificationsFeedCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession.subscriberId,
      environmentId: subscriberSession._environmentId,
      page: query.page,
      feedId: feedsQuery,
      query: { seen: query.seen, read: query.read },
      limit: query.limit,
      payload: query.payload,
    });

    return await this.getNotificationsFeedUsecase.execute(command);
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/notifications/unseen')
  async getUnseenCount(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Query('feedIdentifier') feedId: string[] | string,
    @Query('seen') seen: boolean,
    @Query('limit', new DefaultValuePipe(100), new LimitPipe(1, 100, true)) limit: number
  ): Promise<UnseenCountResponse> {
    const feedsQuery = this.toArray(feedId);

    if (seen === undefined) {
      seen = false;
    }

    const command = GetFeedCountCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession.subscriberId,
      environmentId: subscriberSession._environmentId,
      feedId: feedsQuery,
      seen,
      limit,
    });

    return await this.getFeedCountUsecase.execute(command);
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/notifications/unread')
  async getUnreadCount(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Query('feedIdentifier') feedId: string[] | string,
    @Query('read') read: boolean,
    @Query('limit', new DefaultValuePipe(100), new LimitPipe(1, 100, true)) limit: number
  ): Promise<UnseenCountResponse> {
    const feedsQuery = this.toArray(feedId);

    if (read === undefined) {
      read = false;
    }

    const command = GetFeedCountCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession.subscriberId,
      environmentId: subscriberSession._environmentId,
      feedId: feedsQuery,
      read,
      limit,
    });

    return await this.getFeedCountUsecase.execute(command);
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/notifications/count')
  async getCount(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Query() query: GetCountQuery,
    @Query('limit', new DefaultValuePipe(100), new LimitPipe(1, 100, true)) limit: number
  ): Promise<UnseenCountResponse> {
    const feedsQuery = this.toArray(query.feedIdentifier);

    if (query.seen === undefined && query.read === undefined) {
      query.seen = false;
    }

    const command = GetFeedCountCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession.subscriberId,
      environmentId: subscriberSession._environmentId,
      feedId: feedsQuery,
      seen: query.seen,
      read: query.read,
      limit: limit,
    });

    return await this.getFeedCountUsecase.execute(command);
  }

  @ApiOperation({
    summary: 'Mark a subscriber feed messages as seen or as read',
    description: `Introducing '/messages/mark-as endpoint for consistent read and seen message handling,
     deprecating old legacy endpoint.`,
    deprecated: true,
  })
  @UseGuards(AuthGuard('subscriberJwt'))
  @Post('/messages/markAs')
  async markMessageAs(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Body() body: { messageId: string | string[]; mark: { seen?: boolean; read?: boolean } }
  ): Promise<MessageEntity[]> {
    const messageIds = this.toArray(body.messageId);
    if (!messageIds) throw new BadRequestException('messageId is required');

    const command = MarkMessageAsCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession.subscriberId,
      environmentId: subscriberSession._environmentId,
      messageIds,
      mark: body.mark,
    });

    return await this.markMessageAsUsecase.execute(command);
  }

  @ApiOperation({
    summary: 'Mark a subscriber messages as seen, read, unseen or unread',
  })
  @UseGuards(AuthGuard('subscriberJwt'))
  @Post('/messages/mark-as')
  async markMessagesAs(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Body() body: MessageMarkAsRequestDto
  ): Promise<MessageEntity[]> {
    const messageIds = this.toArray(body.messageId);
    if (!messageIds || messageIds.length === 0) throw new BadRequestException('messageId is required');

    return await this.markMessageAsByMarkUsecase.execute(
      MarkMessageAsByMarkCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        messageIds,
        markAs: body.markAs,
        __source: 'notification_center',
      })
    );
  }

  @ApiOperation({
    summary: 'Remove a subscriber feed message',
  })
  @UseGuards(AuthGuard('subscriberJwt'))
  @Delete('/messages/:messageId')
  async removeMessage(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Param('messageId') messageId: string
  ): Promise<MessageEntity> {
    if (!messageId) throw new BadRequestException('messageId is required');

    const command = RemoveMessageCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession.subscriberId,
      environmentId: subscriberSession._environmentId,
      messageId: messageId,
    });

    return await this.removeMessageUsecase.execute(command);
  }

  @ApiOperation({
    summary: `Remove a subscriber's feed messages`,
  })
  @UseGuards(AuthGuard('subscriberJwt'))
  @Delete('/messages')
  @ApiNoContentResponse({ description: 'Messages removed' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAllMessages(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Query() query: RemoveAllMessagesDto
  ): Promise<void> {
    const command = RemoveAllMessagesCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession.subscriberId,
      environmentId: subscriberSession._environmentId,
      feedId: query.feedId,
    });

    await this.removeAllMessagesUsecase.execute(command);
  }

  @ApiOperation({
    summary: 'Remove subscriber messages in bulk',
  })
  @UseGuards(AuthGuard('subscriberJwt'))
  @Post('/messages/bulk/delete')
  @HttpCode(HttpStatus.OK)
  async removeMessagesBulk(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Body() body: RemoveMessagesBulkRequestDto
  ) {
    return await this.removeMessagesBulkUsecase.execute(
      RemoveMessagesBulkCommand.create({
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        environmentId: subscriberSession._environmentId,
        messageIds: body.messageIds,
      })
    );
  }

  @ApiOperation({
    summary: "Mark subscriber's all unread messages as read",
  })
  @UseGuards(AuthGuard('subscriberJwt'))
  @Post('/messages/read')
  async markAllUnreadAsRead(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Body() body: { feedId?: string | string[] }
  ) {
    const feedIds = this.toArray(body.feedId);
    const command = MarkAllMessagesAsCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession.subscriberId,
      environmentId: subscriberSession._environmentId,
      markAs: MarkMessagesAsEnum.READ,
      feedIdentifiers: feedIds,
    });

    return await this.markAllMessagesAsUsecase.execute(command);
  }

  @ApiOperation({
    summary: "Mark subscriber's all unseen messages as seen",
  })
  @UseGuards(AuthGuard('subscriberJwt'))
  @Post('/messages/seen')
  async markAllUnseenAsSeen(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Body() body: { feedId?: string | string[] }
  ): Promise<number> {
    const feedIds = this.toArray(body.feedId);
    const command = MarkAllMessagesAsCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession.subscriberId,
      environmentId: subscriberSession._environmentId,
      markAs: MarkMessagesAsEnum.SEEN,
      feedIdentifiers: feedIds,
    });

    return await this.markAllMessagesAsUsecase.execute(command);
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
  @Get('/preferences/:level')
  async getSubscriberPreferenceByLevel(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Param('level') level: PreferenceLevelEnum
  ) {
    const command = GetPreferencesByLevelCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession.subscriberId,
      environmentId: subscriberSession._environmentId,
      level,
    });

    return await this.getSubscriberPreferenceByLevelUsecase.execute(command);
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
  @Patch('/preferences')
  async updateSubscriberGlobalPreference(
    @SubscriberSession() subscriberSession: SubscriberEntity,
    @Body() body: UpdateSubscriberGlobalPreferencesRequestDto
  ) {
    const command = UpdateSubscriberGlobalPreferencesCommand.create({
      organizationId: subscriberSession._organizationId,
      subscriberId: subscriberSession.subscriberId,
      environmentId: subscriberSession._environmentId,
      preferences: body.preferences,
      enabled: body.enabled,
    });

    return await this.updateSubscriberGlobalPreferenceUsecase.execute(command);
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

  private toArray(param: string[] | string | undefined): string[] | undefined {
    let paramArray: string[] | undefined = undefined;

    if (param) {
      paramArray = Array.isArray(param) ? param : String(param).split(',');
    }

    return paramArray as string[];
  }
}
