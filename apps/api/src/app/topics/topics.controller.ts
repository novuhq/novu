import {
  Body,
  Controller,
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
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiRateLimitCategoryEnum, ExternalSubscriberId, IJwtPayload, TopicKey } from '@novu/shared';

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
  GetTopicUseCase,
  GetTopicSubscriberCommand,
  GetTopicSubscriberUseCase,
  RemoveSubscribersCommand,
  RemoveSubscribersUseCase,
  RenameTopicCommand,
  RenameTopicUseCase,
} from './use-cases';
import { UserAuthGuard } from '../auth/framework/user.auth.guard';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import {
  ApiCommonResponses,
  ApiResponse,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
} from '../shared/framework/response.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/topics')
@ApiTags('Topics')
@UseGuards(UserAuthGuard)
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
    @UserSession() user: IJwtPayload,
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
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subscribers addition', description: 'Add subscribers to a topic by key' })
  async addSubscribers(
    @UserSession() user: IJwtPayload,
    @Param('topicKey') topicKey: TopicKey,
    @Body() body: AddSubscribersRequestDto
  ): Promise<{
    succeeded: ExternalSubscriberId[];
    failed?: {
      notFound?: ExternalSubscriberId[];
    };
  }> {
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
  async getTopicSubscriber(
    @UserSession() user: IJwtPayload,
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
  async removeSubscribers(
    @UserSession() user: IJwtPayload,
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
  @ApiQuery({
    name: 'key',
    type: String,
    description: 'Topic key',
    required: false,
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    description: 'Number of page for the pagination',
    required: false,
  })
  @ApiQuery({
    name: 'pageSize',
    type: Number,
    description: 'Size of page for the pagination',
    required: false,
  })
  @ApiOkResponse({
    type: FilterTopicsResponseDto,
  })
  @ApiOperation({
    summary: 'Filter topics',
    description:
      'Returns a list of topics that can be paginated using the `page` query parameter and filtered by the topic key with the `key` query parameter',
  })
  async filterTopics(
    @UserSession() user: IJwtPayload,
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
  @ApiNotFoundResponse({
    description: 'The topic with the key provided does not exist in the database so it can not be deleted.',
  })
  @ApiConflictResponse({
    description:
      'The topic you are trying to delete has subscribers assigned to it. Delete the subscribers before deleting the topic.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete topic', description: 'Delete a topic by its topic key if it has no subscribers' })
  async deleteTopic(@UserSession() user: IJwtPayload, @Param('topicKey') topicKey: TopicKey): Promise<void> {
    return await this.deleteTopicUseCase.execute(
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
  async getTopic(
    @UserSession() user: IJwtPayload,
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
  async renameTopic(
    @UserSession() user: IJwtPayload,
    @Param('topicKey') topicKey: TopicKey,
    @Body() body: RenameTopicRequestDto
  ): Promise<RenameTopicResponseDto> {
    return await this.renameTopicUseCase.execute(
      RenameTopicCommand.create({
        environmentId: user.environmentId,
        topicKey: topicKey,
        name: body.name,
        organizationId: user.organizationId,
      })
    );
  }
}
