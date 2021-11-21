import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { IJwtPayload, IUpdateNotificationTemplate, MemberRoleEnum } from '@notifire/shared';
import { UserSession } from '../shared/framework/user.decorator';
import { Roles } from '../auth/framework/roles.decorator';
import { GetNotificationTemplates } from './usecases/get-notification-templates/get-notification-templates.usecase';
import { GetNotificationTemplatesCommand } from './usecases/get-notification-templates/get-notification-templates.command';
import { CreateNotificationTemplate, CreateNotificationTemplateCommand } from './usecases/create-notification-template';
import { CreateNotificationTemplateDto } from './dto/create-notification-template.dto';
import { GetNotificationTemplate } from './usecases/get-notification-template/get-notification-template.usecase';
import { GetNotificationTemplateCommand } from './usecases/get-notification-template/get-notification-template.command';
import { UpdateNotificationTemplate } from './usecases/update-notification-template/update-notification-template.usecase';
import { UpdateNotificationTemplateCommand } from './usecases/update-notification-template/update-notification-template.command';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';
import { ChangeTemplateActiveStatus } from './usecases/change-template-active-status/change-template-active-status.usecase';
import { ChangeTemplateActiveStatusCommand } from './usecases/change-template-active-status/change-template-active-status.command';
import { ChangeTemplateStatusDto } from './dto/change-template-status.dto';
import { JwtAuthGuard } from '../auth/framework/auth.guard';

@Controller('/notification-templates')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
export class NotificationTemplateController {
  constructor(
    private getNotificationTemplatesUsecase: GetNotificationTemplates,
    private createNotificationTemplateUsecase: CreateNotificationTemplate,
    private getNotificationTemplateUsecase: GetNotificationTemplate,
    private updateTemplateByIdUsecase: UpdateNotificationTemplate,
    private changeTemplateActiveStatusUsecase: ChangeTemplateActiveStatus
  ) {}

  @Get('')
  @Roles(MemberRoleEnum.ADMIN)
  getNotificationTemplates(@UserSession() user: IJwtPayload) {
    return this.getNotificationTemplatesUsecase.execute(
      GetNotificationTemplatesCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        applicationId: user.applicationId,
      })
    );
  }

  @Put('/:templateId')
  @Roles(MemberRoleEnum.ADMIN)
  updateTemplateById(
    @UserSession() user: IJwtPayload,
    @Param('templateId') templateId: string,
    @Body() body: UpdateNotificationTemplateDto
  ) {
    return this.updateTemplateByIdUsecase.execute(
      UpdateNotificationTemplateCommand.create({
        applicationId: user.applicationId,
        organizationId: user.organizationId,
        userId: user._id,
        templateId,
        name: body.name,
        tags: body.tags,
        description: body.description,
        messages: body.messages,
        notificationGroupId: body.notificationGroupId,
      })
    );
  }

  @Get('/:templateId')
  @Roles(MemberRoleEnum.ADMIN)
  getNotificationTemplateById(@UserSession() user: IJwtPayload, @Param('templateId') templateId: string) {
    return this.getNotificationTemplateUsecase.execute(
      GetNotificationTemplateCommand.create({
        applicationId: user.applicationId,
        organizationId: user.organizationId,
        userId: user._id,
        templateId,
      })
    );
  }

  @Post('')
  @Roles(MemberRoleEnum.ADMIN)
  createNotificationTemplates(@UserSession() user: IJwtPayload, @Body() body: CreateNotificationTemplateDto) {
    return this.createNotificationTemplateUsecase.execute(
      CreateNotificationTemplateCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        applicationId: user.applicationId,
        name: body.name,
        tags: body.tags,
        description: body.description,
        messages: body.messages,
        notificationGroupId: body.notificationGroupId,
      })
    );
  }

  @Put('/:templateId/status')
  @Roles(MemberRoleEnum.ADMIN)
  changeActiveStatus(
    @UserSession() user: IJwtPayload,
    @Body() body: ChangeTemplateStatusDto,
    @Param('templateId') templateId: string
  ) {
    return this.changeTemplateActiveStatusUsecase.execute(
      ChangeTemplateActiveStatusCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        applicationId: user.applicationId,
        active: body.active,
        templateId,
      })
    );
  }
}
