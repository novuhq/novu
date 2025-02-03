import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import {
  CreateSubscriber,
  CreateSubscriberCommand,
  OAuthHandlerEnum,
  UpdateSubscriber,
  UpdateSubscriberChannel,
  UpdateSubscriberChannelCommand,
  UpdateSubscriberCommand,
} from '@novu/application-generic';
import { ApiExcludeEndpoint, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  ApiRateLimitCategoryEnum,
  ApiRateLimitCostEnum,
  ButtonTypeEnum,
  ChatProviderIdEnum,
  IPreferenceChannels,
  PreferenceLevelEnum,
  TriggerTypeEnum,
  UserSessionData,
} from '@novu/shared';
import { MessageEntity } from '@novu/dal';
import { RemoveSubscriber, RemoveSubscriberCommand } from './usecases/remove-subscriber';
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
import { GetSubscribers, GetSubscribersCommand } from './usecases/get-subscribers';
import { GetSubscriber, GetSubscriberCommand } from './usecases/get-subscriber';
import { GetPreferencesByLevelCommand } from './usecases/get-preferences-by-level/get-preferences-by-level.command';
import { GetPreferencesByLevel } from './usecases/get-preferences-by-level/get-preferences-by-level.usecase';
import {
  UpdateSubscriberPreferenceGlobalResponseDto,
  UpdateSubscriberPreferenceResponseDto,
} from '../widgets/dtos/update-subscriber-preference-response.dto';
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
import {
  ApiCommonResponses,
  ApiCreatedResponse,
  ApiFoundResponse,
  ApiNoContentResponse,
  ApiResponse,
} from '../shared/framework/response.decorator';
import { ChatOauthCallbackRequestDto, ChatOauthRequestDto } from './dtos/chat-oauth-request.dto';
import { ChatOauthCallback } from './usecases/chat-oauth-callback/chat-oauth-callback.usecase';
import { ChatOauthCallbackCommand } from './usecases/chat-oauth-callback/chat-oauth-callback.command';
import { ChatOauth } from './usecases/chat-oauth/chat-oauth.usecase';
import { ChatOauthCommand } from './usecases/chat-oauth/chat-oauth.command';
import {
  DeleteSubscriberCredentials,
  DeleteSubscriberCredentialsCommand,
} from './usecases/delete-subscriber-credentials';
import { MarkAllMessagesAsCommand } from '../widgets/usecases/mark-all-messages-as/mark-all-messages-as.command';
import { MarkAllMessagesAs } from '../widgets/usecases/mark-all-messages-as/mark-all-messages-as.usecase';
import { MarkAllMessageAsRequestDto } from './dtos/mark-all-messages-as-request.dto';
import { BulkCreateSubscribers } from './usecases/bulk-create-subscribers/bulk-create-subscribers.usecase';
import { BulkCreateSubscribersCommand } from './usecases/bulk-create-subscribers';
import { GetSubscriberPreferencesByLevelParams } from './params';
import { ThrottlerCategory, ThrottlerCost } from '../rate-limiting/guards';
import { MessageMarkAsRequestDto } from '../widgets/dtos/mark-as-request.dto';
import { MarkMessageAsByMarkCommand } from '../widgets/usecases/mark-message-as-by-mark/mark-message-as-by-mark.command';
import { MarkMessageAsByMark } from '../widgets/usecases/mark-message-as-by-mark/mark-message-as-by-mark.usecase';
import { FeedResponseDto } from '../widgets/dtos/feeds-response.dto';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import { SdkApiParam, SdkGroupName, SdkMethodName, SdkUsePagination } from '../shared/framework/swagger/sdk.decorators';
import { UpdatePreferences } from '../inbox/usecases/update-preferences/update-preferences.usecase';
import { UpdatePreferencesCommand } from '../inbox/usecases/update-preferences/update-preferences.command';
import { UnseenCountQueryDto } from './query-objects/unseen-count.query';
import { ResponseTypeEnum } from './usecases/chat-oauth-callback/chat-oauth-callback.result';
import { BulkCreateSubscriberResponseDto } from './dtos/bulk-create-subscriber-response.dto';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@ApiTags('Subscribers')
@Controller('/subscribers')
export class SubscribersV1Controller {
  constructor(
    private createSubscriberUsecase: CreateSubscriber,
    private bulkCreateSubscribersUsecase: BulkCreateSubscribers,
    private updateSubscriberUsecase: UpdateSubscriber,
    private updateSubscriberChannelUsecase: UpdateSubscriberChannel,
    private removeSubscriberUsecase: RemoveSubscriber,
    private getSubscriberUseCase: GetSubscriber,
    private getSubscribersUsecase: GetSubscribers,
    private getPreferenceUsecase: GetPreferencesByLevel,
    private updatePreferencesUsecase: UpdatePreferences,
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
  @UserAuthentication()
  @ApiOkPaginatedResponse(SubscriberResponseDto)
  @ApiOperation({
    summary: 'Get subscribers',
    description: 'Returns a list of subscribers, could paginated using the `page` and `limit` query parameter',
  })
  @SdkUsePagination()
  async listSubscribers(
    @UserSession() user: UserSessionData,
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
  @UserAuthentication()
  @ApiResponse(SubscriberResponseDto)
  @SdkMethodName('retrieveLegacy')
  @ApiOperation({
    summary: 'Get subscriber',
    description: 'Get subscriber by your internal id used to identify the subscriber',
  })
  @ApiQuery({
    name: 'includeTopics',
    type: Boolean,
    description: 'Includes the topics associated with the subscriber',
    required: false,
  })
  async getSubscriber(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Query('includeTopics') includeTopics: string
  ): Promise<SubscriberResponseDto> {
    return this.getSubscriberUseCase.execute(
      GetSubscriberCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        includeTopics: includeTopics === 'true',
      })
    );
  }

