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
import { GetNotificationTemplates } from './usecases/get-notification-templates/get-notification-templates.usecase';
import { GetNotificationTemplatesCommand } from './usecases/get-notification-templates/get-notification-templates.command';
import { CreateNotificationTemplate, CreateNotificationTemplateCommand } from './usecases/create-notification-template';
import { CreateWorkflowRequestDto, UpdateWorkflowRequestDto, ChangeWorkflowStatusRequestDto } from './dto';
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
import { ApiCommonResponses, ApiResponse, ApiOkResponse } from '../shared/framework/response.decorator';
import { DataBooleanDto } from '../shared/dtos/data-wrapper-dto';
import { CreateWorkflowQuery } from './queries';
import { DeleteNotificationTemplateCommand } from './usecases/delete-notification-template/delete-notification-template.command';

@ApiCommonResponses()
@Controller('/notification-templates')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(UserAuthGuard)
@ApiTags('Notification Templates')
export class NotificationTemplateController {
  constructor(
    private getNotificationTemplatesUsecase: GetNotificationTemplates,
    private createNotificationTemplateUsecase: CreateNotificationTemplate,
    private getNotificationTemplateUsecase: GetNotificationTemplate,
    private updateTemplateByIdUsecase: UpdateNotificationTemplate,
    private deleteTemplateByIdUsecase: DeleteNotificationTemplate,
    private changeTemplateActiveStatusUsecase: ChangeTemplateActiveStatus
  ) {}

  @Get('')
  @ApiResponse(WorkflowResponse)
  @ApiOperation({
    summary: 'Get Notification templates',
    description: `Notification templates have been renamed to Workflows, Please use the new workflows controller`,
    deprecated: true,
  })
  @ExternalApiAccessible()
  getNotificationTemplates(
    @UserSession() user: IJwtPayload,
    @Query() queryParams: WorkflowsRequestDto
  ): Promise<WorkflowsResponseDto> {
    return this.getNotificationTemplatesUsecase.execute(
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

  @Put('/:templateId')
  @ApiResponse(WorkflowResponse)
  @ApiOperation({
    summary: 'Update Notification template',
    description: `Notification templates have been renamed to Workflows, Please use the new workflows controller`,
    deprecated: true,
  })
  @ExternalApiAccessible()
  async updateTemplateById(
    @UserSession() user: IJwtPayload,
    @Param('templateId') templateId: string,
    @Body() body: UpdateWorkflowRequestDto
  ): Promise<WorkflowResponse> {
    return await this.updateTemplateByIdUsecase.execute(
      UpdateNotificationTemplateCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        id: templateId,
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

  @Delete('/:templateId')
  @UseGuards(RootEnvironmentGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @ApiOkResponse({
    type: DataBooleanDto,
  })
  @ApiOperation({
    summary: 'Delete Notification template',
    description: `Notification templates have been renamed to Workflows, Please use the new workflows controller`,
    deprecated: true,
  })
  @ExternalApiAccessible()
  deleteTemplateById(@UserSession() user: IJwtPayload, @Param('templateId') templateId: string): Promise<boolean> {
    return this.deleteTemplateByIdUsecase.execute(
      DeleteNotificationTemplateCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        templateId,
      })
    );
  }

  @Get('/:workflowIdOrIdentifier')
  @ApiResponse(WorkflowResponse)
  @ApiOperation({
    summary: 'Get Notification template',
    description: `Notification templates have been renamed to Workflows, Please use the new workflows controller`,
    deprecated: true,
  })
  @ExternalApiAccessible()
  getNotificationTemplateById(
    @UserSession() user: IJwtPayload,
    @Param('workflowIdOrIdentifier') workflowIdOrIdentifier: string
  ): Promise<WorkflowResponse> {
    return this.getNotificationTemplateUsecase.execute(
      GetNotificationTemplateCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        workflowIdOrIdentifier,
      })
    );
  }

  @Post('')
  @ExternalApiAccessible()
  @UseGuards(RootEnvironmentGuard)
  @ApiResponse(WorkflowResponse, 201)
  @ApiOperation({
    summary: 'Create Notification template',
    description: `Notification templates have been renamed to Workflows, Please use the new workflows controller`,
    deprecated: true,
  })
  @Roles(MemberRoleEnum.ADMIN)
  createNotificationTemplates(
    @UserSession() user: IJwtPayload,
    @Query() query: CreateWorkflowQuery,
    @Body() body: CreateWorkflowRequestDto
  ): Promise<WorkflowResponse> {
    return this.createNotificationTemplateUsecase.execute(
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

  @Put('/:templateId/status')
  @UseGuards(RootEnvironmentGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @ApiResponse(WorkflowResponse)
  @ApiOperation({
    summary: 'Update Notification template status',
    description: `Notification templates have been renamed to Workflows, Please use the new workflows controller`,
    deprecated: true,
  })
  @ExternalApiAccessible()
  changeActiveStatus(
    @UserSession() user: IJwtPayload,
    @Body() body: ChangeWorkflowStatusRequestDto,
    @Param('templateId') templateId: string
  ): Promise<WorkflowResponse> {
    return this.changeTemplateActiveStatusUsecase.execute(
      ChangeTemplateActiveStatusCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        active: body.active,
        templateId,
      })
    );
  }
}
