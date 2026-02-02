import { Readable } from 'node:stream';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CacheService,
  ExternalApiAccessible,
  FeatureFlagsService,
  ParseSlugEnvironmentIdPipe,
  Redis,
  RequirePermissions,
  UserSession,
} from '@novu/application-generic';
import { AiChatEntity } from '@novu/dal';
import {
  AiResourceTypeEnum,
  ApiRateLimitCategoryEnum,
  FeatureFlagsKeysEnum,
  PermissionsEnum,
  UserSessionData,
} from '@novu/shared';
import {
  createUIMessageStream,
  generateId,
  pipeUIMessageStreamToResponse,
  UI_MESSAGE_STREAM_HEADERS,
  UIMessage,
} from 'ai';
import { Response } from 'express';
import { createResumableStreamContext } from 'resumable-stream/ioredis';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses } from '../shared/framework/response.decorator';
import { CreateChatDto, StreamGenerationDto, WorkflowSuggestionDto } from './dtos';
import { AiAgentFactory } from './services';
import { GetChatCommand, GetChatUseCase } from './usecases/get-chat';
import { GetLatestChatCommand, GetLatestChatUseCase } from './usecases/get-latest-chat';
import { GetSuggestionsUseCase } from './usecases/get-suggestions';
import { StreamGenerationCommand } from './usecases/stream-generation';
import { UpsertChatCommand, UpsertChatUseCase } from './usecases/upsert-chat';

@ApiExcludeController()
@Controller({ path: '/ai', version: '2' })
@UseInterceptors(ClassSerializerInterceptor)
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@RequireAuthentication()
@ApiTags('AI')
@ApiCommonResponses()
export class AiController {
  constructor(
    private readonly getSuggestionsUseCase: GetSuggestionsUseCase,
    private readonly getChatUseCase: GetChatUseCase,
    private readonly upsertChatUseCase: UpsertChatUseCase,
    private readonly getLatestChatUseCase: GetLatestChatUseCase,
    private readonly aiAgentFactory: AiAgentFactory,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly cacheService: CacheService
  ) {}

