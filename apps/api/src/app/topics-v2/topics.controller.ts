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
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ExternalApiAccessible } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, UserSessionData } from '@novu/shared';
import { ThrottlerCategory } from '../rate-limiting/guards/throttler.decorator';
import { DirectionEnum } from '../shared/dtos/base-responses';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import { SdkGroupName, SdkMethodName } from '../shared/framework/swagger/sdk.decorators';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateTopicSubscriptionsResponseDto } from './dtos/create-topic-subscriptions-response.dto';
import { CreateTopicSubscriptionsRequestDto } from './dtos/create-topic-subscriptions.dto';
import { CreateUpdateTopicRequestDto } from './dtos/create-update-topic.dto';
import { DeleteTopicResponseDto } from './dtos/delete-topic-response.dto';
import { DeleteTopicSubscriptionsResponseDto } from './dtos/delete-topic-subscriptions-response.dto';
import { DeleteTopicSubscriptionsRequestDto } from './dtos/delete-topic-subscriptions.dto';
import { ListTopicSubscriptionsQueryDto } from './dtos/list-topic-subscriptions-query.dto';
import { ListTopicSubscriptionsResponseDto } from './dtos/list-topic-subscriptions-response.dto';
import { ListTopicsQueryDto } from './dtos/list-topics-query.dto';
import { ListTopicsResponseDto } from './dtos/list-topics-response.dto';
import { TopicResponseDto } from './dtos/topic-response.dto';
import { UpdateTopicRequestDto } from './dtos/update-topic.dto';
import { CreateTopicSubscriptionsCommand } from './usecases/create-topic-subscriptions/create-topic-subscriptions.command';
import { CreateTopicSubscriptionsUsecase } from './usecases/create-topic-subscriptions/create-topic-subscriptions.usecase';
import { DeleteTopicSubscriptionsCommand } from './usecases/delete-topic-subscriptions/delete-topic-subscriptions.command';
import { DeleteTopicSubscriptionsUsecase } from './usecases/delete-topic-subscriptions/delete-topic-subscriptions.usecase';
import { DeleteTopicCommand } from './usecases/delete-topic/delete-topic.command';
import { DeleteTopicUseCase } from './usecases/delete-topic/delete-topic.usecase';
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
    private createTopicSubscriptionsUsecase: CreateTopicSubscriptionsUsecase,
    private deleteTopicSubscriptionsUsecase: DeleteTopicSubscriptionsUsecase
  ) {}

  @Get('')
  @UserAuthentication()
  @ExternalApiAccessible()
  @SdkMethodName('list')
  @ApiOperation({ summary: 'Get topics list' })
  @ApiResponse(ListTopicsResponseDto, 200, true, true, {
    description: 'Successful retrieval of topics list',
  })
  async listTopics(
    @UserSession() user: UserSessionData,
    @Query() query: ListTopicsQueryDto
  ): Promise<ListTopicsResponseDto> {
    return await this.listTopicsUsecase.execute(
      ListTopicsCommand.create({
        user,
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
  @UserAuthentication()
  @ExternalApiAccessible()
  @SdkMethodName('create')
  @ApiOperation({
    summary: 'Create or update a topic',
    description: 'Creates a new topic if it does not exist, or updates an existing topic if it already exists',
  })
  @ApiResponse(TopicResponseDto, 201, false, true, {
    description: 'Topic successfully created/updated',
  })
  async upsertTopic(
    @UserSession() user: UserSessionData,
    @Body() body: CreateUpdateTopicRequestDto
  ): Promise<TopicResponseDto> {
    return await this.upsertTopicUsecase.execute(
      UpsertTopicCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        key: body.key,
        name: body.name,
      })
    );
  }

  @Get('/:topicKey')
  @UserAuthentication()
  @ExternalApiAccessible()
  @SdkMethodName('get')
  @ApiOperation({ summary: 'Get topic by key' })
  @ApiParam({ name: 'topicKey', description: 'The key identifier of the topic', type: String })
  @ApiResponse(TopicResponseDto, 200, false, true, {
    description: 'Topic found and returned successfully',
  })
  @ApiResponse(TopicResponseDto, 404, false, true, {
    description: 'Topic not found',
  })
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
  @UserAuthentication()
  @ExternalApiAccessible()
  @SdkMethodName('update')
  @ApiOperation({ summary: 'Update topic by key' })
  @ApiParam({ name: 'topicKey', description: 'The key identifier of the topic', type: String })
  @ApiResponse(TopicResponseDto, 200, false, true, {
    description: 'Topic updated successfully',
  })
  @ApiResponse(TopicResponseDto, 404, false, true, {
    description: 'Topic not found',
  })
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
  @UserAuthentication()
  @ExternalApiAccessible()
  @SdkMethodName('delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete topic by key' })
  @ApiParam({ name: 'topicKey', description: 'The key identifier of the topic', type: String })
  @ApiResponse(DeleteTopicResponseDto, 200, false, true, {
    description: 'Topic deleted successfully',
  })
  @ApiResponse(DeleteTopicResponseDto, 409, false, true, {
    description: 'Conflict - topic has subscribers and force flag not provided',
  })
  @ApiResponse(DeleteTopicResponseDto, 404, false, true, {
    description: 'Topic not found',
  })
  async deleteTopic(
    @UserSession() user: UserSessionData,
    @Param('topicKey') topicKey: string,
    @Query('force') force?: boolean
  ): Promise<DeleteTopicResponseDto> {
    await this.deleteTopicUsecase.execute(
      DeleteTopicCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        topicKey,
        force,
      })
    );

    return {
      acknowledged: true,
    };
  }

  @Get('/:topicKey/subscriptions')
  @UserAuthentication()
  @ExternalApiAccessible()
  @SdkGroupName('Topics.Subscriptions')
  @SdkMethodName('list')
  @ApiOperation({ summary: 'List topic subscriptions' })
  @ApiParam({ name: 'topicKey', description: 'The key identifier of the topic', type: String })
  @ApiResponse(ListTopicSubscriptionsResponseDto, 200, true, true, {
    description: 'Subscriptions listed successfully',
  })
  @ApiResponse(ListTopicSubscriptionsResponseDto, 404, true, true, {
    description: 'Topic not found',
  })
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
  @UserAuthentication()
  @ExternalApiAccessible()
  @SdkGroupName('Topics.Subscriptions')
  @SdkMethodName('subscribe')
  @ApiOperation({ summary: 'Create topic subscriptions, if the topic does not exist, it will be created.' })
  @ApiParam({ name: 'topicKey', description: 'The key identifier of the topic', type: String })
  @ApiResponse(CreateTopicSubscriptionsResponseDto, 200, false, true, {
    description: 'Subscriptions created successfully',
  })
  @ApiResponse(CreateTopicSubscriptionsResponseDto, 207, false, true, {
    description: 'Partial success - some subscriptions created, some failed',
  })
  @ApiResponse(CreateTopicSubscriptionsResponseDto, 404, false, true, {
    description: 'Topic not found',
  })
  async createTopicSubscriptions(
    @UserSession() user: UserSessionData,
    @Param('topicKey') topicKey: string,
    @Body() body: CreateTopicSubscriptionsRequestDto
  ): Promise<CreateTopicSubscriptionsResponseDto> {
    // Execute the use case to create topic subscriptions
    const result = await this.createTopicSubscriptionsUsecase.execute(
      CreateTopicSubscriptionsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        topicKey,
        subscriberIds: body.subscriberIds,
      })
    );

    const typeSafeResult: CreateTopicSubscriptionsResponseDto = {
      data: result.data.map((item) => ({
        ...item,
        createdAt: item.createdAt || '',
        updatedAt: item.updatedAt || '',
      })),
      meta: result.meta,
      errors: result.errors,
    };

    if (typeSafeResult.meta.failed > 0 && typeSafeResult.meta.successful > 0) {
      // Partial success - some subscriptions were created, some failed
      throw new HttpException(typeSafeResult, 207); // 207 Multi-Status
    } else if (typeSafeResult.meta.failed > 0 && typeSafeResult.meta.successful === 0) {
      // All subscriptions failed but with valid request format
      throw new HttpException(typeSafeResult, HttpStatus.BAD_REQUEST);
    }

    return typeSafeResult;
  }

  @Delete('/:topicKey/subscriptions')
  @UserAuthentication()
  @ExternalApiAccessible()
  @SdkGroupName('Topics.Subscriptions')
  @SdkMethodName('delete')
  @ApiOperation({ summary: 'Delete topic subscriptions' })
  @ApiParam({ name: 'topicKey', description: 'The key identifier of the topic', type: String })
  @ApiResponse(DeleteTopicSubscriptionsResponseDto, 200, false, true, {
    description: 'Subscriptions deleted successfully',
  })
  @ApiResponse(DeleteTopicSubscriptionsResponseDto, 207, false, true, {
    description: 'Partial success - some subscriptions deleted, some failed',
  })
  @ApiResponse(DeleteTopicSubscriptionsResponseDto, 404, false, true, {
    description: 'Topic not found',
  })
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
        subscriberIds: body.subscriberIds,
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

    // Determine the appropriate HTTP status code based on the result
    if (typeSafeResult.meta.failed > 0 && typeSafeResult.meta.successful > 0) {
      // Partial success - some subscriptions were deleted, some failed
      throw new HttpException(typeSafeResult, 207); // 207 Multi-Status
    } else if (typeSafeResult.meta.failed > 0 && typeSafeResult.meta.successful === 0) {
      // All subscriptions failed but with valid request format
      throw new HttpException(typeSafeResult, HttpStatus.BAD_REQUEST);
    }

    // All subscriptions were successfully deleted
    return typeSafeResult;
  }
}
