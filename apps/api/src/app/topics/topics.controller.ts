import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ExternalSubscriberId, IJwtPayload, TopicKey } from '@novu/shared';

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
} from './dtos';
import {
  AddSubscribersCommand,
  AddSubscribersUseCase,
  CreateTopicCommand,
  CreateTopicUseCase,
  FilterTopicsCommand,
  FilterTopicsUseCase,
  GetTopicCommand,
  GetTopicUseCase,
  RemoveSubscribersCommand,
  RemoveSubscribersUseCase,
  RenameTopicCommand,
  RenameTopicUseCase,
} from './use-cases';

import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { AnalyticsService } from '../shared/services/analytics/analytics.service';
import { ANALYTICS_SERVICE } from '../shared/shared.module';

@Controller('topics')
@ApiTags('Topics')
@UseGuards(JwtAuthGuard)
export class TopicsController {
  constructor(
    private addSubscribersUseCase: AddSubscribersUseCase,
    private createTopicUseCase: CreateTopicUseCase,
    private filterTopicsUseCase: FilterTopicsUseCase,
    private getTopicUseCase: GetTopicUseCase,
    private removeSubscribersUseCase: RemoveSubscribersUseCase,
    private renameTopicUseCase: RenameTopicUseCase,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService
  ) {}

  @ExternalApiAccessible()
  @ApiCreatedResponse({
    type: CreateTopicResponseDto,
  })
  @Post('')
  @ApiOperation({ description: 'Create a topic' })
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

  @ExternalApiAccessible()
  @ApiNoContentResponse()
  @Post(':topicKey/subscribers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ description: 'Add subscribers to a topic by key' })
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

  @ExternalApiAccessible()
  @ApiNoContentResponse()
  @Post(':topicKey/subscribers/removal')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ description: 'Remove subscribers from a topic' })
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
  @Get('')
  @ApiOperation({ description: 'Filter topic resources' })
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

  @ExternalApiAccessible()
  @ApiOkResponse({
    type: GetTopicResponseDto,
  })
  @Get('/:topicKey')
  @ApiOperation({ description: 'Get a topic by its topic key' })
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

  @ExternalApiAccessible()
  @ApiOkResponse({
    type: RenameTopicResponseDto,
  })
  @Patch(':topicKey')
  @ApiOperation({ description: 'Rename a topic' })
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
