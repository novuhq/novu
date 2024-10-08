import { ClassSerializerInterceptor, Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';

import { UserSessionData } from '@novu/shared';
import { ExternalApiAccessible, UserSession } from '@novu/application-generic';
import { StepType } from '@novu/framework';

import { ApiOperation, ApiParam } from '@nestjs/swagger';
import {
  GetStepTypeSchemaCommand,
  GetExistingStepSchemaCommand,
  GetStepSchemaCommand,
} from './usecases/get-step-schema/get-step-schema.command';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import { GetStepSchema } from './usecases/get-step-schema/get-step-schema.usecase';
import { StepSchemaDto } from './dtos/step-schema.dto';

@Controller('/step-schemas')
@UserAuthentication()
@UseInterceptors(ClassSerializerInterceptor)
export class StepSchemasController {
  constructor(private getStepDefaultSchemaUsecase: GetStepSchema) {}

  @Get('/:stepType')
  @ApiOperation({
    summary: 'Get step schema',
    description: 'Get the schema for a step type',
  })
  @ApiParam({
    name: 'stepType',
    type: String,
    description: 'The type of step to get the schema for.',
  })
  @ExternalApiAccessible()
  async getStepSchema(
    @UserSession() user: UserSessionData,
    @Param('stepType') stepType: StepType
  ): Promise<StepSchemaDto> {
    return await this.getStepDefaultSchemaUsecase.execute(
      GetStepTypeSchemaCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        userId: user._id,
        stepType,
      })
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get step schema for a specific workflow and step',
    description: 'Get the schema for a specific step in a workflow',
  })
  @ApiParam({
    name: 'workflowId',
    type: String,
    description: 'The ID of the workflow.',
  })
  @ApiParam({
    name: 'stepId',
    type: String,
    description: 'The ID of the step within the workflow.',
  })
  @ExternalApiAccessible()
  async getWorkflowStepSchema(
    @UserSession() user: UserSessionData,
    @Query('stepType') stepType: StepType,
    @Query('workflowId') workflowId: string,
    @Query('stepId') stepId: string
  ): Promise<StepSchemaDto> {
    return await this.getStepDefaultSchemaUsecase.execute(this.createCommand(user, stepType, workflowId, stepId));
  }

  private createCommand(user: UserSessionData, stepType: StepType, workflowId: string, stepId: string) {
    return stepType
      ? GetStepTypeSchemaCommand.create({
          organizationId: user.organizationId,
          environmentId: user.environmentId,
          userId: user._id,
          stepType,
        })
      : GetExistingStepSchemaCommand.create({
          organizationId: user.organizationId,
          environmentId: user.environmentId,
          userId: user._id,
          workflowId,
          stepId,
        });
  }
}
