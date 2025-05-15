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
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ExternalApiAccessible, RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, UserSessionData, PermissionsEnum } from '@novu/shared';
import { Response } from 'express';
import { ThrottlerCategory } from '../rate-limiting/guards/throttler.decorator';
import { DirectionEnum } from '../shared/dtos/base-responses';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
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
    private createTopicSubscriptionsUsecase: CreateTopicSubscriptionsUsecase,
    private deleteTopicSubscriptionsUsecase: DeleteTopicSubscriptionsUsecase
  ) {}

  @Get('')
  @ExternalApiAccessible()
  @SdkMethodName('list')
  @ApiOperation({ summary: 'Get topics list' })
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
    summary: 'Create or update a topic',
    description: 'Creates a new topic if it does not exist, or updates an existing topic if it already exists',
  })
  @ApiResponse(TopicResponseDto, 201)
  @ApiResponse(TopicResponseDto, 200)
  @SdkMethodName('create')
  @RequirePermissions(PermissionsEnum.TOPIC_CREATE)
  async upsertTopic(
    @UserSession() user: UserSessionData,
    @Body() body: CreateUpdateTopicRequestDto,
    @Res({ passthrough: true }) response: Response
  ): Promise<TopicResponseDto> {
    const result = await this.upsertTopicUsecase.execute(
      UpsertTopicCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        key: body.key,
        name: body.name,
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
  @ApiOperation({ summary: 'Get topic by key' })
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
  @ApiOperation({ summary: 'Update topic by key' })
  @ApiParam({ name: 'topicKey', description: 'The key identifier of the topic', type: String })
  @ApiResponse(TopicResponseDto, 200)
  @RequirePermissions(PermissionsEnum.TOPIC_UPDATE)
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
  @ApiOperation({ summary: 'Delete topic by key' })
  @ApiParam({ name: 'topicKey', description: 'The key identifier of the topic', type: String })
  @ApiResponse(DeleteTopicResponseDto, 200, false, true, {
    description: 'Topic deleted successfully',
  })
  @RequirePermissions(PermissionsEnum.TOPIC_DELETE)
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
  @ApiOperation({ summary: 'List topic subscriptions' })
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
  @ApiOperation({ summary: 'Create topic subscriptions, if the topic does not exist, it will be created.' })
  @ApiParam({ name: 'topicKey', description: 'The key identifier of the topic', type: String })
  @ApiResponse(CreateTopicSubscriptionsResponseDto, 201, false, true, {
    description: 'Subscriptions created successfully',
  })
  @RequirePermissions(PermissionsEnum.TOPIC_CREATE)
  async createTopicSubscriptions(
    @UserSession() user: UserSessionData,
    @Param('topicKey') topicKey: string,
    @Body() body: CreateTopicSubscriptionsRequestDto
  ): Promise<CreateTopicSubscriptionsResponseDto> {
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
  @ApiOperation({ summary: 'Delete topic subscriptions' })
  @ApiParam({ name: 'topicKey', description: 'The key identifier of the topic', type: String })
  @ApiResponse(DeleteTopicSubscriptionsResponseDto, 200, false, false, {
    description: 'Subscriptions deleted successfully',
  })
  @RequirePermissions(PermissionsEnum.TOPIC_DELETE)
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

    if (typeSafeResult.meta.failed > 0 && typeSafeResult.meta.successful === 0) {
      // All subscriptions failed but with valid request format
      throw new HttpException(typeSafeResult, HttpStatus.BAD_REQUEST);
    }

    // All subscriptions were successfully deleted
    return typeSafeResult;
  }
}
