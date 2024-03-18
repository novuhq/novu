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
import { IJwtPayload, MemberRoleEnum } from '@novu/shared';
import { UserSession } from '../shared/framework/user.decorator';
import { GetNotificationTemplates } from './usecases/get-notification-templates/get-notification-templates.usecase';
import { GetNotificationTemplatesCommand } from './usecases/get-notification-templates/get-notification-templates.command';
import { CreateNotificationTemplate, CreateNotificationTemplateCommand } from './usecases/create-notification-template';
import {
  ChangeWorkflowStatusRequestDto,
  CreateWorkflowRequestDto,
  UpdateWorkflowRequestDto,
  VariablesResponseDto,
} from './dto';
import { GetNotificationTemplate } from './usecases/get-notification-template/get-notification-template.usecase';
import { GetNotificationTemplateCommand } from './usecases/get-notification-template/get-notification-template.command';
import { UpdateNotificationTemplate } from './usecases/update-notification-template/update-notification-template.usecase';
import { DeleteNotificationTemplate } from './usecases/delete-notification-template/delete-notification-template.usecase';
import { UpdateNotificationTemplateCommand } from './usecases/update-notification-template/update-notification-template.command';
import { ChangeTemplateActiveStatus } from './usecases/change-template-active-status/change-template-active-status.usecase';
import { ChangeTemplateActiveStatusCommand } from './usecases/change-template-active-status/change-template-active-status.command';
import { UserAuthGuard } from '../auth/framework/user.auth.guard';
import { RootEnvironmentGuard } from '../auth/framework/root-environment-guard.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkflowResponse } from './dto/workflow-response.dto';
import { WorkflowsResponseDto } from './dto/workflows.response.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { WorkflowsRequestDto } from './dto/workflows-request.dto';
import { Roles } from '../auth/framework/roles.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { DataBooleanDto } from '../shared/dtos/data-wrapper-dto';
import { CreateWorkflowQuery } from './queries';
import { ApiOkResponse } from '../shared/framework/response.decorator';
import { DeleteNotificationTemplateCommand } from './usecases/delete-notification-template/delete-notification-template.command';
import { GetWorkflowVariables } from './usecases/get-workflow-variables/get-workflow-variables.usecase';
import { GetWorkflowVariablesCommand } from './usecases/get-workflow-variables/get-workflow-variables.command';

@ApiCommonResponses()
@Controller('/workflows')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(UserAuthGuard)
@ApiTags('Workflows')
export class WorkflowController {
  constructor(
    private getWorkflowsUsecase: GetNotificationTemplates,
    private createWorkflowUsecase: CreateNotificationTemplate,
    private getWorkflowUsecase: GetNotificationTemplate,
    private getWorkflowVariablesUsecase: GetWorkflowVariables,
    private updateWorkflowByIdUsecase: UpdateNotificationTemplate,
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
  getWorkflows(
    @UserSession() user: IJwtPayload,
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
    @UserSession() user: IJwtPayload,
    @Param('workflowId') workflowId: string,
    @Body() body: UpdateWorkflowRequestDto
  ): Promise<WorkflowResponse> {
    return await this.updateWorkflowByIdUsecase.execute(
      UpdateNotificationTemplateCommand.create({
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
        data: body.data,
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
      DeleteNotificationTemplateCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        templateId: workflowId,
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
  getWorkflowVariables(@UserSession() user: IJwtPayload): Promise<VariablesResponseDto> {
    return this.getWorkflowVariablesUsecase.execute(
      GetWorkflowVariablesCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @Get('/:workflowIdOrIdentifier')
  @ApiResponse(WorkflowResponse)
  @ApiOperation({
    summary: 'Get workflow',
    description: `Workflow was previously named notification template`,
  })
  @ExternalApiAccessible()
  getWorkflowById(
    @UserSession() user: IJwtPayload,
    @Param('workflowIdOrIdentifier') workflowIdOrIdentifier: string
  ): Promise<WorkflowResponse> {
    return this.getWorkflowUsecase.execute(
      GetNotificationTemplateCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        workflowIdOrIdentifier: workflowIdOrIdentifier,
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
  @Roles(MemberRoleEnum.ADMIN)
  createWorkflows(
    @UserSession() user: IJwtPayload,
    @Query() query: CreateWorkflowQuery,
    @Body() body: CreateWorkflowRequestDto
  ): Promise<WorkflowResponse> {
    return this.createWorkflowUsecase.execute(
      CreateNotificationTemplateCommand.create({
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
      })
    );
  }

  @Put('/:workflowId/status')
  @UseGuards(RootEnvironmentGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @ApiResponse(WorkflowResponse)
  @ApiOperation({
    summary: 'Update workflow status',
    description: `Workflow was previously named notification template`,
  })
  @ExternalApiAccessible()
  changeActiveStatus(
    @UserSession() user: IJwtPayload,
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
