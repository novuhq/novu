import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiRateLimitCategoryEnum, ExternalSubscriberId, TopicKey, UserSessionData } from '@novu/shared';

import {
  AddSubscribersRequestDto,
  CreateTopicRequestDto,
  CreateTopicResponseDto,
  FilterTopicsRequestDto,
  FilterTopicsResponseDto,
  GetTopicResponseDto,
  RemoveSubscribersRequestDto,
  RenameTopicRequestDto,
  RenameTopicResponseDto,
  TopicSubscriberDto,
} from './dtos';
import {
  AddSubscribersCommand,
  AddSubscribersUseCase,
  CreateTopicCommand,
  CreateTopicUseCase,
  DeleteTopicCommand,
  DeleteTopicUseCase,
  FilterTopicsCommand,
  FilterTopicsUseCase,
  GetTopicCommand,
  GetTopicSubscriberCommand,
  GetTopicSubscriberUseCase,
  GetTopicUseCase,
  RemoveSubscribersCommand,
  RemoveSubscribersUseCase,
  RenameTopicCommand,
  RenameTopicUseCase,
} from './use-cases';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import {
  ApiCommonResponses,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiResponse,
} from '../shared/framework/response.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import { SdkGroupName, SdkMethodName } from '../shared/framework/swagger/sdk.decorators';
import { AssignSubscriberToTopicDto } from './dtos/assignSubscriberToTopicDto';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/topics')
@UserAuthentication()
@ApiTags('Topics')
export class TopicsController {
  constructor(
    private addSubscribersUseCase: AddSubscribersUseCase,
    private createTopicUseCase: CreateTopicUseCase,
    private deleteTopicUseCase: DeleteTopicUseCase,
    private filterTopicsUseCase: FilterTopicsUseCase,
    private getTopicSubscriberUseCase: GetTopicSubscriberUseCase,
    private getTopicUseCase: GetTopicUseCase,
    private removeSubscribersUseCase: RemoveSubscribersUseCase,
    private renameTopicUseCase: RenameTopicUseCase
  ) {}

  @Post('')
  @ExternalApiAccessible()
  @ApiResponse(CreateTopicResponseDto, 201)
  @ApiOperation({ summary: 'Topic creation', description: 'Create a topic' })
  async createTopic(
    @UserSession() user: UserSessionData,
    @Body() body: CreateTopicRequestDto
  ): Promise<CreateTopicResponseDto> {
    const topic = await this.createTopicUseCase.execute(
      CreateTopicCommand.create({
        environmentId: user.environmentId,
        key: body.key,
        name: body.name,
        organizationId: user.organizationId,
      })
    );

    return {
      _id: topic._id,
      key: topic.key,
    };
  }

