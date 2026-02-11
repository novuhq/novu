import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ExternalApiAccessible, RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { Response } from 'express';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards/throttler.decorator';
import { DirectionEnum } from '../shared/dtos/base-responses';
import { SubscriptionDetailsResponseDto } from '../shared/dtos/subscription-details-response.dto';
import {
  GroupPreferenceFilterDto,
  WorkflowPreferenceRequestDto,
} from '../shared/dtos/subscriptions/create-subscriptions.dto';
import {
  CreateSubscriptionsResponseDto,
  SubscriptionResponseDto,
} from '../shared/dtos/subscriptions/create-subscriptions-response.dto';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { SdkGroupName, SdkMethodName } from '../shared/framework/swagger/sdk.decorators';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateSubscriptionsCommand, CreateSubscriptionsUsecase } from '../subscriptions/usecases/create-subscriptions';
import { GetSubscriptionCommand } from '../subscriptions/usecases/get-subscription/get-subscription.command';
import { GetSubscription } from '../subscriptions/usecases/get-subscription/get-subscription.usecase';
import { UpdateSubscriptionCommand, UpdateSubscriptionUsecase } from '../subscriptions/usecases/update-subscription';
import { CreateTopicSubscriptionsRequestDto } from './dtos/create-topic-subscriptions.dto';
import { CreateUpdateTopicRequestDto } from './dtos/create-update-topic.dto';
import { DeleteTopicResponseDto } from './dtos/delete-topic-response.dto';
import {
  DeleteTopicSubscriberIdentifierDto,
  DeleteTopicSubscriptionsRequestDto,
} from './dtos/delete-topic-subscriptions.dto';
import { DeleteTopicSubscriptionsResponseDto } from './dtos/delete-topic-subscriptions-response.dto';
import { ListTopicSubscriptionsQueryDto } from './dtos/list-topic-subscriptions-query.dto';
import { ListTopicSubscriptionsResponseDto } from './dtos/list-topic-subscriptions-response.dto';
import { ListTopicsQueryDto } from './dtos/list-topics-query.dto';
import { ListTopicsResponseDto } from './dtos/list-topics-response.dto';
import { TopicResponseDto } from './dtos/topic-response.dto';
import { UpdateTopicRequestDto } from './dtos/update-topic.dto';
import { UpdateTopicSubscriptionRequestDto } from './dtos/update-topic-subscription.dto';
import { DeleteTopicCommand } from './usecases/delete-topic/delete-topic.command';
import { DeleteTopicUseCase } from './usecases/delete-topic/delete-topic.usecase';
import { DeleteTopicSubscriptionsCommand } from './usecases/delete-topic-subscriptions/delete-topic-subscriptions.command';
import { DeleteTopicSubscriptionsUsecase } from './usecases/delete-topic-subscriptions/delete-topic-subscriptions.usecase';
import { GetTopicCommand } from './usecases/get-topic/get-topic.command';
import { GetTopicUseCase } from './usecases/get-topic/get-topic.usecase';
import { ListTopicSubscriptionsCommand } from './usecases/list-topic-subscriptions/list-topic-subscriptions.command';
import { ListTopicSubscriptionsUseCase } from './usecases/list-topic-subscriptions/list-topic-subscriptions.usecase';
import { ListTopicsCommand } from './usecases/list-topics/list-topics.command';
import { ListTopicsUseCase } from './usecases/list-topics/list-topics.usecase';
import { UpdateTopicCommand } from './usecases/update-topic/update-topic.command';
import { UpdateTopicUseCase } from './usecases/update-topic/update-topic.usecase';
import { UpsertTopicCommand } from './usecases/upsert-topic/upsert-topic.command';
import { UpsertTopicUseCase } from './usecases/upsert-topic/upsert-topic.usecase';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@Controller({ path: '/topics', version: '2' })
@UseInterceptors(ClassSerializerInterceptor)
@RequireAuthentication()
@ApiTags('Topics')
@SdkGroupName('Topics')
@ApiCommonResponses()
export class TopicsController {
  constructor(
    private listTopicsUsecase: ListTopicsUseCase,
    private upsertTopicUsecase: UpsertTopicUseCase,
    private getTopicUsecase: GetTopicUseCase,
    private updateTopicUsecase: UpdateTopicUseCase,
    private deleteTopicUsecase: DeleteTopicUseCase,
    private listTopicSubscriptionsUsecase: ListTopicSubscriptionsUseCase,
    private createSubscriptionsUsecase: CreateSubscriptionsUsecase,
    private deleteTopicSubscriptionsUsecase: DeleteTopicSubscriptionsUsecase,
    private updateSubscriptionUsecase: UpdateSubscriptionUsecase,
    private getSubscriptionUsecase: GetSubscription
  ) {}