  @Post('/')
  @ExternalApiAccessible()
  @UserAuthentication()
  @ApiResponse(SubscriberResponseDto, 201)
  @ApiOperation({
    summary: 'Create subscriber',
    description:
      'Creates a subscriber entity, in the Novu platform. ' +
      'The subscriber will be later used to receive notifications, and access notification feeds. ' +
      'Communication credentials such as email, phone number, and 3 rd party credentials i.e slack tokens could be later associated to this entity.',
  })
  async createSubscriber(
    @UserSession() user: UserSessionData,
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
        channels: body.channels,
      })
    );
  }

  @ThrottlerCost(ApiRateLimitCostEnum.BULK)
  @Post('/bulk')
  @ExternalApiAccessible()
  @UserAuthentication()
  @ApiOperation({
    summary: 'Bulk create subscribers',
    description: `
      Using this endpoint you can create multiple subscribers at once, to avoid multiple calls to the API.
      The bulk API is limited to 500 subscribers per request.
    `,
  })
  @ApiResponse(BulkCreateSubscriberResponseDto, 201)
  @SdkMethodName('createBulk')
  async bulkCreateSubscribers(
    @UserSession() user: UserSessionData,
    @Body() body: BulkSubscriberCreateDto
  ): Promise<BulkCreateSubscriberResponseDto> {
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
  @UserAuthentication()
  @ApiResponse(SubscriberResponseDto)
  @ApiOperation({
    summary: 'Update subscriber',
    description: 'Used to update the subscriber entity with new information',
  })
  async updateSubscriber(
    @UserSession() user: UserSessionData,
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
        channels: body.channels,
      })
    );
  }

  @Put('/:subscriberId/credentials')
  @ExternalApiAccessible()
  @UserAuthentication()
  @ApiResponse(SubscriberResponseDto)
  @ApiOperation({
    summary: 'Update subscriber credentials',
    description: 'Subscriber credentials associated to the delivery methods such as slack and push tokens.',
  })
  @SdkGroupName('Subscribers.Credentials')
  async updateSubscriberChannel(
    @UserSession() user: UserSessionData,
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
  @UserAuthentication()
  @ApiResponse(SubscriberResponseDto)
  @ApiOperation({
    summary: 'Modify subscriber credentials',
    description: `Subscriber credentials associated to the delivery methods such as slack and push tokens.
    This endpoint appends provided credentials and deviceTokens to the existing ones.`,
  })
  @SdkGroupName('Subscribers.Credentials')
  @SdkMethodName('append')
  async modifySubscriberChannel(
    @UserSession() user: UserSessionData,
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
  @UserAuthentication()
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete subscriber credentials by providerId',
    description: 'Delete subscriber credentials such as slack and expo tokens.',
  })
  @SdkGroupName('Subscribers.Credentials')
  async deleteSubscriberCredentials(
    @UserSession() user: UserSessionData,
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
  @UserAuthentication()
  @ApiResponse(SubscriberResponseDto)
  @ApiOperation({
    summary: 'Update subscriber online status',
    description: 'Used to update the subscriber isOnline flag.',
  })
  @SdkGroupName('Subscribers.properties')
  @SdkMethodName('updateOnlineFlag')
  async updateSubscriberOnlineFlag(
    @UserSession() user: UserSessionData,
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
  @UserAuthentication()
  @ApiResponse(DeleteSubscriberResponseDto)
  @ApiOperation({
    summary: 'Delete subscriber',
    description: 'Deletes a subscriber entity from the Novu platform',
    deprecated: true,
  })
  @SdkMethodName('deleteLegacy')
  async removeSubscriber(
    @UserSession() user: UserSessionData,
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
  @UserAuthentication()
  @ApiResponse(UpdateSubscriberPreferenceResponseDto, 200, true)
  @ApiOperation({
    summary: 'Get subscriber preferences',
  })
  @ApiQuery({
    name: 'includeInactiveChannels',
    type: Boolean,
    required: false,
    description:
      'A flag which specifies if the inactive workflow channels should be included in the retrieved preferences. Default is true',
  })
  @SdkGroupName('Subscribers.Preferences')
  @SdkMethodName('list')
  async listSubscriberPreferences(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Query('includeInactiveChannels') includeInactiveChannels: boolean
  ): Promise<UpdateSubscriberPreferenceResponseDto[]> {
    const command = GetPreferencesByLevelCommand.create({
      organizationId: user.organizationId,
      subscriberId,
      environmentId: user.environmentId,
      level: PreferenceLevelEnum.TEMPLATE,
      includeInactiveChannels: includeInactiveChannels ?? true,
    });

    return (await this.getPreferenceUsecase.execute(command)) as UpdateSubscriberPreferenceResponseDto[];
  }

  @Get('/:subscriberId/preferences/:parameter')
  @ExternalApiAccessible()
  @UserAuthentication()
  @ApiResponse(GetSubscriberPreferencesResponseDto, 200, true)
  @ApiOperation({
    summary: 'Get subscriber preferences by level',
  })
  @ApiParam({ name: 'subscriberId', type: String, required: true })
  @SdkApiParam(
    {
      name: 'parameter',
      type: String,
      enum: PreferenceLevelEnum,
      required: true,
      description: 'the preferences level to be retrieved (template / global) ',
    },
    { nameOverride: 'preferenceLevel' }
  )
  @ApiQuery({
    name: 'includeInactiveChannels',
    type: Boolean,
    required: false,
    description:
      'A flag which specifies if the inactive workflow channels should be included in the retrieved preferences. Default is true',
  })
  @SdkGroupName('Subscribers.Preferences')
  @SdkMethodName('retrieveByLevel')
  async getSubscriberPreferenceByLevel(
    @UserSession() user: UserSessionData,
    @Param() { parameter, subscriberId }: GetSubscriberPreferencesByLevelParams,
    @Query('includeInactiveChannels') includeInactiveChannels: boolean
  ): Promise<GetSubscriberPreferencesResponseDto[]> {
    const command = GetPreferencesByLevelCommand.create({
      organizationId: user.organizationId,
      subscriberId,
      environmentId: user.environmentId,
      level: parameter,
      includeInactiveChannels: includeInactiveChannels ?? true,
    });

    return await this.getPreferenceUsecase.execute(command);
  }

  // @ts-ignore
  @Patch('/:subscriberId/preferences/:parameter')
  @ExternalApiAccessible()
  @UserAuthentication()
  @ApiResponse(UpdateSubscriberPreferenceResponseDto)
  @ApiParam({ name: 'subscriberId', type: String, required: true })
  @SdkApiParam(
    {
      name: 'parameter',
      type: String,
      required: true,
    },
    { nameOverride: 'workflowId' }
  )
  @ApiOperation({
    summary: 'Update subscriber preference',
  })
  @SdkGroupName('Subscribers.Preferences')
  @SdkMethodName('updateLegacy')
  async updateSubscriberPreference(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Param('parameter') workflowId: string,
    @Body() body: UpdateSubscriberPreferenceRequestDto
  ): Promise<UpdateSubscriberPreferenceResponseDto> {
    const result = await this.updatePreferencesUsecase.execute(
      UpdatePreferencesCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        workflowId,
        level: PreferenceLevelEnum.TEMPLATE,
        includeInactiveChannels: true,
        ...(body.channel && { [body.channel.type]: body.channel.enabled }),
      })
    );

    if (!result.workflow) throw new NotFoundException('Workflow not found');

    return {
      preference: {
        channels: result.channels,
        enabled: result.enabled,
      },
      template: {
        _id: result.workflow.id,
        name: result.workflow.name,
        critical: result.workflow.critical,
        triggers: [
          {
            identifier: result.workflow.identifier,
            type: TriggerTypeEnum.EVENT,
            variables: [],
          },
        ],
      },
    };
  }

  @Patch('/:subscriberId/preferences')
  @ExternalApiAccessible()
  @UserAuthentication()
  @ApiResponse(UpdateSubscriberPreferenceGlobalResponseDto)
  @ApiOperation({
    summary: 'Update subscriber global preferences',
  })
  @SdkGroupName('Subscribers.Preferences')
  @SdkMethodName('updateGlobal')
  async updateSubscriberGlobalPreferences(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Body() body: UpdateSubscriberGlobalPreferencesRequestDto
  ): Promise<UpdateSubscriberPreferenceGlobalResponseDto> {
    const channels = body.preferences?.reduce((acc, curr) => {
      acc[curr.type] = curr.enabled;

      return acc;
    }, {} as IPreferenceChannels);

    const result = await this.updatePreferencesUsecase.execute(
      UpdatePreferencesCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        level: PreferenceLevelEnum.GLOBAL,
        includeInactiveChannels: true,
        ...channels,
      })
    );

    return {
      preference: {
        channels: result.channels,
        enabled: result.enabled,
      },
    };
  }

  @ExternalApiAccessible()
  @UserAuthentication()
  @Get('/:subscriberId/notifications/feed')
  @ApiOperation({
    summary: 'Get in-app notification feed for a particular subscriber',
  })
  @ApiResponse(FeedResponseDto)
  @SdkGroupName('Subscribers.Notifications')
  @SdkMethodName('feed')
  async getNotificationsFeed(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Query() query: GetInAppNotificationsFeedForSubscriberDto
  ): Promise<FeedResponseDto> {
    let feedsQuery: string[] | undefined;
    if (query.feedIdentifier) {
      feedsQuery = Array.isArray(query.feedIdentifier) ? query.feedIdentifier : [query.feedIdentifier];
    }

    const command = GetNotificationsFeedCommand.create({
      organizationId: user.organizationId,
      environmentId: user.environmentId,
      subscriberId,
      page: query.page,
      feedId: feedsQuery,
      query: { seen: query.seen, read: query.read },
      limit: query.limit,
      payload: query.payload,
    });

    return await this.getNotificationsFeedUsecase.execute(command);
  }

  @ExternalApiAccessible()
  @UserAuthentication()
  @Get('/:subscriberId/notifications/unseen')
  @ApiResponse(UnseenCountResponse)
  @ApiOperation({
    summary: 'Get the unseen in-app notifications count for subscribers feed',
  })
  @SdkGroupName('Subscribers.Notifications')
  @SdkMethodName('unseenCount')
  async getUnseenCount(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Query() query: UnseenCountQueryDto
  ): Promise<UnseenCountResponse> {
    let feedsQuery: string[] | undefined;

    if (query.feedId) {
      feedsQuery = Array.isArray(query.feedId) ? query.feedId : [query.feedId];
    }

    if (query.seen === undefined) {
      // eslint-disable-next-line no-param-reassign
      query.seen = false;
    }

    const command = GetFeedCountCommand.create({
      organizationId: user.organizationId,
      subscriberId,
      environmentId: user.environmentId,
      feedId: feedsQuery,
      seen: query.seen,
      limit: query.limit || 100,
    });

    return await this.getFeedCountUsecase.execute(command);
  }
  @ApiExcludeEndpoint()
  @ExternalApiAccessible()
  @UserAuthentication()
  @Post('/:subscriberId/messages/markAs')
  @ApiOperation({
    summary: 'Mark a subscriber feed messages as seen or as read',
    description: `Introducing '/:subscriberId/messages/mark-as endpoint for consistent read and seen message handling,
     deprecating old legacy endpoint.`,
    deprecated: true,
  })
  @SdkGroupName('Subscribers.Messages')
  @SdkMethodName('markAs')
  @ApiResponse(MessageResponseDto, 201, true)
  async markMessageAs(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Body() body: MarkMessageAsRequestDto
  ): Promise<MessageEntity[]> {
    if (!body.messageId) throw new BadRequestException('messageId is required');

    const messageIds = this.toArray(body.messageId);
    if (!messageIds) throw new BadRequestException('messageId is required');

    const command = MarkMessageAsCommand.create({
      organizationId: user.organizationId,
      subscriberId,
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
  @UserAuthentication()
  @Post('/:subscriberId/messages/mark-as')
  @SdkGroupName('Subscribers.Messages')
  @SdkMethodName('markAllAs')
  @ApiResponse(MessageResponseDto, 201, true)
  async markMessagesAs(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Body() body: MessageMarkAsRequestDto
  ): Promise<MessageResponseDto[]> {
    const messageIds = this.toArray(body.messageId);
    if (!messageIds || messageIds.length === 0) throw new BadRequestException('messageId is required');

    return await this.markMessageAsByMarkUsecase.execute(
      MarkMessageAsByMarkCommand.create({
        organizationId: user.organizationId,
        subscriberId,
        environmentId: user.environmentId,
        messageIds,
        markAs: body.markAs,
        __source: 'api',
      })
    );
  }

  @ExternalApiAccessible()
  @UserAuthentication()
  @Post('/:subscriberId/messages/mark-all')
  @ApiOperation({
    summary:
      'Marks all the subscriber messages as read, unread, seen or unseen. ' +
      'Optionally you can pass feed id (or array) to mark messages of a particular feed.',
  })
  @ApiCreatedResponse({
    type: Number,
  })
  @SdkGroupName('Subscribers.Messages')
  @SdkMethodName('markAll')
  async markAllUnreadAsRead(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Body() body: MarkAllMessageAsRequestDto
  ): Promise<number> {
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
  @UserAuthentication()
  @Post('/:subscriberId/messages/:messageId/actions/:type')
  @ApiOperation({
    summary: 'Mark message action as seen',
  })
  @ApiResponse(MessageResponseDto, 201)
  @SdkGroupName('Subscribers.Messages')
  @SdkMethodName('updateAsSeen')
  async markActionAsSeen(
    @UserSession() user: UserSessionData,
    @Param('messageId') messageId: string,
    @Param('type') type: ButtonTypeEnum,
    @Body() body: MarkMessageActionAsSeenDto,
    @Param('subscriberId') subscriberId: string
  ): Promise<MessageResponseDto> {
    return await this.updateMessageActionsUsecase.execute(
      UpdateMessageActionsCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        subscriberId,
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
  @ApiResponse(String, 200, false, false, {
    status: 200,
    description: 'Returns plain text response.',
    content: {
      'text/html': {
        schema: {
          type: 'string',
        },
      },
    },
  })
  @ApiFoundResponse({
    type: String,
    status: 302,
    description: 'Redirects to the specified URL.',
    headers: {
      Location: { description: 'The URL to redirect to.', schema: { type: 'string', example: 'https://www.novu.co' } },
    },
  }) // Link to the interface
  @SdkGroupName('Subscribers.Authentication')
  @SdkMethodName('chatAccessOauthCallBack')
  async chatOauthCallback(
    @Param('subscriberId') subscriberId: string,
    @Param('providerId') providerId: ChatProviderIdEnum,
    @Query() query: ChatOauthCallbackRequestDto,
    @Res() res: any
  ): Promise<void> {
    const callbackResult = await this.chatOauthCallbackUsecase.execute(
      ChatOauthCallbackCommand.create({
        providerCode: query?.code,
        hmacHash: query?.hmacHash,
        environmentId: query?.environmentId,
        integrationIdentifier: query?.integrationIdentifier,
        subscriberId,
        providerId,
      })
    );
    if (callbackResult.typeOfResponse !== ResponseTypeEnum.URL) {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'");
      res.send(callbackResult.resultString);

      return;
    }
    res.redirect(callbackResult.resultString); // Return the URL to redirect to
  }

  @ExternalApiAccessible()
  @Get('/:subscriberId/credentials/:providerId/oauth')
  @ApiOperation({
    summary: 'Handle chat oauth',
  })
  @SdkGroupName('Subscribers.Authentication')
  @SdkMethodName('chatAccessOauth')
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
