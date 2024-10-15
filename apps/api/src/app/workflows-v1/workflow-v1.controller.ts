import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  CreateWorkflow,
  CreateWorkflowCommand,
  UpdateWorkflow,
  UpdateWorkflowCommand,
} from '@novu/application-generic';
import { UserSessionData, WorkflowOriginEnum, WorkflowTypeEnum } from '@novu/shared';

import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserSession } from '../shared/framework/user.decorator';
import { GetNotificationTemplates } from './usecases/get-notification-templates/get-notification-templates.usecase';
import { GetNotificationTemplatesCommand } from './usecases/get-notification-templates/get-notification-templates.command';
import {
  ChangeWorkflowStatusRequestDto,
  CreateWorkflowRequestDto,
  UpdateWorkflowRequestDto,
  VariablesResponseDto,
} from './dto';
import { GetNotificationTemplate } from './usecases/get-notification-template/get-notification-template.usecase';
import { GetNotificationTemplateCommand } from './usecases/get-notification-template/get-notification-template.command';
import { DeleteNotificationTemplate } from './usecases/delete-notification-template/delete-notification-template.usecase';
import { ChangeTemplateActiveStatus } from './usecases/change-template-active-status/change-template-active-status.usecase';
import { ChangeTemplateActiveStatusCommand } from './usecases/change-template-active-status/change-template-active-status.command';
import { RootEnvironmentGuard } from '../auth/framework/root-environment-guard.service';
import { WorkflowResponse } from './dto/workflow-response.dto';
import { WorkflowsResponseDto } from './dto/workflows.response.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { WorkflowsRequestDto } from './dto/workflows-request.dto';
import { ApiCommonResponses, ApiOkResponse, ApiResponse } from '../shared/framework/response.decorator';
import { DataBooleanDto } from '../shared/dtos/data-wrapper-dto';
import { CreateWorkflowQuery } from './queries';
import { DeleteNotificationTemplateCommand } from './usecases/delete-notification-template/delete-notification-template.command';
import { GetWorkflowVariables } from './usecases/get-workflow-variables/get-workflow-variables.usecase';
import { GetWorkflowVariablesCommand } from './usecases/get-workflow-variables/get-workflow-variables.command';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import { SdkGroupName } from '../shared/framework/swagger/sdk.decorators';

/**
 * @deprecated use controllers in /workflows directory
 */
@ApiCommonResponses()
@Controller('/workflows')
@UseInterceptors(ClassSerializerInterceptor)
@UserAuthentication()
@ApiTags('Workflows')
export class WorkflowControllerV1 {
  constructor(
    private createWorkflowUsecase: CreateWorkflow,
    private updateWorkflowByIdUsecase: UpdateWorkflow,
    private getWorkflowsUsecase: GetNotificationTemplates,
    private getWorkflowUsecase: GetNotificationTemplate,
    private getWorkflowVariablesUsecase: GetWorkflowVariables,
    private deleteWorkflowByIdUsecase: DeleteNotificationTemplate,
    private changeWorkflowActiveStatusUsecase: ChangeTemplateActiveStatus
  ) {}

