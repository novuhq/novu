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
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  CreateSubscriber,
  CreateSubscriberCommand,
  UpdateSubscriber,
  UpdateSubscriberCommand,
} from '@novu/application-generic';
import { ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
import {
  ApiRateLimitCategoryEnum,
  ApiRateLimitCostEnum,
  ButtonTypeEnum,
  ChatProviderIdEnum,
  IJwtPayload,
} from '@novu/shared';
import { MessageEntity, PreferenceLevelEnum } from '@novu/dal';

import { RemoveSubscriber, RemoveSubscriberCommand } from './usecases/remove-subscriber';
import { UserAuthGuard } from '../auth/framework/user.auth.guard';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import {
  BulkSubscriberCreateDto,
  CreateSubscriberRequestDto,
  DeleteSubscriberResponseDto,
  GetSubscriberPreferencesResponseDto,
  SubscriberResponseDto,
  UpdateSubscriberChannelRequestDto,
  UpdateSubscriberGlobalPreferencesRequestDto,
  UpdateSubscriberRequestDto,
} from './dtos';
import { UpdateSubscriberChannel, UpdateSubscriberChannelCommand } from './usecases/update-subscriber-channel';
import { GetSubscribers, GetSubscribersCommand } from './usecases/get-subscribers';
import { GetSubscriber, GetSubscriberCommand } from './usecases/get-subscriber';
import { GetPreferencesByLevelCommand } from './usecases/get-preferences-by-level/get-preferences-by-level.command';
import { GetPreferencesByLevel } from './usecases/get-preferences-by-level/get-preferences-by-level.usecase';
import { UpdatePreference } from './usecases/update-preference/update-preference.usecase';
import { UpdateSubscriberPreferenceCommand } from './usecases/update-subscriber-preference';
import { UpdateSubscriberPreferenceResponseDto } from '../widgets/dtos/update-subscriber-preference-response.dto';
import { UpdateSubscriberPreferenceRequestDto } from '../widgets/dtos/update-subscriber-preference-request.dto';
import { MessageResponseDto } from '../widgets/dtos/message-response.dto';
import { UnseenCountResponse } from '../widgets/dtos/unseen-count-response.dto';
import { MarkMessageAsCommand } from '../widgets/usecases/mark-message-as/mark-message-as.command';
import { UpdateMessageActionsCommand } from '../widgets/usecases/mark-action-as-done/update-message-actions.command';
import { GetNotificationsFeedCommand } from '../widgets/usecases/get-notifications-feed/get-notifications-feed.command';
import { GetNotificationsFeed } from '../widgets/usecases/get-notifications-feed/get-notifications-feed.usecase';
import { MarkMessageAs } from '../widgets/usecases/mark-message-as/mark-message-as.usecase';
import { UpdateMessageActions } from '../widgets/usecases/mark-action-as-done/update-message-actions.usecase';
import { GetFeedCount } from '../widgets/usecases/get-feed-count/get-feed-count.usecase';
import { GetFeedCountCommand } from '../widgets/usecases/get-feed-count/get-feed-count.command';
import { UpdateSubscriberOnlineFlagRequestDto } from './dtos/update-subscriber-online-flag-request.dto';
import {
  UpdateSubscriberOnlineFlag,
  UpdateSubscriberOnlineFlagCommand,
} from './usecases/update-subscriber-online-flag';
import { MarkMessageAsRequestDto } from '../widgets/dtos/mark-message-as-request.dto';
import { MarkMessageActionAsSeenDto } from '../widgets/dtos/mark-message-action-as-seen.dto';
import { ApiOkPaginatedResponse } from '../shared/framework/paginated-ok-response.decorator';
import { PaginatedResponseDto } from '../shared/dtos/pagination-response';
import { GetSubscribersDto } from './dtos/get-subscribers.dto';
import { GetInAppNotificationsFeedForSubscriberDto } from './dtos/get-in-app-notification-feed-for-subscriber.dto';
import { ApiCommonResponses, ApiResponse, ApiNoContentResponse } from '../shared/framework/response.decorator';
import { ChatOauthCallbackRequestDto, ChatOauthRequestDto } from './dtos/chat-oauth-request.dto';
import { OAuthHandlerEnum } from './types';
import { ChatOauthCallback } from './usecases/chat-oauth-callback/chat-oauth-callback.usecase';
import { ChatOauthCallbackCommand } from './usecases/chat-oauth-callback/chat-oauth-callback.command';
import { ChatOauth } from './usecases/chat-oauth/chat-oauth.usecase';
import { ChatOauthCommand } from './usecases/chat-oauth/chat-oauth.command';
import {
  DeleteSubscriberCredentialsCommand,
  DeleteSubscriberCredentials,
} from './usecases/delete-subscriber-credentials';
import { MarkAllMessagesAsCommand } from '../widgets/usecases/mark-all-messages-as/mark-all-messages-as.command';
import { MarkAllMessagesAs } from '../widgets/usecases/mark-all-messages-as/mark-all-messages-as.usecase';
import { MarkAllMessageAsRequestDto } from './dtos/mark-all-messages-as-request.dto';
import { BulkCreateSubscribers } from './usecases/bulk-create-subscribers/bulk-create-subscribers.usecase';
import { BulkCreateSubscribersCommand } from './usecases/bulk-create-subscribers';
import {
  UpdateSubscriberGlobalPreferences,
  UpdateSubscriberGlobalPreferencesCommand,
} from './usecases/update-subscriber-global-preferences';
import { GetSubscriberPreferencesByLevelParams } from './params';
import { ThrottlerCategory, ThrottlerCost } from '../rate-limiting/guards';
import { MessageMarkAsRequestDto } from '../widgets/dtos/mark-as-request.dto';
import { MarkMessageAsByMarkCommand } from '../widgets/usecases/mark-message-as-by-mark/mark-message-as-by-mark.command';
import { MarkMessageAsByMark } from '../widgets/usecases/mark-message-as-by-mark/mark-message-as-by-mark.usecase';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/subscribers')
@ApiTags('Subscribers')
export class SubscribersController {
  constructor(
    private createSubscriberUsecase: CreateSubscriber,
    private bulkCreateSubscribersUsecase: BulkCreateSubscribers,
    private updateSubscriberUsecase: UpdateSubscriber,
    private updateSubscriberChannelUsecase: UpdateSubscriberChannel,
    private removeSubscriberUsecase: RemoveSubscriber,
    private getSubscriberUseCase: GetSubscriber,
    private getSubscribersUsecase: GetSubscribers,
    private getPreferenceUsecase: GetPreferencesByLevel,
    private updatePreferenceUsecase: UpdatePreference,
    private updateGlobalPreferenceUsecase: UpdateSubscriberGlobalPreferences,
    private getNotificationsFeedUsecase: GetNotificationsFeed,
    private getFeedCountUsecase: GetFeedCount,
    private markMessageAsUsecase: MarkMessageAs,
    private markMessageAsByMarkUsecase: MarkMessageAsByMark,
    private updateMessageActionsUsecase: UpdateMessageActions,
    private updateSubscriberOnlineFlagUsecase: UpdateSubscriberOnlineFlag,
    private chatOauthCallbackUsecase: ChatOauthCallback,
    private chatOauthUsecase: ChatOauth,
    private deleteSubscriberCredentialsUsecase: DeleteSubscriberCredentials,
    private markAllMessagesAsUsecase: MarkAllMessagesAs
  ) {}

  @Get('')
  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  @ApiOkPaginatedResponse(SubscriberResponseDto)
  @ApiOperation({
    summary: 'Get subscribers',
    description: 'Returns a list of subscribers, could paginated using the `page` and `limit` query parameter',
  })
  async getSubscribers(
    @UserSession() user: IJwtPayload,
    @Query() query: GetSubscribersDto
  ): Promise<PaginatedResponseDto<SubscriberResponseDto>> {
    return await this.getSubscribersUsecase.execute(
      GetSubscribersCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        page: query.page,
        limit: query.limit,
      })
    );
  }

  @Get('/:subscriberId')
  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  @ApiResponse(SubscriberResponseDto)
  @ApiOperation({
    summary: 'Get subscriber',
    description: 'Get subscriber by your internal id used to identify the subscriber',
  })
  async getSubscriber(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string
  ): Promise<SubscriberResponseDto> {
    return await this.getSubscriberUseCase.execute(
      GetSubscriberCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
      })
    );
  }

  @Post('/')
  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  @ApiResponse(SubscriberResponseDto, 201)
  @ApiOperation({
    summary: 'Create subscriber',
    description:
      'Creates a subscriber entity, in the Novu platform. ' +
      'The subscriber will be later used to receive notifications, and access notification feeds. ' +
      'Communication credentials such as email, phone number, and 3 rd party credentials i.e slack tokens could be later associated to this entity.',
  })
  async createSubscriber(
    @UserSession() user: IJwtPayload,
    @Body() body: CreateSubscriberRequestDto
  ): Promise<SubscriberResponseDto> {
    return await this.createSubscriberUsecase.execute(
      CreateSubscriberCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId: body.subscriberId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        avatar: body.avatar,
        locale: body.locale,
        data: body.data,
      })
    );
  }

  @ThrottlerCost(ApiRateLimitCostEnum.BULK)
  @Post('/bulk')
  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  @ApiOperation({
    summary: 'Bulk create subscribers',
    description: `
      Using this endpoint you can create multiple subscribers at once, to avoid multiple calls to the API.
      The bulk API is limited to 500 subscribers per request.
    `,
  })
  async bulkCreateSubscribers(@UserSession() user: IJwtPayload, @Body() body: BulkSubscriberCreateDto) {
    return await this.bulkCreateSubscribersUsecase.execute(
      BulkCreateSubscribersCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscribers: body.subscribers,
      })
    );
  }

  @Put('/:subscriberId')
  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  @ApiResponse(SubscriberResponseDto)
  @ApiOperation({
    summary: 'Update subscriber',
    description: 'Used to update the subscriber entity with new information',
  })
  async updateSubscriber(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string,
    @Body() body: UpdateSubscriberRequestDto
  ): Promise<SubscriberResponseDto> {
    return await this.updateSubscriberUsecase.execute(
      UpdateSubscriberCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        avatar: body.avatar,
        locale: body.locale,
        data: body.data,
      })
    );
  }

  @Put('/:subscriberId/credentials')
  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  @ApiResponse(SubscriberResponseDto)
  @ApiOperation({
    summary: 'Update subscriber credentials',
    description: 'Subscriber credentials associated to the delivery methods such as slack and push tokens.',
  })
  async updateSubscriberChannel(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string,
    @Body() body: UpdateSubscriberChannelRequestDto
  ): Promise<SubscriberResponseDto> {
    return await this.updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        providerId: body.providerId,
        credentials: body.credentials,
        integrationIdentifier: body.integrationIdentifier,
        oauthHandler: OAuthHandlerEnum.EXTERNAL,
        isIdempotentOperation: true,
      })
    );
  }

  @Patch('/:subscriberId/credentials')
  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  @ApiResponse(SubscriberResponseDto)
  @ApiOperation({
    summary: 'Modify subscriber credentials',
    description: `Subscriber credentials associated to the delivery methods such as slack and push tokens.
    This endpoint appends provided credentials and deviceTokens to the existing ones.`,
  })
  async modifySubscriberChannel(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string,
    @Body() body: UpdateSubscriberChannelRequestDto
  ): Promise<SubscriberResponseDto> {
    return await this.updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        providerId: body.providerId,
        credentials: body.credentials,
        integrationIdentifier: body.integrationIdentifier,
        oauthHandler: OAuthHandlerEnum.EXTERNAL,
        isIdempotentOperation: false,
      })
    );
  }

  @Delete('/:subscriberId/credentials/:providerId')
  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete subscriber credentials by providerId',
    description: 'Delete subscriber credentials such as slack and expo tokens.',
  })
  async deleteSubscriberCredentials(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string,
    @Param('providerId') providerId: string
  ): Promise<void> {
    return await this.deleteSubscriberCredentialsUsecase.execute(
      DeleteSubscriberCredentialsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        providerId,
      })
    );
  }

  @Patch('/:subscriberId/online-status')
  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  @ApiResponse(SubscriberResponseDto)
  @ApiOperation({
    summary: 'Update subscriber online status',
    description: 'Used to update the subscriber isOnline flag.',
  })
  async updateSubscriberOnlineFlag(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string,
    @Body() body: UpdateSubscriberOnlineFlagRequestDto
  ): Promise<SubscriberResponseDto> {
    return await this.updateSubscriberOnlineFlagUsecase.execute(
      UpdateSubscriberOnlineFlagCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        isOnline: body.isOnline,
      })
    );
  }

  @Delete('/:subscriberId')
  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  @ApiResponse(DeleteSubscriberResponseDto)
  @ApiOperation({
    summary: 'Delete subscriber',
    description: 'Deletes a subscriber entity from the Novu platform',
  })
  async removeSubscriber(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string
  ): Promise<DeleteSubscriberResponseDto> {
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
  @UseGuards(UserAuthGuard)
  @ApiResponse(UpdateSubscriberPreferenceResponseDto, 200, true)
  @ApiOperation({
    summary: 'Get subscriber preferences',
  })
  async getSubscriberPreference(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string
  ): Promise<UpdateSubscriberPreferenceResponseDto[]> {
    const command = GetPreferencesByLevelCommand.create({
      organizationId: user.organizationId,
      subscriberId: subscriberId,
      environmentId: user.environmentId,
      level: PreferenceLevelEnum.TEMPLATE,
    });

    return (await this.getPreferenceUsecase.execute(command)) as UpdateSubscriberPreferenceResponseDto[];
  }

  @Get('/:subscriberId/preferences/:level')
  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  @ApiResponse(GetSubscriberPreferencesResponseDto, 200, true)
  @ApiOperation({
    summary: 'Get subscriber preferences by level',
  })
  @ApiParam({ name: 'subscriberId', type: String, required: true })
  @ApiParam({ name: 'level', type: String, required: true })
  async getSubscriberPreferenceByLevel(
    @UserSession() user: IJwtPayload,
    @Param() { level, subscriberId }: GetSubscriberPreferencesByLevelParams
  ): Promise<GetSubscriberPreferencesResponseDto[]> {
    const command = GetPreferencesByLevelCommand.create({
      organizationId: user.organizationId,
      subscriberId: subscriberId,
      environmentId: user.environmentId,
      level: level,
    });

    return await this.getPreferenceUsecase.execute(command);
  }

  @Patch('/:subscriberId/preferences/:templateId')
  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  @ApiResponse(UpdateSubscriberPreferenceResponseDto)
  @ApiOperation({
    summary: 'Update subscriber preference',
  })
  async updateSubscriberPreference(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string,
    @Param('templateId') templateId: string,
    @Body() body: UpdateSubscriberPreferenceRequestDto
  ): Promise<UpdateSubscriberPreferenceResponseDto> {
    const command = UpdateSubscriberPreferenceCommand.create({
      organizationId: user.organizationId,
      subscriberId: subscriberId,
      environmentId: user.environmentId,
      templateId: templateId,
      ...(typeof body.enabled === 'boolean' && { enabled: body.enabled }),
      ...(body.channel && { channel: body.channel }),
    });

    return await this.updatePreferenceUsecase.execute(command);
  }

  @Patch('/:subscriberId/preferences')
  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  @ApiResponse(UpdateSubscriberPreferenceResponseDto)
  @ApiOperation({
    summary: 'Update subscriber global preferences',
  })
  async updateSubscriberGlobalPreferences(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string,
    @Body() body: UpdateSubscriberGlobalPreferencesRequestDto
  ) {
    const command = UpdateSubscriberGlobalPreferencesCommand.create({
      organizationId: user.organizationId,
      subscriberId: subscriberId,
      environmentId: user.environmentId,
      enabled: body.enabled,
      preferences: body.preferences,
    });

    return await this.updateGlobalPreferenceUsecase.execute(command);
  }

  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  @Get('/:subscriberId/notifications/feed')
  @ApiOperation({
    summary: 'Get in-app notification feed for a particular subscriber',
  })
  @ApiOkPaginatedResponse(MessageResponseDto)
  async getNotificationsFeed(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string,
    @Query() query: GetInAppNotificationsFeedForSubscriberDto
  ): Promise<PaginatedResponseDto<MessageResponseDto>> {
    let feedsQuery: string[] | undefined;
    if (query.feedIdentifier) {
      feedsQuery = Array.isArray(query.feedIdentifier) ? query.feedIdentifier : [query.feedIdentifier];
    }

    const command = GetNotificationsFeedCommand.create({
      organizationId: user.organizationId,
      environmentId: user.environmentId,
      subscriberId: subscriberId,
      page: query.page,
      feedId: feedsQuery,
      query: { seen: query.seen, read: query.read },
      limit: query.limit,
      payload: query.payload,
    });

    return await this.getNotificationsFeedUsecase.execute(command);
  }

  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  @Get('/:subscriberId/notifications/unseen')
  @ApiResponse(UnseenCountResponse)
  @ApiOperation({
    summary: 'Get the unseen in-app notifications count for subscribers feed',
  })
  async getUnseenCount(
    @UserSession() user: IJwtPayload,
    @Query('feedIdentifier') feedId: string[] | string,
    @Query('seen') seen: boolean,
    @Param('subscriberId') subscriberId: string,
    @Query('limit', new DefaultValuePipe(100)) limit: number
  ): Promise<UnseenCountResponse> {
    let feedsQuery: string[] | undefined;

    if (feedId) {
      feedsQuery = Array.isArray(feedId) ? feedId : [feedId];
    }

    if (seen === undefined) {
      seen = false;
    }

    const command = GetFeedCountCommand.create({
      organizationId: user.organizationId,
      subscriberId: subscriberId,
      environmentId: user.environmentId,
      feedId: feedsQuery,
      seen,
      limit,
    });

    return await this.getFeedCountUsecase.execute(command);
  }

  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  @Post('/:subscriberId/messages/markAs')
  @ApiOperation({
    summary: 'Mark a subscriber feed messages as seen or as read',
    description: `Introducing '/:subscriberId/messages/mark-as endpoint for consistent read and seen message handling,
     deprecating old legacy endpoint.`,
    deprecated: true,
  })
  @ApiResponse(MessageResponseDto, 201, true)
  async markMessageAs(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string,
    @Body() body: MarkMessageAsRequestDto
  ): Promise<MessageEntity[]> {
    if (!body.messageId) throw new BadRequestException('messageId is required');

    const messageIds = this.toArray(body.messageId);
    if (!messageIds) throw new BadRequestException('messageId is required');

    const command = MarkMessageAsCommand.create({
      organizationId: user.organizationId,
      subscriberId: subscriberId,
      environmentId: user.environmentId,
      messageIds,
      mark: body.mark,
    });

    return await this.markMessageAsUsecase.execute(command);
  }

  @ApiOperation({
    summary: 'Mark a subscriber messages as seen, read, unseen or unread',
  })
  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  @Post('/:subscriberId/messages/mark-as')
  async markMessagesAs(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string,
    @Body() body: MessageMarkAsRequestDto
  ): Promise<MessageEntity[]> {
    const messageIds = this.toArray(body.messageId);
    if (!messageIds || messageIds.length === 0) throw new BadRequestException('messageId is required');

    return await this.markMessageAsByMarkUsecase.execute(
      MarkMessageAsByMarkCommand.create({
        organizationId: user.organizationId,
        subscriberId: subscriberId,
        environmentId: user.environmentId,
        messageIds,
        markAs: body.markAs,
        __source: 'api',
      })
    );
  }

  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  @Post('/:subscriberId/messages/mark-all')
  @ApiOperation({
    summary:
      'Marks all the subscriber messages as read, unread, seen or unseen. ' +
      'Optionally you can pass feed id (or array) to mark messages of a particular feed.',
  })
  async markAllUnreadAsRead(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string,
    @Body() body: MarkAllMessageAsRequestDto
  ) {
    const feedIdentifiers = this.toArray(body.feedIdentifier);
    const command = MarkAllMessagesAsCommand.create({
      organizationId: user.organizationId,
      subscriberId,
      environmentId: user.environmentId,
      markAs: body.markAs,
      feedIdentifiers,
    });

    return await this.markAllMessagesAsUsecase.execute(command);
  }

  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  @Post('/:subscriberId/messages/:messageId/actions/:type')
  @ApiOperation({
    summary: 'Mark message action as seen',
  })
  @ApiResponse(MessageResponseDto, 201)
  async markActionAsSeen(
    @UserSession() user: IJwtPayload,
    @Param('messageId') messageId: string,
    @Param('type') type: ButtonTypeEnum,
    @Body() body: MarkMessageActionAsSeenDto,
    @Param('subscriberId') subscriberId: string
  ): Promise<MessageResponseDto> {
    return await this.updateMessageActionsUsecase.execute(
      UpdateMessageActionsCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        subscriberId: subscriberId,
        messageId,
        type,
        payload: body.payload,
        status: body.status,
      })
    );
  }

  @ExternalApiAccessible()
  @Get('/:subscriberId/credentials/:providerId/oauth/callback')
  @ApiOperation({
    summary: 'Handle providers oauth redirect',
  })
  async chatOauthCallback(
    @Param('subscriberId') subscriberId: string,
    @Param('providerId') providerId: ChatProviderIdEnum,
    @Query() query: ChatOauthCallbackRequestDto,
    @Res() res
  ): Promise<any> {
    const data = await this.chatOauthCallbackUsecase.execute(
      ChatOauthCallbackCommand.create({
        providerCode: query?.code,
        hmacHash: query?.hmacHash,
        environmentId: query?.environmentId,
        integrationIdentifier: query?.integrationIdentifier,
        subscriberId,
        providerId,
      })
    );

    if (data.redirect) {
      res.redirect(data.action);
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'");
      res.send(data.action);
    }
  }

  @ExternalApiAccessible()
  @Get('/:subscriberId/credentials/:providerId/oauth')
  @ApiOperation({
    summary: 'Handle chat oauth',
  })
  async chatAccessOauth(
    @Param('subscriberId') subscriberId: string,
    @Param('providerId') providerId: ChatProviderIdEnum,
    @Res() res,
    @Query() query: ChatOauthRequestDto
  ): Promise<void> {
    const data = await this.chatOauthUsecase.execute(
      ChatOauthCommand.create({
        hmacHash: query?.hmacHash,
        environmentId: query?.environmentId,
        integrationIdentifier: query?.integrationIdentifier,
        subscriberId,
        providerId,
      })
    );

    res.redirect(data);
  }

  private toArray(param?: string[] | string): string[] | undefined {
    let paramArray: string[] | undefined;
    if (param) {
      paramArray = Array.isArray(param) ? param : param.split(',');
    }

    return paramArray;
  }
}
