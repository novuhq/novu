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
import {
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ExternalSubscriberId, IJwtPayload, TopicKey } from '@novu/shared';

import {} from './dtos';
import {
  UseChatGptUseCase,
  UseChatGptCommand,
  GetNodeContentUseCase,
  GetNodeContentCommand,
  GetNotificationPromptSuggestionUseCase,
  GetNotificationPromptSuggestionCommand,
} from './use-cases';
import { UseChatGptWithLanguageDto } from './dtos';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { ApiResponse } from '../shared/framework/response.decorator';
import { GetModuleTestDto } from './dtos';
import { UseChatGptDto, UseChatGptResponseDto } from './dtos';
import { GetNodeContentDto, GetNodeContentResponseDto } from './dtos';
import { GetTranslationUseCase } from './use-cases/get-translation/get-internationalization-translation.use-case';

@Controller('/recommend')
@ApiTags('Recommendation')
@UseGuards(JwtAuthGuard)
export class RecommendationController {
  constructor(
    private useChatGptUseCase: UseChatGptUseCase,

    private getNodeContentUseCase: GetNodeContentUseCase,
    private getNotificationPromptSuggestionUseCase: GetNotificationPromptSuggestionUseCase,
    private getTranslationUseCase: GetTranslationUseCase
  ) {}

  @Post('/open-ai')
  @ExternalApiAccessible()
  @ApiResponse(GetModuleTestDto)
  @ApiOperation({ summary: 'Get an Open AI text', description: 'Get an Open AI text' })
  async createTopic(@UserSession() user: IJwtPayload, @Body() body: UseChatGptDto): Promise<UseChatGptResponseDto> {
    console.log('body.prompt', body.prompt);
    const answer = await this.useChatGptUseCase.execute(
      UseChatGptCommand.create({
        environmentId: user.environmentId,
        prompt: body.prompt,
        organizationId: user.organizationId,
      })
    );

    return {
      answer,
    };
  }

  @Post('/get-translation')
  @ExternalApiAccessible()
  @ApiResponse(GetModuleTestDto)
  @ApiOperation({ summary: 'Get an Open AI text', description: 'Get an Open AI text' })
  async getTranslation(
    @UserSession() user: IJwtPayload,
    @Body() body: UseChatGptWithLanguageDto
  ): Promise<UseChatGptResponseDto> {
    const answer = await this.useChatGptUseCase.execute(
      await this.getTranslationUseCase.create({
        environmentId: user.environmentId,
        language: body.language,
        prompt: body.prompt,
        organizationId: user.organizationId,
      })
    );

    return {
      answer,
    };
  }

  @Post('/get-node-contet')
  @ExternalApiAccessible()
  @ApiResponse(GetModuleTestDto)
  @ApiOperation({ summary: 'Get an Open AI text', description: 'Get an Open AI text' })
  async getNodeContent(
    @UserSession() user: IJwtPayload,
    @Body() body: GetNodeContentDto
  ): Promise<GetNodeContentResponseDto> {
    const answer = await this.getNodeContentUseCase.execute(
      GetNodeContentCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        ...body,
      })
    );

    return {
      answer,
    };
  }

  @Post('/notification-prompt-suggestion')
  @ExternalApiAccessible()
  @ApiResponse(GetModuleTestDto)
  @ApiOperation({ summary: 'Get an Open AI text', description: 'Get an Open AI text' })
  async notificationPromptSuggestion(
    @UserSession() user: IJwtPayload,
    @Body() body: UseChatGptDto
  ): Promise<GetNodeContentResponseDto> {
    const answer = await this.getNotificationPromptSuggestionUseCase.execute(
      GetNotificationPromptSuggestionCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        prompt: body.prompt,
        limit: 10,
      })
    );

    return {
      answer,
    };
  }
}
