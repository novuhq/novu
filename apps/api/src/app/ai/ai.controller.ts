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
import { generateId, pipeUIMessageStreamToResponse, UIMessage } from 'ai';
import type { Request, Response } from 'express';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses } from '../shared/framework/response.decorator';
import { CancelStreamDto, CreateChatDto, SnapshotActionDto, StreamGenerationDto, WorkflowSuggestionDto } from './dtos';
import { AiAgentFactory, CheckpointerService } from './services';
import { CancelStreamCommand, CancelStreamUseCase } from './usecases/cancel-stream';
import { GetChatCommand, GetChatUseCase } from './usecases/get-chat';
import { GetLatestChatCommand, GetLatestChatUseCase } from './usecases/get-latest-chat';
import { GetSuggestionsUseCase } from './usecases/get-suggestions';
import { KeepAiChangesCommand, KeepAiChangesUseCase } from './usecases/keep-ai-changes';
import { RevertMessageCommand, RevertMessageUseCase } from './usecases/revert-message';
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
    private readonly cancelStreamUseCase: CancelStreamUseCase,
    private readonly getSuggestionsUseCase: GetSuggestionsUseCase,
    private readonly getChatUseCase: GetChatUseCase,
    private readonly upsertChatUseCase: UpsertChatUseCase,
    private readonly getLatestChatUseCase: GetLatestChatUseCase,
    private readonly aiAgentFactory: AiAgentFactory,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly keepAiChangesUseCase: KeepAiChangesUseCase,
    private readonly revertMessageUseCase: RevertMessageUseCase,
    private readonly checkpointerService: CheckpointerService
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

    const agentUsecase = this.aiAgentFactory.getAgentUseCase(dto.agentType);

    const chat = await this.getChatUseCase.execute(
      GetChatCommand.create({
        id: dto.id,
        user,
      })
    );

    const isResuming = !dto.message;
    const allMessages = (chat.messages as UIMessage[]) ?? [];
    const existingUserMessage = allMessages.find((m) => m.id === dto.message?.id && m.role === 'user');
    const isNewMessage = !existingUserMessage && !!dto.message;
    if (isNewMessage) {
      allMessages.push(dto.message!);

      await this.keepAiChangesUseCase.execute(KeepAiChangesCommand.create({ chatId: dto.id, user }));
    } else if (existingUserMessage && dto.message) {
      const existingUserMessageIndex = allMessages.findIndex((m) => m.id === dto.message?.id && m.role === 'user');
      allMessages[existingUserMessageIndex] = dto.message;

      // get the current checkpoint and update it with the new message
      const snapshot = chat.snapshots?.find((s) => s.messageId === dto.message?.id);
      if (snapshot) {
        const message = dto.message?.parts.find((p) => p.type === 'text')?.text ?? '';
        await this.checkpointerService.updateUserMessage(dto.id, snapshot.checkpointId, message);
      }
    }

    const streamId = generateId();

    await this.upsertChatUseCase.execute(
      UpsertChatCommand.create({
        id: dto.id,
        messages: allMessages,
        activeStreamId: streamId,
        user,
      })
    );

    const abortController = new AbortController();

    const handleSocketClose = (): void => {
      if (request.destroyed) {
        abortController.abort();
      }
    };

    const cleanupSocketListener = (): void => {
      request.socket.off('close', handleSocketClose);
    };

    request.socket.on('close', handleSocketClose);
    response.on('finish', cleanupSocketListener);
    response.on('error', cleanupSocketListener);
    response.on('close', cleanupSocketListener);

    const langchainMessages = isResuming ? null : await toBaseMessages(allMessages);

    const stream = await agentUsecase.execute({
      command: {
        user,
        isNewMessage,
        signal: abortController.signal,
        messages: langchainMessages,
        chatId: dto.id,
      },
    });

    pipeUIMessageStreamToResponse({
      stream,
      response,
    });
  }

  @Post('/chat-stream/cancel')
  @ApiOperation({
    summary: 'Cancel active stream',
    description: 'Clears activeStreamId for the chat when user explicitly stops the stream',
  })
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  @ExternalApiAccessible()
  async cancelStream(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Body() dto: CancelStreamDto
  ): Promise<{ success: boolean }> {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_AI_WORKFLOW_GENERATION_ENABLED,
      defaultValue: false,
      organization: { _id: user.organizationId },
    });
    if (!isEnabled) {
      throw new NotFoundException('Feature not enabled');
    }

    await this.cancelStreamUseCase.execute(
      CancelStreamCommand.create({
        chatId: dto.chatId,
        user,
      })
    );

    return { success: true };
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

  @Post('/keep-changes')
  @ApiOperation({
    summary: 'Keep AI changes',
    description: 'Accept all pending snapshots for a given message',
  })
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  @ExternalApiAccessible()
  async keepChanges(@UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData, @Body() dto: SnapshotActionDto) {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_AI_WORKFLOW_GENERATION_ENABLED,
      defaultValue: false,
      organization: { _id: user.organizationId },
    });
    if (!isEnabled) {
      throw new NotFoundException('Feature not enabled');
    }

    await this.keepAiChangesUseCase.execute(
      KeepAiChangesCommand.create({
        chatId: dto.chatId,
        messageId: dto.messageId,
        user,
      })
    );

    return { success: true };
  }

  @Post('/revert-message')
  @ApiOperation({
    summary: 'Revert AI message',
    description: 'Restore from the earliest snapshot for a given message and remove all related snapshots',
  })
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  @ExternalApiAccessible()
  async revertMessage(@UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData, @Body() dto: SnapshotActionDto) {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_AI_WORKFLOW_GENERATION_ENABLED,
      defaultValue: false,
      organization: { _id: user.organizationId },
    });
    if (!isEnabled) {
      throw new NotFoundException('Feature not enabled');
    }

    return this.revertMessageUseCase.execute(
      RevertMessageCommand.create({
        chatId: dto.chatId,
        messageId: dto.messageId,
        user,
      })
    );
  }
}
