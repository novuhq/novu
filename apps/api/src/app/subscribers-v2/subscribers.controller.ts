import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  CreateOrUpdateSubscriberCommand,
  CreateOrUpdateSubscriberUseCase,
  ExternalApiAccessible,
  FeatureFlagsService,
  RequirePermissions,
  UserSession,
} from '@novu/application-generic';
import {
  ApiRateLimitCategoryEnum,
  DirectionEnum,
  FeatureFlagsKeysEnum,
  PermissionsEnum,
  SubscriberCustomData,
  UserSessionData,
} from '@novu/shared';
import { Response } from 'express';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { GetPreferencesResponseDto } from '../inbox/dtos/get-preferences-response.dto';
import { BulkUpdatePreferencesCommand } from '../inbox/usecases/bulk-update-preferences/bulk-update-preferences.command';
import { BulkUpdatePreferences } from '../inbox/usecases/bulk-update-preferences/bulk-update-preferences.usecase';
import { ThrottlerCategory } from '../rate-limiting/guards/throttler.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { SdkGroupName, SdkMethodName } from '../shared/framework/swagger/sdk.decorators';
import { SubscriberResponseDto } from '../subscribers/dtos';
import { ListSubscriberSubscriptionsQueryDto } from '../topics-v2/dtos/list-subscriber-subscriptions-query.dto';
import { ListTopicSubscriptionsResponseDto } from '../topics-v2/dtos/list-topic-subscriptions-response.dto';
import { ListSubscriberSubscriptionsCommand } from '../topics-v2/usecases/list-subscriber-subscriptions/list-subscriber-subscriptions.command';
import { ListSubscriberSubscriptionsUseCase } from '../topics-v2/usecases/list-subscriber-subscriptions/list-subscriber-subscriptions.usecase';
import { BulkUpdateSubscriberPreferencesDto } from './dtos/bulk-update-subscriber-preferences.dto';
import { CreateSubscriberRequestDto } from './dtos/create-subscriber.dto';
import { GenerateChatOauthUrlRequestDto } from './dtos/generate-chat-oauth-url.dto';
import { GetSubscriberPreferencesDto } from './dtos/get-subscriber-preferences.dto';
import { GetSubscriberPreferencesRequestDto } from './dtos/get-subscriber-preferences-request.dto';
import { ListSubscribersQueryDto } from './dtos/list-subscribers-query.dto';
import { ListSubscribersResponseDto } from './dtos/list-subscribers-response.dto';
import { PatchSubscriberRequestDto } from './dtos/patch-subscriber.dto';
import { PatchSubscriberPreferencesDto } from './dtos/patch-subscriber-preferences.dto';
import { RemoveSubscriberResponseDto } from './dtos/remove-subscriber.dto';
import { ChatOauthCallbackCommand } from './usecases/chat-oauth-callback/chat-oauth-callback.command';
import { ResponseTypeEnum } from './usecases/chat-oauth-callback/chat-oauth-callback.response';
import { ChatOauthCallback } from './usecases/chat-oauth-callback/chat-oauth-callback.usecase';
import { GenerateChatOauthUrlCommand } from './usecases/generate-chat-oath-url/generate-chat-oauth-url.command';
import { GenerateChatOauthUrl } from './usecases/generate-chat-oath-url/generate-chat-oauth-url.usecase';
import { GetSubscriberCommand } from './usecases/get-subscriber/get-subscriber.command';
import { GetSubscriber } from './usecases/get-subscriber/get-subscriber.usecase';
import { GetSubscriberPreferencesCommand } from './usecases/get-subscriber-preferences/get-subscriber-preferences.command';
import { GetSubscriberPreferences } from './usecases/get-subscriber-preferences/get-subscriber-preferences.usecase';
import { ListSubscribersCommand } from './usecases/list-subscribers/list-subscribers.command';
import { ListSubscribersUseCase } from './usecases/list-subscribers/list-subscribers.usecase';
import { mapSubscriberEntityToDto } from './usecases/list-subscribers/map-subscriber-entity-to.dto';
import { PatchSubscriberCommand } from './usecases/patch-subscriber/patch-subscriber.command';
import { PatchSubscriber } from './usecases/patch-subscriber/patch-subscriber.usecase';
import { RemoveSubscriberCommand } from './usecases/remove-subscriber/remove-subscriber.command';
import { RemoveSubscriber } from './usecases/remove-subscriber/remove-subscriber.usecase';
import { UpdateSubscriberPreferencesCommand } from './usecases/update-subscriber-preferences/update-subscriber-preferences.command';
import { UpdateSubscriberPreferences } from './usecases/update-subscriber-preferences/update-subscriber-preferences.usecase';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@Controller({ path: '/subscribers', version: '2' })
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Subscribers')
@SdkGroupName('Subscribers')
@ApiCommonResponses()
export class SubscribersController {
  constructor(
    private listSubscribersUsecase: ListSubscribersUseCase,
    private getSubscriberUsecase: GetSubscriber,
    private patchSubscriberUsecase: PatchSubscriber,
    private removeSubscriberUsecase: RemoveSubscriber,
    private getSubscriberPreferencesUsecase: GetSubscriberPreferences,
    private updateSubscriberPreferencesUsecase: UpdateSubscriberPreferences,
    private bulkUpdatePreferencesUsecase: BulkUpdatePreferences,
    private createOrUpdateSubscriberUsecase: CreateOrUpdateSubscriberUseCase,
    private listSubscriberSubscriptionsUsecase: ListSubscriberSubscriptionsUseCase,
    private chatOauthCallbackUsecase: ChatOauthCallback,
    private generateChatOauthUrlUsecase: GenerateChatOauthUrl,
    private featureFlagsService: FeatureFlagsService
  ) {}

