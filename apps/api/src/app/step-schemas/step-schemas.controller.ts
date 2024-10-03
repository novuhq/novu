import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { ExternalApiAccessible, UserAuthGuard, UserSession } from '@novu/application-generic';
import { StepType } from '@novu/framework';

import { ChannelTypeEnum, GeneratePreviewRequestDto, GeneratePreviewResponseDto, UserSessionData } from '@novu/shared';
import { createGetStepSchemaCommand } from './usecases/get-step-schema/get-step-schema.command';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import { GetStepSchemaUseCase } from './usecases/get-step-schema/get-step-schema.usecase';
import { StepSchemaDto } from './dtos/step-schema.dto';
import { GeneratePreviewUseCase } from './usecases/generate-preview/generate-preview-use-case';
import { GeneratePreviewCommand } from './usecases/generate-preview/generate-preview-command';

@Controller('/step-schemas')
@UserAuthentication()
@UseInterceptors(ClassSerializerInterceptor)
export class StepSchemasController {
  constructor(
    private getStepDefaultSchemaUsecase: GetStepSchemaUseCase,
    private generatePreviewUseCase: GeneratePreviewUseCase
  ) {}

  @Get()
  @ExternalApiAccessible()
  async getWorkflowStepSchema(
    @UserSession() user: UserSessionData,
    @Query('stepType') stepType: StepType,
    @Query('workflowId') workflowId: string,
    @Query('stepId') stepId: string
  ): Promise<StepSchemaDto> {
    return await this.getStepDefaultSchemaUsecase.execute(
      createGetStepSchemaCommand(user, stepType, workflowId, stepId)
    );
  }
  @Post('/:stepType/preview')
  @UseGuards(UserAuthGuard)
  async generatePreview(
    @UserSession() user: UserSessionData,
    @Param('stepType') stepType: ChannelTypeEnum,
    @Body() generatePreviewRequestDto: GeneratePreviewRequestDto
  ): Promise<GeneratePreviewResponseDto> {
    return await this.generatePreviewUseCase.execute(
      GeneratePreviewCommand.create({ user, stepType, generatePreviewRequestDto })
    );
  }
}
