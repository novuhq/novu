import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
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
  @ApiResponse(ListTopicsResponseDto)
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
  @ApiResponse(TopicResponseDto, 201)
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
  @ApiResponse(TopicResponseDto)
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
  @ApiResponse(TopicResponseDto)
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
  @ApiResponse(DeleteTopicResponseDto)
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
  @ApiResponse(ListTopicSubscriptionsResponseDto)
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
  @ApiOperation({ summary: 'Create topic subscriptions' })
  @ApiParam({ name: 'topicKey', description: 'The key identifier of the topic', type: String })
  @HttpCode(HttpStatus.OK)
  @ApiResponse(CreateTopicSubscriptionsResponseDto)
  async createTopicSubscriptions(
    @UserSession() user: UserSessionData,
    @Param('topicKey') topicKey: string,
    @Body() body: CreateTopicSubscriptionsRequestDto
  ): Promise<CreateTopicSubscriptionsResponseDto> {
    return await this.createTopicSubscriptionsUsecase.execute(
      CreateTopicSubscriptionsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        topicKey,
        subscriberIds: body.subscriberIds,
      })
    );
  }

  @Delete('/:topicKey/subscriptions')
  @UserAuthentication()
  @ExternalApiAccessible()
  @SdkGroupName('Topics.Subscriptions')
  @SdkMethodName('delete')
  @ApiOperation({ summary: 'Delete topic subscriptions' })
  @ApiParam({ name: 'topicKey', description: 'The key identifier of the topic', type: String })
  @HttpCode(HttpStatus.OK)
  @ApiResponse(DeleteTopicSubscriptionsResponseDto)
  async deleteTopicSubscriptions(
    @UserSession() user: UserSessionData,
    @Param('topicKey') topicKey: string,
    @Body() body: DeleteTopicSubscriptionsRequestDto
  ): Promise<DeleteTopicSubscriptionsResponseDto> {
    await this.deleteTopicSubscriptionsUsecase.execute(
      DeleteTopicSubscriptionsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        topicKey,
        subscriberIds: body.subscriberIds,
      })
    );

    return {
      acknowledged: true,
    };
  }
}
