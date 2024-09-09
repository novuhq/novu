import { Body, ClassSerializerInterceptor, Controller, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { MemberRoleEnum, UserSessionData, WorkflowOriginEnum } from '@novu/shared';
import { UserSession, ExternalApiAccessible } from '@novu/application-generic';

import { CreateWorkflowRequestDto, CreateWorkflowResponseDto } from './dto';
import { RootEnvironmentGuard } from '../auth/framework/root-environment-guard.service';
import { Roles } from '../auth/framework/roles.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import { CreateWorkflow } from './usecases/create-workflow.usecase';
import { CreateWorkflowCommand } from './usecases/create-workflow.command';

@ApiCommonResponses()
@Controller('/workflows-v2')
@UseInterceptors(ClassSerializerInterceptor)
@UserAuthentication()
@ApiTags('Workflows')
export class WorkflowController {
  constructor(private createWorkflowUsecase: CreateWorkflow) {}

  @Post('')
  @ExternalApiAccessible()
  @UseGuards(RootEnvironmentGuard)
  @ApiResponse(CreateWorkflowResponseDto, 201)
  @ApiOperation({
    summary: 'Create workflow',
    description: `Workflow was previously named notification template`,
  })
  @Roles(MemberRoleEnum.ADMIN)
  create(
    @UserSession() user: UserSessionData,
    @Body() body: CreateWorkflowRequestDto
  ): Promise<CreateWorkflowResponseDto> {
    return this.createWorkflowUsecase.execute(
      CreateWorkflowCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        name: body.name,
        tags: body.tags,
        description: body.description,
        steps: body.steps,
        options: body.options,
        active: body.active ?? false,
        origin: body.origin ?? WorkflowOriginEnum.NOVU,
        workflowId: body.workflowId,
        code: body.code,
        controlsSchema: body.controlsSchema,
        payloadSchema: body.payloadSchema,
      })
    );
  }
}
