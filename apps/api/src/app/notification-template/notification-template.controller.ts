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
import { Roles } from '../auth/framework/roles.decorator';
import { GetNotificationTemplates } from './usecases/get-notification-templates/get-notification-templates.usecase';
import { GetNotificationTemplatesCommand } from './usecases/get-notification-templates/get-notification-templates.command';
import { CreateNotificationTemplate, CreateNotificationTemplateCommand } from './usecases/create-notification-template';
import {
  CreateNotificationTemplateRequestDto,
  UpdateNotificationTemplateRequestDto,
  ChangeTemplateStatusRequestDto,
} from './dto';
import { GetNotificationTemplate } from './usecases/get-notification-template/get-notification-template.usecase';
import { GetNotificationTemplateCommand } from './usecases/get-notification-template/get-notification-template.command';
import { UpdateNotificationTemplate } from './usecases/update-notification-template/update-notification-template.usecase';
import { DeleteNotificationTemplate } from './usecases/delete-notification-template/delete-notification-template.usecase';
import { UpdateNotificationTemplateCommand } from './usecases/update-notification-template/update-notification-template.command';
import { ChangeTemplateActiveStatus } from './usecases/change-template-active-status/change-template-active-status.usecase';
import { ChangeTemplateActiveStatusCommand } from './usecases/change-template-active-status/change-template-active-status.command';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { RootEnvironmentGuard } from '../auth/framework/root-environment-guard.service';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationTemplateResponse } from './dto/notification-template-response.dto';
import { NotificationTemplatesResponseDto } from './dto/notification-templates.response.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { NotificationTemplatesRequestDto } from './dto/notification-templates-request.dto';

@Controller('/notification-templates')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiTags('Notification templates')
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
  @ApiOkResponse({
    type: NotificationTemplateResponse,
  })
  @ApiOperation({
    summary: 'Get notification templates',
  })
  @ExternalApiAccessible()
  getNotificationTemplates(
    @UserSession() user: IJwtPayload,
    @Query() query: NotificationTemplatesRequestDto
  ): Promise<NotificationTemplatesResponseDto> {
    return this.getNotificationTemplatesUsecase.execute(
      GetNotificationTemplatesCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        page: query.page ? Number(query.page) : 0,
        limit: query.limit ? Number(query.limit) : 10,
      })
    );
  }

  @Put('/:templateId')
  @ApiOkResponse({
    type: NotificationTemplateResponse,
  })
  @ApiOperation({
    summary: 'Update notification template',
  })
  @ExternalApiAccessible()
  async updateTemplateById(
    @UserSession() user: IJwtPayload,
    @Param('templateId') templateId: string,
    @Body() body: UpdateNotificationTemplateRequestDto
  ): Promise<NotificationTemplateResponse> {
    return await this.updateTemplateByIdUsecase.execute(
      UpdateNotificationTemplateCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        templateId,
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

  @Delete('/:templateId')
  @UseGuards(RootEnvironmentGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @ApiOkResponse({
    type: Boolean,
  })
  @ApiOperation({
    summary: 'Delete notification template',
  })
  @ExternalApiAccessible()
  deleteTemplateById(@UserSession() user: IJwtPayload, @Param('templateId') templateId: string): Promise<boolean> {
    return this.deleteTemplateByIdUsecase.execute(
      GetNotificationTemplateCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        templateId,
      })
    );
  }

  @Get('/:templateId')
  @ApiOkResponse({
    type: NotificationTemplateResponse,
  })
  @ApiOperation({
    summary: 'Get notification template',
  })
  @ExternalApiAccessible()
  getNotificationTemplateById(
    @UserSession() user: IJwtPayload,
    @Param('templateId') templateId: string
  ): Promise<NotificationTemplateResponse> {
    return this.getNotificationTemplateUsecase.execute(
      GetNotificationTemplateCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        templateId,
      })
    );
  }

  @Post('')
  @UseGuards(RootEnvironmentGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @ApiCreatedResponse({
    type: NotificationTemplateResponse,
  })
  @ApiOperation({
    summary: 'Create notification template',
  })
  @ExternalApiAccessible()
  createNotificationTemplates(
    @UserSession() user: IJwtPayload,
    @Body() body: CreateNotificationTemplateRequestDto
  ): Promise<NotificationTemplateResponse> {
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
        active: body.active ?? false,
        draft: body.draft ?? true,
        critical: body.critical ?? false,
        preferenceSettings: body.preferenceSettings,
      })
    );
  }

  @Put('/:templateId/status')
  @UseGuards(RootEnvironmentGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @ApiOkResponse({
    type: NotificationTemplateResponse,
  })
  @ApiOperation({
    summary: 'Update notification template status',
  })
  @ExternalApiAccessible()
  changeActiveStatus(
    @UserSession() user: IJwtPayload,
    @Body() body: ChangeTemplateStatusRequestDto,
    @Param('templateId') templateId: string
  ): Promise<NotificationTemplateResponse> {
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