  @Get('')
  @ExternalApiAccessible()
  @SdkMethodName('search')
  @ApiOperation({
    summary: 'Search subscribers',
    description: `Search subscribers by their **email**, **phone**, **subscriberId** and **name**. 
    The search is case sensitive and supports pagination.Checkout all available filters in the query section.`,
  })
  @ApiResponse(ListSubscribersResponseDto)
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_READ)
  @RequireAuthentication()
  async searchSubscribers(
    @UserSession() user: UserSessionData,
    @Query() query: ListSubscribersQueryDto
  ): Promise<ListSubscribersResponseDto> {
    return await this.listSubscribersUsecase.execute(
      ListSubscribersCommand.create({
        user,
        limit: Number(query.limit || '10'),
        after: query.after,
        before: query.before,
        orderDirection: query.orderDirection || DirectionEnum.DESC,
        orderBy: query.orderBy || '_id',
        email: query.email,
        phone: query.phone,
        subscriberId: query.subscriberId,
        name: query.name,
        includeCursor: query.includeCursor,
      })
    );
  }

  @Get('/:subscriberId')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Retrieve a subscriber',
    description: `Retrieve a subscriber by its unique key identifier **subscriberId**. 
    **subscriberId** field is required.`,
  })
  @ApiResponse(SubscriberResponseDto)
  @SdkMethodName('retrieve')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_READ)
  @RequireAuthentication()
  async getSubscriber(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string
  ): Promise<SubscriberResponseDto> {
    return await this.getSubscriberUsecase.execute(
      GetSubscriberCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
      })
    );
  }

  @Post('')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Create a subscriber',
    description: `Create a subscriber with the subscriber attributes. 
      **subscriberId** is a required field, rest other fields are optional, if the subscriber already exists, it will be updated`,
  })
  @ApiQuery({
    name: 'failIfExists',
    required: false,
    type: Boolean,
    description: 'If true, the request will fail if a subscriber with the same subscriberId already exists',
  })
  @ApiResponse(SubscriberResponseDto, 201)
  @ApiResponse(SubscriberResponseDto, 409, false, false, {
    description: 'Subscriber already exists (when query param failIfExists=true)',
  })
  @SdkMethodName('create')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  @RequireAuthentication()
  async createSubscriber(
    @UserSession() user: UserSessionData,
    @Body() body: CreateSubscriberRequestDto,
    @Query('failIfExists') failIfExists?: boolean
  ): Promise<SubscriberResponseDto> {
    const subscriberEntity = await this.createOrUpdateSubscriberUsecase.execute(
      CreateOrUpdateSubscriberCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId: body.subscriberId,
        email: body.email || undefined,
        firstName: body.firstName || undefined,
        lastName: body.lastName || undefined,
        phone: body.phone || undefined,
        avatar: body.avatar || undefined,
        locale: body.locale || undefined,
        timezone: body.timezone || undefined,
        // TODO: Change shared type to
        data: (body.data || {}) as SubscriberCustomData,
        /*
         * TODO: In Subscriber V2 API endpoint we haven't added channels yet.
         * channels: body.channels || [],
         */
        failIfExists,
      })
    );

    return mapSubscriberEntityToDto(subscriberEntity);
  }

  @Patch('/:subscriberId')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Update a subscriber',
    description: `Update a subscriber by its unique key identifier **subscriberId**. 
    **subscriberId** is a required field, rest other fields are optional`,
  })
  @ApiResponse(SubscriberResponseDto)
  @SdkMethodName('patch')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  @RequireAuthentication()
  async patchSubscriber(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Body() body: PatchSubscriberRequestDto
  ): Promise<SubscriberResponseDto> {
    return await this.patchSubscriberUsecase.execute(
      PatchSubscriberCommand.create({
        subscriberId,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        patchSubscriberRequestDto: body,
        userId: user._id,
      })
    );
  }

  @Delete('/:subscriberId')
  @ApiResponse(RemoveSubscriberResponseDto, 200)
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Delete a subscriber',
    description: `Deletes a subscriber entity from the Novu platform along with associated messages, preferences, and topic subscriptions. 
      **subscriberId** is a required field.`,
  })
  @SdkMethodName('delete')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  @RequireAuthentication()
  async removeSubscriber(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string
  ): Promise<RemoveSubscriberResponseDto> {
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
  @ApiOperation({
    summary: 'Retrieve subscriber preferences',
    description: `Retrieve subscriber channel preferences by its unique key identifier **subscriberId**. 
    This API returns all five channels preferences for all workflows and global preferences.`,
  })
  @ApiResponse(GetSubscriberPreferencesDto)
  @SdkGroupName('Subscribers.Preferences')
  @SdkMethodName('list')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_READ)
  @RequireAuthentication()
  async getSubscriberPreferences(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Query() query: GetSubscriberPreferencesRequestDto
  ): Promise<GetSubscriberPreferencesDto> {
    return await this.getSubscriberPreferencesUsecase.execute(
      GetSubscriberPreferencesCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        criticality: query.criticality,
      })
    );
  }

  @Patch('/:subscriberId/preferences/bulk')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Bulk update subscriber preferences',
    description: `Bulk update subscriber preferences by its unique key identifier **subscriberId**. 
    This API allows updating multiple workflow preferences in a single request.`,
  })
  @ApiResponse(GetPreferencesResponseDto, 200, true)
  @SdkGroupName('Subscribers.Preferences')
  @SdkMethodName('bulkUpdate')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  @RequireAuthentication()
  async bulkUpdateSubscriberPreferences(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Body() body: BulkUpdateSubscriberPreferencesDto
  ): Promise<GetPreferencesResponseDto[]> {
    const preferences = body.preferences.map((preference) => ({
      workflowId: preference.workflowId,
      email: preference.channels.email,
      sms: preference.channels.sms,
      in_app: preference.channels.in_app,
      push: preference.channels.push,
      chat: preference.channels.chat,
    }));

    return await this.bulkUpdatePreferencesUsecase.execute(
      BulkUpdatePreferencesCommand.create({
        organizationId: user.organizationId,
        subscriberId,
        environmentId: user.environmentId,
        preferences,
      })
    );
  }

  @Patch('/:subscriberId/preferences')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Update subscriber preferences',
    description: `Update subscriber preferences by its unique key identifier **subscriberId**. 
    **workflowId** is optional field, if provided, this API will update that workflow preference, 
    otherwise it will update global preferences`,
  })
  @ApiResponse(GetSubscriberPreferencesDto)
  @SdkGroupName('Subscribers.Preferences')
  @SdkMethodName('update')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  @RequireAuthentication()
  async updateSubscriberPreferences(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Body() body: PatchSubscriberPreferencesDto
  ): Promise<GetSubscriberPreferencesDto> {
    return await this.updateSubscriberPreferencesUsecase.execute(
      UpdateSubscriberPreferencesCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        workflowIdOrInternalId: body.workflowId,
        channels: body.channels,
      })
    );
  }

  @Get('/:subscriberId/subscriptions')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Retrieve subscriber subscriptions',
    description: `Retrieve subscriber's topic subscriptions by its unique key identifier **subscriberId**. 
    Checkout all available filters in the query section.`,
  })
  @ApiParam({ name: 'subscriberId', description: 'The identifier of the subscriber', type: String })
  @ApiResponse(ListTopicSubscriptionsResponseDto)
  @SdkGroupName('Subscribers.Topics')
  @SdkMethodName('list')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_READ)
  @RequireAuthentication()
  async listSubscriberTopics(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Query() query: ListSubscriberSubscriptionsQueryDto
  ): Promise<ListTopicSubscriptionsResponseDto> {
    return await this.listSubscriberSubscriptionsUsecase.execute(
      ListSubscriberSubscriptionsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        topicKey: query.key,
        limit: query.limit ? Number(query.limit) : 10,
        after: query.after,
        before: query.before,
        orderDirection: query.orderDirection === DirectionEnum.ASC ? 1 : -1,
        orderBy: query.orderBy || '_id',
        includeCursor: query.includeCursor,
      })
    );
  }

  @Post('/chat/oauth')
  @ApiOperation({
    summary: 'Generate chat OAuth URL',
    description: `Generate an OAuth URL for chat integrations like Slack. 
    The subscriber will use this URL to authorize the chat integration.`,
  })
  @ApiResponse(String)
  @ApiExcludeEndpoint()
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  @RequireAuthentication()
  async getChatOAuthUrl(
    @UserSession() user: UserSessionData,
    @Body() body: GenerateChatOauthUrlRequestDto
  ): Promise<string> {
    await this.checkFeatureEnabled(user);

    return await this.generateChatOauthUrlUsecase.execute(
      GenerateChatOauthUrlCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId: body.subscriberId,
        integrationIdentifier: body.integrationIdentifier,
        providerId: body.providerId,
      })
    );
  }

  @Get('/chat/oauth/callback')
  @ApiOperation({
    summary: 'Handle chat OAuth callback',
    description: `Generic OAuth callback handler for all chat integrations (Slack, Teams, Discord, etc.). 
    This endpoint processes the authorization code and stores the connection for any supported chat provider.`,
  })
  @ApiExcludeEndpoint()
  async handleChatOAuthCallback(
    @Res() res: Response,
    @Query('code') providerCode: string,
    @Query('state') state: string,
    @Query('error') error?: string,
    @Query('error_description') errorDescription?: string
  ): Promise<void> {
    if (error) {
      throw new BadRequestException(`OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`);
    }

    if (!providerCode || !state) {
      throw new BadRequestException('Missing required OAuth parameters: code and state');
    }

    const result = await this.chatOauthCallbackUsecase.execute(
      ChatOauthCallbackCommand.create({
        providerCode,
        state,
      })
    );

    if (result.type === ResponseTypeEnum.HTML) {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'");
      res.send(result.result);

      return;
    }

    res.redirect(result.result);
  }

  private async checkFeatureEnabled(user: UserSessionData) {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_SLACK_TEAMS_ENABLED,
      defaultValue: false,
      organization: { _id: user.organizationId },
    });

    if (!isEnabled) {
      throw new NotFoundException('Feature not enabled');
    }
  }
}