  @Get('')
  @ExternalApiAccessible()
  @SdkMethodName('list')
  @ApiOperation({
    summary: 'List all topics',
    description: `This api returns a paginated list of topics.
    Topics can be filtered by **key**, **name**, or **includeCursor** to paginate through the list. 
    Checkout all available filters in the query section.`,
  })
  @ApiResponse(ListTopicsResponseDto)
  @RequirePermissions(PermissionsEnum.TOPIC_READ)
  async listTopics(
    @UserSession() user: UserSessionData,
    @Query() query: ListTopicsQueryDto
  ): Promise<ListTopicsResponseDto> {
    return await this.listTopicsUsecase.execute(
      ListTopicsCommand.create({
        user,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        limit: Number(query.limit || '10'),
        after: query.after,
        before: query.before,
        orderDirection: query.orderDirection || DirectionEnum.DESC,
        orderBy: query.orderBy || '_id',
        key: query.key,
        name: query.name,
        includeCursor: query.includeCursor,
      })
    );
  }

  @Post('')
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Create a topic',
    description: `Creates a new topic if it does not exist, or updates an existing topic if it already exists. Use ?failIfExists=true to prevent updates.`,
  })
  @ApiResponse(TopicResponseDto, 201)
  @ApiResponse(TopicResponseDto, 200)
  @ApiResponse(TopicResponseDto, 409, false, false, {
    description: 'Topic already exists (when query param failIfExists=true)',
  })
  @ApiQuery({
    name: 'failIfExists',
    required: false,
    type: Boolean,
    description: 'If true, the request will fail if a topic with the same key already exists',
  })
  @SdkMethodName('create')
  @RequirePermissions(PermissionsEnum.TOPIC_WRITE)
  async upsertTopic(
    @UserSession() user: UserSessionData,
    @Body() body: CreateUpdateTopicRequestDto,
    @Res({ passthrough: true }) response: Response,
    @Query('failIfExists') failIfExists?: boolean
  ): Promise<TopicResponseDto> {
    const result = await this.upsertTopicUsecase.execute(
      UpsertTopicCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        key: body.key,
        name: body.name,
        failIfExists,
      })
    );

    if (result.created) {
      response.status(HttpStatus.CREATED);
    }

    return result.topic;
  }

  @Get('/:topicKey')
  @ExternalApiAccessible()
  @SdkMethodName('get')
  @ApiOperation({
    summary: 'Retrieve a topic',
    description: `Retrieve a topic by its unique key identifier **topicKey**`,
  })
  @ApiParam({ name: 'topicKey', description: 'The key identifier of the topic', type: String })
  @ApiResponse(TopicResponseDto, 200)
  @RequirePermissions(PermissionsEnum.TOPIC_READ)
  async getTopic(@UserSession() user: UserSessionData, @Param('topicKey') topicKey: string): Promise<TopicResponseDto> {
    return await this.getTopicUsecase.execute(
      GetTopicCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        topicKey,
      })
    );
  }

  @Patch('/:topicKey')
  @ExternalApiAccessible()
  @SdkMethodName('update')
  @ApiOperation({
    summary: 'Update a topic',
    description: `Update a topic name by its unique key identifier **topicKey**`,
  })
  @ApiParam({ name: 'topicKey', description: 'The key identifier of the topic', type: String })
  @ApiResponse(TopicResponseDto, 200)
  @RequirePermissions(PermissionsEnum.TOPIC_WRITE)
  async updateTopic(
    @UserSession() user: UserSessionData,
    @Param('topicKey') topicKey: string,
    @Body() body: UpdateTopicRequestDto
  ): Promise<TopicResponseDto> {
    return await this.updateTopicUsecase.execute(
      UpdateTopicCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        topicKey,
        name: body.name,
      })
    );
  }

  @Delete('/:topicKey')
  @ExternalApiAccessible()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a topic',
    description: `Delete a topic by its unique key identifier **topicKey**. 
    This action is irreversible and will remove all subscriptions to the topic.`,
  })
  @ApiParam({ name: 'topicKey', description: 'The key identifier of the topic', type: String })
  @ApiResponse(DeleteTopicResponseDto, 200, false, true, {
    description: 'Topic deleted successfully',
  })
  @RequirePermissions(PermissionsEnum.TOPIC_WRITE)
  async deleteTopic(
    @UserSession() user: UserSessionData,
    @Param('topicKey') topicKey: string
  ): Promise<DeleteTopicResponseDto> {
    await this.deleteTopicUsecase.execute(
      DeleteTopicCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        topicKey,
        force: true,
      })
    );

    return {
      acknowledged: true,
    };
  }

  @Get('/:topicKey/subscriptions')
  @ExternalApiAccessible()
  @SdkGroupName('Topics.Subscriptions')
  @ApiOperation({
    summary: `List topic subscriptions`,
    description: `List all subscriptions of subscribers for a topic.
    Checkout all available filters in the query section.`,
  })
  @ApiParam({ name: 'topicKey', description: 'The key identifier of the topic', type: String })
  @ApiResponse(ListTopicSubscriptionsResponseDto, 200)
  @RequirePermissions(PermissionsEnum.TOPIC_READ)
  async listTopicSubscriptions(
    @UserSession() user: UserSessionData,
    @Param('topicKey') topicKey: string,
    @Query() query: ListTopicSubscriptionsQueryDto
  ): Promise<ListTopicSubscriptionsResponseDto> {
    return await this.listTopicSubscriptionsUsecase.execute(
      ListTopicSubscriptionsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        topicKey,
        subscriberId: query.subscriberId,
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

  @Post('/:topicKey/subscriptions')
  @ExternalApiAccessible()
  @SdkGroupName('Topics.Subscriptions')
  @SdkMethodName('create')
  @ApiOperation({
    summary: 'Create topic subscriptions',
    description: `This api will create subscription for subscriberIds for a topic. 
      Its like subscribing to a common interest group. if topic does not exist, it will be created.`,
  })
  @ApiParam({ name: 'topicKey', description: 'The key identifier of the topic', type: String })
  @ApiResponse(CreateSubscriptionsResponseDto, 201, false, true, {
    description: 'Subscriptions created successfully',
  })
  @RequirePermissions(PermissionsEnum.TOPIC_WRITE)
  async createTopicSubscriptions(
    @UserSession() user: UserSessionData,
    @Param('topicKey') topicKey: string,
    @Body() body: CreateTopicSubscriptionsRequestDto
  ): Promise<CreateSubscriptionsResponseDto> {
    const result = await this.createSubscriptionsUsecase.execute(
      CreateSubscriptionsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        topicKey,
        subscriptions: this.mapSubscriptions(body.subscriptions || body.subscriberIds || []),
        name: body.name,
        preferences: body.preferences ? this.convertPreferencesToGroupFilters(body.preferences) : undefined,
        context: body.context,
      })
    );

    const typeSafeResult: CreateSubscriptionsResponseDto = {
      data: result.data.map((item) => ({
        ...item,
        createdAt: item.createdAt || '',
        updatedAt: item.updatedAt || '',
        contextKeys: item.contextKeys,
      })),
      meta: result.meta,
      errors: result.errors,
    };

    if (typeSafeResult.meta.failed > 0 && typeSafeResult.meta.successful === 0) {
      // All subscriptions failed but with valid request format
      throw new HttpException(typeSafeResult, HttpStatus.BAD_REQUEST);
    }

    return typeSafeResult;
  }

  @Delete('/:topicKey/subscriptions')
  @ExternalApiAccessible()
  @SdkGroupName('Topics.Subscriptions')
  @SdkMethodName('delete')
  @ApiOperation({
    summary: 'Delete topic subscriptions',
    description: 'Delete subscriptions for subscriberIds for a topic.',
  })
  @ApiParam({ name: 'topicKey', description: 'The key identifier of the topic', type: String })
  @ApiResponse(DeleteTopicSubscriptionsResponseDto, 200, false, false, {
    description: 'Subscriptions deleted successfully',
  })
  @RequirePermissions(PermissionsEnum.TOPIC_WRITE)
  async deleteTopicSubscriptions(
    @UserSession() user: UserSessionData,
    @Param('topicKey') topicKey: string,
    @Body() body: DeleteTopicSubscriptionsRequestDto
  ): Promise<DeleteTopicSubscriptionsResponseDto> {
    const result = await this.deleteTopicSubscriptionsUsecase.execute(
      DeleteTopicSubscriptionsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        topicKey,
        subscriptions: this.mapDeleteSubscriptions(body.subscriptions || body.subscriberIds || []),
      })
    );

    // Ensure createdAt and updatedAt are always strings to match SubscriptionDto
    const typeSafeResult: DeleteTopicSubscriptionsResponseDto = {
      data: result.data.map((item) => ({
        ...item,
        createdAt: item.createdAt || '',
        updatedAt: item.updatedAt || '',
      })),
      meta: result.meta,
      errors: result.errors,
    };

    if (typeSafeResult.meta.failed > 0 && typeSafeResult.meta.successful === 0) {
      // All subscriptions failed but with valid request format
      throw new HttpException(typeSafeResult, HttpStatus.BAD_REQUEST);
    }

    // All subscriptions were successfully deleted
    return typeSafeResult;
  }

  @Get('/:topicKey/subscriptions/:identifier')
  @ExternalApiAccessible()
  @SdkGroupName('Topics.Subscriptions')
  @SdkMethodName('getSubscription')
  @ApiOperation({
    summary: 'Retrieve a topic subscription',
    description: `Retrieve a subscription by its unique identifier for a topic.`,
  })
  @ApiParam({ name: 'topicKey', description: 'The key identifier of the topic', type: String })
  @ApiParam({
    name: 'identifier',
    description: 'The unique identifier of the subscription',
    type: String,
  })
  @ApiResponse(SubscriptionDetailsResponseDto, 200)
  @RequirePermissions(PermissionsEnum.TOPIC_READ)
  async getTopicSubscription(
    @UserSession() user: UserSessionData,
    @Param('topicKey') topicKey: string,
    @Param('identifier') identifier: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<SubscriptionDetailsResponseDto | void> {
    const result = await this.getSubscriptionUsecase.execute(
      GetSubscriptionCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        topicKey,
        identifier,
      })
    );

    if (!result) {
      res.status(HttpStatus.NO_CONTENT);

      return;
    }

    return result;
  }

  @Patch('/:topicKey/subscriptions/:identifier')
  @ExternalApiAccessible()
  @SdkGroupName('Topics.Subscriptions')
  @SdkMethodName('update')
  @ApiOperation({
    summary: 'Update a topic subscription',
    description: `Update a subscription by its unique identifier for a topic. You can update the preferences and name associated with the subscription.`,
  })
  @ApiParam({ name: 'topicKey', description: 'The key identifier of the topic', type: String })
  @ApiParam({
    name: 'identifier',
    description: 'The unique identifier of the subscription',
    type: String,
  })
  @ApiResponse(SubscriptionResponseDto, 200)
  @RequirePermissions(PermissionsEnum.TOPIC_WRITE)
  async updateTopicSubscription(
    @UserSession() user: UserSessionData,
    @Param('topicKey') topicKey: string,
    @Param('identifier') identifier: string,
    @Body() body: UpdateTopicSubscriptionRequestDto
  ): Promise<SubscriptionResponseDto> {
    return await this.updateSubscriptionUsecase.execute(
      UpdateSubscriptionCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        topicKey,
        identifier,
        name: body.name,
        preferences: body.preferences ? this.convertPreferencesToGroupFilters(body.preferences) : undefined,
      })
    );
  }

  private mapSubscriptions(
    subscriptions: Array<string | { identifier: string; subscriberId: string; name?: string }>
  ): Array<{ identifier?: string; subscriberId: string; name?: string }> {
    return subscriptions.map((subscription) => {
      if (typeof subscription === 'string') {
        return {
          subscriberId: subscription,
        };
      }

      return subscription;
    });
  }

  private mapDeleteSubscriptions(
    subscriptions: Array<string | DeleteTopicSubscriberIdentifierDto>
  ): Array<{ identifier?: string; subscriberId?: string; name?: string }> {
    return subscriptions.map((subscription) => {
      if (typeof subscription === 'string') {
        return {
          subscriberId: subscription,
        };
      }

      return subscription;
    });
  }

  private convertPreferencesToGroupFilters(
    preferences: Array<string | WorkflowPreferenceRequestDto | GroupPreferenceFilterDto>
  ): Array<GroupPreferenceFilterDto> {
    return preferences.map((preference) => {
      if (typeof preference === 'string') {
        return {
          filter: {
            workflowIds: [preference],
          },
        };
      }

      if (this.isGroupPreferenceFilter(preference)) {
        return preference;
      }

      return {
        filter: {
          workflowIds: [preference.workflowId],
        },
        condition: preference.condition,
      };
    });
  }

  private isGroupPreferenceFilter(
    preference: WorkflowPreferenceRequestDto | GroupPreferenceFilterDto
  ): preference is GroupPreferenceFilterDto {
    return 'filter' in preference;
  }
}