  @Post('/:topicKey/subscribers')
  @ExternalApiAccessible()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AssignSubscriberToTopicDto })
  @ApiOperation({ summary: 'Subscribers addition', description: 'Add subscribers to a topic by key' })
  @ApiParam({ name: 'topicKey', description: 'The topic key', type: String, required: true })
  @SdkGroupName('Topics.Subscribers')
  @SdkMethodName('assign')
  async assign(
    @UserSession() user: UserSessionData,
    @Param('topicKey') topicKey: TopicKey,
    @Body() body: AddSubscribersRequestDto
  ): Promise<AssignSubscriberToTopicDto> {
    const { existingExternalSubscribers, nonExistingExternalSubscribers } = await this.addSubscribersUseCase.execute(
      AddSubscribersCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscribers: body.subscribers,
        topicKey,
      })
    );

    return {
      succeeded: existingExternalSubscribers,
      ...(nonExistingExternalSubscribers.length > 0 && {
        failed: {
          notFound: nonExistingExternalSubscribers,
        },
      }),
    };
  }

  @Get('/:topicKey/subscribers/:externalSubscriberId')
  @ExternalApiAccessible()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check topic subscriber', description: 'Check if a subscriber belongs to a certain topic' })
  @ApiParam({ name: 'topicKey', description: 'The topic key', type: String, required: true })
  @ApiParam({ name: 'externalSubscriberId', description: 'The external subscriber id', type: String, required: true })
  @SdkGroupName('Topics.Subscribers')
  @ApiOkResponse({ type: TopicSubscriberDto })
  async getTopicSubscriber(
    @UserSession() user: UserSessionData,
    @Param('topicKey') topicKey: TopicKey,
    @Param('externalSubscriberId') externalSubscriberId: ExternalSubscriberId
  ): Promise<TopicSubscriberDto> {
    return await this.getTopicSubscriberUseCase.execute(
      GetTopicSubscriberCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        externalSubscriberId,
        topicKey,
      })
    );
  }

  @Post('/:topicKey/subscribers/removal')
  @ExternalApiAccessible()
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Subscribers removal', description: 'Remove subscribers from a topic' })
  @ApiParam({ name: 'topicKey', description: 'The topic key', type: String, required: true })
  @SdkGroupName('Topics.Subscribers')
  @SdkMethodName('remove')
  async removeSubscribers(
    @UserSession() user: UserSessionData,
    @Param('topicKey') topicKey: TopicKey,
    @Body() body: RemoveSubscribersRequestDto
  ): Promise<void> {
    await this.removeSubscribersUseCase.execute(
      RemoveSubscribersCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        topicKey,
        subscribers: body.subscribers,
      })
    );
  }

  @Get('')
  @ExternalApiAccessible()
  @ApiOkResponse({
    type: FilterTopicsResponseDto,
  })
  @ApiOperation({
    summary: 'Get topic list filtered ',
    description:
      'Returns a list of topics that can be paginated using the `page` query ' +
      'parameter and filtered by the topic key with the `key` query parameter',
  })
  async listTopics(
    @UserSession() user: UserSessionData,
    @Query() query?: FilterTopicsRequestDto
  ): Promise<FilterTopicsResponseDto> {
    return await this.filterTopicsUseCase.execute(
      FilterTopicsCommand.create({
        environmentId: user.environmentId,
        key: query?.key,
        organizationId: user.organizationId,
        page: query?.page,
        pageSize: query?.pageSize,
      })
    );
  }

  @Delete('/:topicKey')
  @ExternalApiAccessible()
  @ApiNoContentResponse({
    description: 'The topic has been deleted correctly',
  })
  @ApiParam({ name: 'topicKey', description: 'The topic key', type: String, required: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete topic', description: 'Delete a topic by its topic key if it has no subscribers' })
  async deleteTopic(@UserSession() user: UserSessionData, @Param('topicKey') topicKey: TopicKey): Promise<void> {
    await this.deleteTopicUseCase.execute(
      DeleteTopicCommand.create({
        environmentId: user.environmentId,
        topicKey,
        organizationId: user.organizationId,
      })
    );
  }

  @Get('/:topicKey')
  @ExternalApiAccessible()
  @ApiResponse(GetTopicResponseDto)
  @ApiOperation({ summary: 'Get topic', description: 'Get a topic by its topic key' })
  @ApiParam({ name: 'topicKey', description: 'The topic key', type: String, required: true })
  async getTopic(
    @UserSession() user: UserSessionData,
    @Param('topicKey') topicKey: TopicKey
  ): Promise<GetTopicResponseDto> {
    return await this.getTopicUseCase.execute(
      GetTopicCommand.create({
        environmentId: user.environmentId,
        topicKey,
        organizationId: user.organizationId,
      })
    );
  }

  @Patch('/:topicKey')
  @ExternalApiAccessible()
  @ApiResponse(RenameTopicResponseDto)
  @ApiOperation({ summary: 'Rename a topic', description: 'Rename a topic by providing a new name' })
  @ApiParam({ name: 'topicKey', description: 'The topic key', type: String, required: true })
  @SdkMethodName('rename')
  async renameTopic(
    @UserSession() user: UserSessionData,
    @Param('topicKey') topicKey: TopicKey,
    @Body() body: RenameTopicRequestDto
  ): Promise<RenameTopicResponseDto> {
    return await this.renameTopicUseCase.execute(
      RenameTopicCommand.create({
        environmentId: user.environmentId,
        topicKey,
        name: body.name,
        organizationId: user.organizationId,
      })
    );
  }
}