  @Get('')
  @ApiResponse(WorkflowsResponseDto)
  @ApiOperation({
    summary: 'Get workflows',
    description: `Workflows were previously named notification templates`,
  })
  @ExternalApiAccessible()
  listWorkflows(
    @UserSession() user: UserSessionData,
    @Query() queryParams: WorkflowsRequestDto
  ): Promise<WorkflowsResponseDto> {
    return this.getWorkflowsUsecase.execute(
      GetNotificationTemplatesCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        page: queryParams.page,
        limit: queryParams.limit,
        query: queryParams.query,
      })
    );
  }

  @Put('/:workflowId')
  @ApiResponse(WorkflowResponse)
  @ApiOperation({
    summary: 'Update workflow',
    description: `Workflow was previously named notification template`,
  })
  @ExternalApiAccessible()
  async updateWorkflowById(
    @UserSession() user: UserSessionData,
    @Param('workflowId') workflowId: string,
    @Body() body: UpdateWorkflowRequestDto
  ): Promise<WorkflowResponse> {
    return await this.updateWorkflowByIdUsecase.execute(
      UpdateWorkflowCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        id: workflowId,
        name: body.name,
        tags: body.tags,
        description: body.description,
        workflowId: body.identifier,
        critical: body.critical,
        preferenceSettings: body.preferenceSettings,
        steps: body.steps,
        notificationGroupId: body.notificationGroupId,
        data: body.data,
        type: WorkflowTypeEnum.REGULAR,
      })
    );
  }

  @Delete('/:workflowId')
  @UseGuards(RootEnvironmentGuard)
  @ApiOkResponse({
    type: DataBooleanDto,
  })
  @ApiOperation({
    summary: 'Delete workflow',
    description: `Workflow was previously named notification template`,
  })
  @ExternalApiAccessible()
  deleteWorkflowById(@UserSession() user: UserSessionData, @Param('workflowId') workflowId: string): Promise<boolean> {
    return this.deleteWorkflowByIdUsecase.execute(
      DeleteNotificationTemplateCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        templateId: workflowId,
        type: WorkflowTypeEnum.REGULAR,
      })
    );
  }

  @Get('/variables')
  @ApiResponse(VariablesResponseDto)
  @ApiOperation({
    summary: 'Get available variables',
    description: 'Get the variables that can be used in the workflow',
  })
  @ExternalApiAccessible()
  @SdkGroupName('Workflows.Variables')
  getWorkflowVariables(@UserSession() user: UserSessionData): Promise<VariablesResponseDto> {
    return this.getWorkflowVariablesUsecase.execute(
      GetWorkflowVariablesCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @Get('/:workflowId')
  @ApiResponse(WorkflowResponse)
  @ApiOperation({
    summary: 'Get workflow',
    description: `Workflow was previously named notification template`,
  })
  @ExternalApiAccessible()
  getWorkflowById(
    @UserSession() user: UserSessionData,
    @Param('workflowId') workflowId: string
  ): Promise<WorkflowResponse> {
    return this.getWorkflowUsecase.execute(
      GetNotificationTemplateCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        workflowIdOrIdentifier: workflowId,
      })
    );
  }

  @Post('')
  @ExternalApiAccessible()
  @UseGuards(RootEnvironmentGuard)
  @ApiResponse(WorkflowResponse, 201)
  @ApiOperation({
    summary: 'Create workflow',
    description: `Workflow was previously named notification template`,
  })
  create(
    @UserSession() user: UserSessionData,
    @Query() query: CreateWorkflowQuery,
    @Body() body: CreateWorkflowRequestDto
  ): Promise<WorkflowResponse> {
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
        notificationGroup: body.notificationGroup,
        active: body.active ?? false,
        draft: !body.active,
        critical: body.critical ?? false,
        preferenceSettings: body.preferenceSettings,
        blueprintId: body.blueprintId,
        data: body.data,
        __source: query?.__source,
        type: WorkflowTypeEnum.REGULAR,
        origin: WorkflowOriginEnum.NOVU_CLOUD,
      })
    );
  }

  @Put('/:workflowId/status')
  @UseGuards(RootEnvironmentGuard)
  @ApiResponse(WorkflowResponse)
  @ApiOperation({
    summary: 'Update workflow status',
    description: `Workflow was previously named notification template`,
  })
  @ExternalApiAccessible()
  @SdkGroupName('Workflows.Status')
  updateActiveStatus(
    @UserSession() user: UserSessionData,
    @Body() body: ChangeWorkflowStatusRequestDto,
    @Param('workflowId') workflowId: string
  ): Promise<WorkflowResponse> {
    return this.changeWorkflowActiveStatusUsecase.execute(
      ChangeTemplateActiveStatusCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        active: body.active,
        templateId: workflowId,
      })
    );
  }
}