  @Get('/workflow-suggestions')
  @ApiOperation({
    summary: 'Get workflow suggestions',
    description: 'Returns a list of predefined workflow suggestions to help users get started',
  })
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
  @ExternalApiAccessible()
  async getSuggestions(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData
  ): Promise<WorkflowSuggestionDto[]> {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_AI_WORKFLOW_GENERATION_ENABLED,
      defaultValue: false,
      organization: { _id: user.organizationId },
    });

    if (!isEnabled) {
      throw new NotFoundException('Feature not enabled');
    }

    return this.getSuggestionsUseCase.execute();
  }

  @Post('/chat')
  @ApiOperation({
    summary: 'Create chat',
    description: 'Create a chat for a given resource type and resource ID',
  })
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  @ExternalApiAccessible()
  async chat(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Body() dto: CreateChatDto
  ): Promise<AiChatEntity> {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_AI_WORKFLOW_GENERATION_ENABLED,
      defaultValue: false,
      organization: { _id: user.organizationId },
    });

    if (!isEnabled) {
      throw new NotFoundException('Feature not enabled');
    }

    return this.upsertChatUseCase.execute(
      UpsertChatCommand.create({
        user,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
      })
    );
  }

  @Post('/chat-stream')
  @ApiOperation({
    summary: 'Stream chat messages',
    description: 'Stream chat messages with streaming responses. Resource type determines the agent used.',
  })
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  @ExternalApiAccessible()
  async chatStream(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Body() dto: StreamGenerationDto,
    @Res() res: Response
  ): Promise<void> {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_AI_WORKFLOW_GENERATION_ENABLED,
      defaultValue: false,
      organization: { _id: user.organizationId },
    });
    if (!isEnabled) {
      throw new NotFoundException('Feature not enabled');
    }

    const redisClient = this.cacheService.client;
    if (!redisClient) {
      throw new Error('Redis client not found');
    }

    // The chat should be pre-created before streaming the messages
    const chat = await this.getChatUseCase.execute(
      GetChatCommand.create({
        id: dto.id,
        user,
      })
    );

    const allMessages: UIMessage[] = [...((chat.messages as UIMessage[]) ?? []), dto.message];

    // Clear any previous active stream and save the chat messages
    await this.upsertChatUseCase.execute(
      UpsertChatCommand.create({
        id: dto.id,
        messages: allMessages,
        activeStreamId: null,
        user,
      })
    );

    const agent = this.aiAgentFactory.getAgent(dto.resourceType);
    const command = StreamGenerationCommand.create({
      user,
      messages: allMessages,
      chatId: dto.id,
    });

    res.setHeader('X-Accel-Buffering', 'no');

    const stream = createUIMessageStream({
      originalMessages: allMessages,
      generateId,
      onFinish: async ({ messages }) => {
        // Clear the active stream when finished
        await this.upsertChatUseCase.execute(
          UpsertChatCommand.create({ id: dto.id, messages, activeStreamId: null, user })
        );
      },
      execute: async ({ writer }) => {
        await agent.execute({ writer, command });
      },
    });

    pipeUIMessageStreamToResponse({
      stream,
      response: res,
      consumeSseStream: async ({ stream: sseStream }) => {
        const streamId = generateId();

        // Create a resumable stream from the SSE stream
        // Pass the Redis client directly - resumable-stream supports ioredis clients
        const streamContext = createResumableStreamContext({
          waitUntil: null,
          publisher: redisClient as Redis,
          subscriber: redisClient.duplicate() as Redis,
        });
        await streamContext.createNewResumableStream(streamId, () => sseStream);

        // Update the chat with the active stream ID
        await this.upsertChatUseCase.execute(UpsertChatCommand.create({ id: dto.id, activeStreamId: streamId, user }));
      },
    });
  }

  @Get('/chat/:id/stream')
  @ApiOperation({
    summary: 'Get active chat stream',
    description: 'Get the active chat stream for a given chat ID',
  })
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
  @ExternalApiAccessible()
  async getChat(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Param('id') id: string,
    @Res() res: Response
  ) {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_AI_WORKFLOW_GENERATION_ENABLED,
      defaultValue: false,
      organization: { _id: user.organizationId },
    });
    if (!isEnabled) {
      throw new NotFoundException('Feature not enabled');
    }

    const redisClient = this.cacheService.client;
    if (!redisClient) {
      throw new Error('Redis client not found');
    }

    const chat = await this.getChatUseCase.execute(
      GetChatCommand.create({
        id,
        user,
      })
    );

    if (chat.activeStreamId == null) {
      res.status(204).end();

      return;
    }

    const streamContext = createResumableStreamContext({
      waitUntil: null,
      publisher: redisClient as Redis,
      subscriber: redisClient.duplicate() as Redis,
    });

    const stream = await streamContext.resumeExistingStream(chat.activeStreamId);

    if (!stream) {
      res.status(204).end();

      return;
    }

    for (const [key, value] of Object.entries(UI_MESSAGE_STREAM_HEADERS)) {
      res.setHeader(key, value);
    }
    res.setHeader('X-Accel-Buffering', 'no');

    Readable.fromWeb(stream as any).pipe(res);
  }

  @Get('/chat/:resourceType/:resourceId/latest')
  @ApiOperation({
    summary: 'Get latest chat for the resource',
    description: 'Get the latest chat for a given resource type and resource ID',
  })
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
  @ExternalApiAccessible()
  async getLatestChat(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Param('resourceType') resourceType: AiResourceTypeEnum,
    @Param('resourceId') resourceId: string
  ) {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_AI_WORKFLOW_GENERATION_ENABLED,
      defaultValue: false,
      organization: { _id: user.organizationId },
    });
    if (!isEnabled) {
      throw new NotFoundException('Feature not enabled');
    }

    const chat = await this.getLatestChatUseCase.execute(
      GetLatestChatCommand.create({
        resourceType,
        resourceId,
        user,
      })
    );

    return chat;
  }
}
