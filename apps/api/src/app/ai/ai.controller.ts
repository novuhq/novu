import { toBaseMessages } from '@ai-sdk/langchain';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CacheService,
  ExternalApiAccessible,
  FeatureFlagsService,
  ParseSlugEnvironmentIdPipe,
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
import { pipeUIMessageStreamToResponse, UIMessage } from 'ai';
import { Response } from 'express';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses } from '../shared/framework/response.decorator';
import { CreateChatDto, StreamGenerationDto, WorkflowSuggestionDto } from './dtos';
import { AiAgentFactory } from './services';
import { GetChatCommand, GetChatUseCase } from './usecases/get-chat';
import { GetLatestChatCommand, GetLatestChatUseCase } from './usecases/get-latest-chat';
import { GetSuggestionsUseCase } from './usecases/get-suggestions';
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
    description: 'Stream chat messages with streaming responses. Agent type determines the agent used.',
  })
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  @ExternalApiAccessible()
  async chatStream(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Body() dto: StreamGenerationDto,
    @Req() request: Request,
    @Res() response: Response
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

    const agentUsecase = this.aiAgentFactory.getAgentUseCase(dto.agentType);

    const chat = await this.getChatUseCase.execute(
      GetChatCommand.create({
        id: dto.id,
        user,
      })
    );

    const allMessages = (chat.messages as UIMessage[]) ?? [];
    const existingMessage = allMessages.find((m) => m.id === dto.message?.id);
    if (!existingMessage && dto.message) {
      allMessages.push(dto.message);
    }

    await this.upsertChatUseCase.execute(
      UpsertChatCommand.create({
        id: dto.id,
        messages: allMessages,
        user,
      })
    );

    const langchainMessages = await toBaseMessages(allMessages);

    const stream = await agentUsecase.execute({
      command: {
        user,
        signal: request.signal,
        messages: langchainMessages,
        chatId: dto.id,
      },
    });

    pipeUIMessageStreamToResponse({
      stream,
      response,
    });
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

  @Get('/chat/:id')
  @ApiOperation({
    summary: 'Get chat',
    description: 'Get the chat for a given chat ID',
  })
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
  @ExternalApiAccessible()
  async getChat(@UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData, @Param('id') id: string) {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_AI_WORKFLOW_GENERATION_ENABLED,
      defaultValue: false,
      organization: { _id: user.organizationId },
    });
    if (!isEnabled) {
      throw new NotFoundException('Feature not enabled');
    }

    const chat = await this.getChatUseCase.execute(
      GetChatCommand.create({
        id,
        user,
      })
    );

    return chat;
  }
}
