import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Delete,
  Param,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { IJwtPayload, MemberRoleEnum } from '@novu/shared';
import { UserSession } from '../shared/framework/user.decorator';
import { GetWorkflows } from './usecases/get-workflows/get-workflows.usecase';
import { GetWorkflowsCommand } from './usecases/get-workflows/get-workflows.command';
import { CreateWorkflow, CreateWorkflowCommand } from './usecases/create-workflow';
import { CreateWorkflowRequestDto, UpdateWorkflowRequestDto, ChangeWorkflowStatusRequestDto } from './dto';
import { GetWorkflow } from './usecases/get-workflow/get-workflow.usecase';
import { GetWorkflowCommand } from './usecases/get-workflow/get-workflow.command';
import { UpdateWorkflow } from './usecases/update-workflow/update-workflow.usecase';
import { DeleteWorkflow } from './usecases/delete-workflow/delete-workflow.usecase';
import { UpdateWorkflowCommand } from './usecases/update-workflow/update-workflow.command';
import { ChangeWorkflowActiveStatus } from './usecases/change-workflow-active-status/change-workflow-active-status.usecase';
import { ChangeWorkflowActiveStatusCommand } from './usecases/change-workflow-active-status/change-workflow-active-status.command';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { RootEnvironmentGuard } from '../auth/framework/root-environment-guard.service';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkflowsResponse } from './dto/workflow-response.dto';
import { WorkflowsResponseDto } from './dto/workflows-response.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { WorkflowsRequestDto } from './dto/workflows-request.dto';
import { Roles } from '../auth/framework/roles.decorator';
import { ApiResponse } from '../shared/framework/response.decorator';
import { DataBooleanDto } from '../shared/dtos/data-wrapper-dto';
import { CreateWorkflowQuery } from './queries';

@Controller('/workflows')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiTags('Workflows')
export class WorkflowsController {
  constructor(
    private getWorkflowsUsecase: GetWorkflows,
    private createWorkflowUsecase: CreateWorkflow,
    private getWorkflowUsecase: GetWorkflow,
    private updateWorkflowByIdUsecase: UpdateWorkflow,
    private deleteWorkflowByIdUsecase: DeleteWorkflow,
    private changeWorkflowActiveStatusUsecase: ChangeWorkflowActiveStatus
  ) {}

  @Get('')
  @ApiResponse(WorkflowsResponse)
  @ApiOperation({
    summary: 'Get workflows',
    description: `Workflows were previously named notification templates`,
  })
  @ExternalApiAccessible()
  getWorkflows(@UserSession() user: IJwtPayload, @Query() query: WorkflowsRequestDto): Promise<WorkflowsResponseDto> {
    return this.getWorkflowsUsecase.execute(
      GetWorkflowsCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        page: query.page ? query.page : 0,
        limit: query.limit ? query.limit : 10,
      })
    );
  }

  @Put('/:workflowId')
  @ApiResponse(WorkflowsResponse)
  @ApiOperation({
    summary: 'Update workflow',
    description: `Workflow was previously named notification template`,
  })
  @ExternalApiAccessible()
  async updateWorkflowById(
    @UserSession() user: IJwtPayload,
    @Param('workflowId') workflowId: string,
    @Body() body: UpdateWorkflowRequestDto
  ): Promise<WorkflowsResponse> {
    return await this.updateWorkflowByIdUsecase.execute(
      UpdateWorkflowCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        id: workflowId,
        name: body.name,
        tags: body.tags,
        description: body.description,
        identifier: body.identifier,
        critical: body.critical,
        preferenceSettings: body.preferenceSettings,
        steps: body.steps,
        notificationGroupId: body.notificationGroupId,
      })
    );
  }

  @Delete('/:workflowId')
  @UseGuards(RootEnvironmentGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @ApiOkResponse({
    type: DataBooleanDto,
  })
  @ApiOperation({
    summary: 'Delete workflow',
    description: `Workflow was previously named notification template`,
  })
  @ExternalApiAccessible()
  deleteWorkflowById(@UserSession() user: IJwtPayload, @Param('workflowId') workflowId: string): Promise<boolean> {
    return this.deleteWorkflowByIdUsecase.execute(
      GetWorkflowCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        workflowId,
      })
    );
  }

  @Get('/:workflowId')
  @ApiResponse(WorkflowsResponse)
  @ApiOperation({
    summary: 'Get workflow',
    description: `Workflow was previously named notification template`,
  })
  @ExternalApiAccessible()
  getWorkflowById(
    @UserSession() user: IJwtPayload,
    @Param('workflowId') workflowId: string
  ): Promise<WorkflowsResponse> {
    return this.getWorkflowUsecase.execute(
      GetWorkflowCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        workflowId,
      })
    );
  }

  @Post('')
  @ExternalApiAccessible()
  @UseGuards(RootEnvironmentGuard)
  @ApiResponse(WorkflowsResponse, 201)
  @ApiOperation({
    summary: 'Create workflow',
    description: `Workflow was previously named notification template`,
  })
  @Roles(MemberRoleEnum.ADMIN)
  createWorkflows(
    @UserSession() user: IJwtPayload,
    @Query() query: CreateWorkflowQuery,
    @Body() body: CreateWorkflowRequestDto
  ): Promise<WorkflowsResponse> {
    return this.createWorkflowUsecase.execute(
      CreateWorkflowCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        name: body.name,
        tags: body.tags,
        description: body.description,
        steps: body.steps,
        notificationGroupId: body.notificationGroupId,
        active: body.active ?? false,
        draft: body.draft ?? true,
        critical: body.critical ?? false,
        preferenceSettings: body.preferenceSettings,
        blueprintId: body.blueprintId,
        __source: query?.__source,
      })
    );
  }

  @Put('/:workflowId/status')
  @UseGuards(RootEnvironmentGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @ApiResponse(WorkflowsResponse)
  @ApiOperation({
    summary: 'Update workflow status',
    description: `Workflow was previously named notification template`,
  })
  @ExternalApiAccessible()
  changeActiveStatus(
    @UserSession() user: IJwtPayload,
    @Body() body: ChangeWorkflowStatusRequestDto,
    @Param('workflowId') workflowId: string
  ): Promise<WorkflowsResponse> {
    return this.changeWorkflowActiveStatusUsecase.execute(
      ChangeWorkflowActiveStatusCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        active: body.active,
        workflowId,
      })
    );
  }
}
