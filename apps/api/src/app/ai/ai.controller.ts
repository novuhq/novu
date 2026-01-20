import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  NotFoundException,
  Post,
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
import { ApiRateLimitCategoryEnum, FeatureFlagsKeysEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { AiConversationDto, GenerateWorkflowDto, WorkflowSuggestionDto } from './dtos';
import { GenerateWorkflowCommand, GenerateWorkflowUseCase } from './usecases/generate-workflow';
import { GetSuggestionsUseCase } from './usecases/get-suggestions';

@ApiExcludeController()
@Controller({ path: '/ai', version: '2' })
@UseInterceptors(ClassSerializerInterceptor)
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@RequireAuthentication()
@ApiTags('AI')
@ApiCommonResponses()
export class AiController {
  constructor(
    private readonly generateWorkflowUseCase: GenerateWorkflowUseCase,
    private readonly getSuggestionsUseCase: GetSuggestionsUseCase,
    private readonly featureFlagsService: FeatureFlagsService
  ) {}

  @Post('/generate-workflow')
  @ApiResponse(AiConversationDto, 201)
  @ApiOperation({
    summary: 'Generate workflow from description',
    description: 'Uses AI to generate a complete workflow based on a natural language description',
  })
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  @ExternalApiAccessible()
  async generateWorkflow(
    @UserSession(ParseSlugEnvironmentIdPipe) user: UserSessionData,
    @Body() dto: GenerateWorkflowDto
  ): Promise<AiConversationDto> {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_AI_WORKFLOW_GENERATION_ENABLED,
      defaultValue: false,
      organization: { _id: user.organizationId },
    });

    if (!isEnabled) {
      throw new NotFoundException('Feature not enabled');
    }

    return this.generateWorkflowUseCase.execute(
      GenerateWorkflowCommand.create({
        user,
        prompt: dto.prompt,
      })
    );
  }

  @Get('/suggestions')
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
}
