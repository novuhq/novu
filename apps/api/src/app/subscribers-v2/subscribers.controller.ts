import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  CreateOrUpdateSubscriberCommand,
  CreateOrUpdateSubscriberUseCase,
  ExternalApiAccessible,
  RequirePermissions,
  UserSession,
} from '@novu/application-generic';
import {
  ApiRateLimitCategoryEnum,
  DirectionEnum,
  PermissionsEnum,
  SubscriberCustomData,
  UserSessionData,
} from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { GetPreferencesResponseDto } from '../inbox/dtos/get-preferences-response.dto';
import { BulkUpdatePreferencesCommand } from '../inbox/usecases/bulk-update-preferences/bulk-update-preferences.command';
import { BulkUpdatePreferences } from '../inbox/usecases/bulk-update-preferences/bulk-update-preferences.usecase';
import { ThrottlerCategory } from '../rate-limiting/guards/throttler.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { SdkGroupName, SdkMethodName } from '../shared/framework/swagger/sdk.decorators';
import { SubscriberResponseDto } from '../subscribers/dtos';
import {
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
} from '../subscribers/usecases/get-subscriber-global-preference';
import { ListSubscriberSubscriptionsQueryDto } from '../topics-v2/dtos/list-subscriber-subscriptions-query.dto';
import { ListTopicSubscriptionsResponseDto } from '../topics-v2/dtos/list-topic-subscriptions-response.dto';
import { ListSubscriberSubscriptionsCommand } from '../topics-v2/usecases/list-subscriber-subscriptions/list-subscriber-subscriptions.command';
import { ListSubscriberSubscriptionsUseCase } from '../topics-v2/usecases/list-subscriber-subscriptions/list-subscriber-subscriptions.usecase';
import { BulkUpdateSubscriberPreferencesDto } from './dtos/bulk-update-subscriber-preferences.dto';
import { CreateSubscriberRequestDto } from './dtos/create-subscriber.dto';
import { GetSubscriberPreferencesDto } from './dtos/get-subscriber-preferences.dto';
import { GetSubscriberPreferencesRequestDto } from './dtos/get-subscriber-preferences-request.dto';
import { ListSubscribersQueryDto } from './dtos/list-subscribers-query.dto';
import { ListSubscribersResponseDto } from './dtos/list-subscribers-response.dto';
import { PatchSubscriberRequestDto } from './dtos/patch-subscriber.dto';
import { PatchSubscriberPreferencesDto } from './dtos/patch-subscriber-preferences.dto';
import { RemoveSubscriberResponseDto } from './dtos/remove-subscriber.dto';
import { SubscriberGlobalPreferenceDto } from './dtos/subscriber-global-preference.dto';
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
@RequireAuthentication()
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
    private getSubscriberGlobalPreference: GetSubscriberGlobalPreference
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
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        avatar: body.avatar,
        locale: body.locale,
        timezone: body.timezone,
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
        contextKeys: query.contextKeys,
      })
    );
  }

  @Get('/:subscriberId/preferences/global')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Retrieve subscriber global preference',
    description: `Retrieve subscriber global preference. This API returns all five global channels preferences and subscriber schedule.`,
  })
  @ApiResponse(SubscriberGlobalPreferenceDto)
  @SdkGroupName('Subscribers.Preferences')
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_READ)
  @SdkMethodName('globalPreference')
  @ApiExcludeEndpoint()
  async getGlobalPreference(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string
  ): Promise<SubscriberGlobalPreferenceDto> {
    const globalPreference = await this.getSubscriberGlobalPreference.execute(
      GetSubscriberGlobalPreferenceCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        subscriberId: subscriberId,
        includeInactiveChannels: false,
      })
    );

    return globalPreference.preference;
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
        context: body.context,
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
        schedule: body.schedule,
        context: body.context,
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
        contextKeys: query.contextKeys,
        limit: query.limit ? Number(query.limit) : 10,
        after: query.after,
        before: query.before,
        orderDirection: query.orderDirection === DirectionEnum.ASC ? 1 : -1,
        orderBy: query.orderBy || '_id',
        includeCursor: query.includeCursor,
      })
    );
  }
}
